import { readConfig } from "./readConfig.js";
import { rebuildOrReport } from "./reportBuildError.js";

/**
 * Split an ICON_NAME of the form "pack/ExportName" (e.g. "fa/FaMapSigns")
 * into its parts. Returns null if it isn't in that form - the caller turns
 * that into a config error. Whether `pkg` actually names a react-icons
 * pack is checked later, by trying to load it.
 */
function parseIconName(name) {
  const slash = name.indexOf("/");
  if (slash === -1) {
    return null;
  }
  const pkg = name.slice(0, slash);
  const exportName = name.slice(slash + 1);
  if (pkg.length === 0 || exportName.length === 0) {
    return null;
  }
  return { pkg, exportName };
}

// pack folder -> loaded module (or null if `pkg` isn't a real react-icons
// pack), reused across builds/hot updates in a dev session so re-editing
// config.json doesn't reload every pack it uses.
const loadedPackages = new Map();

async function loadPackage(pkg) {
  if (!loadedPackages.has(pkg)) {
    try {
      loadedPackages.set(pkg, await import(`react-icons/${pkg}`));
    } catch {
      loadedPackages.set(pkg, null);
    }
  }
  return loadedPackages.get(pkg);
}

/**
 * Recursively collect every `ICON_NAME` value in config.json, with a
 * dotted/bracketed path to each reference (for error messages).
 *
 * @param {*} node Current subtree of the parsed config.
 * @param {string} path Path to `node` from the config root.
 * @param {{name: string, path: string}[]} out Accumulator.
 */
function collectIconNames(node, path, out) {
  if (Array.isArray(node)) {
    node.forEach((item, i) => collectIconNames(item, `${path}[${i}]`, out));
  } else if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      const nextPath = path ? `${path}.${key}` : key;
      if (key === "ICON_NAME" && typeof value === "string" && value.length > 0) {
        out.push({ name: value, path: nextPath });
      } else {
        collectIconNames(value, nextPath, out);
      }
    }
  }
}

/**
 * Generates `virtual:config-icons`, a name -> component map covering every
 * icon config.json actually references (NAVIGATION.EXTRA, LINKS, LOCATIONS,
 * TAGS.ICONS, and anywhere else ICON_NAME shows up). ICON_NAME is
 * "pack/ExportName" (e.g. "fa/FaMapSigns", "md/MdHome") - pack is any
 * react-icons pack (https://react-icons.github.io/react-icons/), ExportName
 * its exact export. Each is imported by name from its specific pack so
 * Rollup tree-shakes out the rest.
 *
 * An unresolvable name fails the build rather than silently rendering
 * nothing, since a decorative-icon typo is otherwise easy to ship
 * unnoticed.
 */
export function configIconsPlugin(configPath) {
  const virtualId = "virtual:config-icons";
  const resolvedId = "\0" + virtualId;

  async function buildIconModule() {
    const config = readConfig(configPath);
    const references = [];
    collectIconNames(config, "", references);

    const pathsFor = (name) =>
      references.filter((ref) => ref.name === name).map((ref) => ref.path);

    const uniqueNames = [...new Set(references.map((ref) => ref.name))];
    const errors = [];
    const parsedByName = new Map();

    for (const name of uniqueNames) {
      const parsed = parseIconName(name);
      if (!parsed) {
        errors.push(
          `Invalid ICON_NAME "${name}" (at ${pathsFor(name).join(", ")}): expected ` +
            `"<pack>/<ExportName>", e.g. "fa/FaHome".`
        );
        continue;
      }
      parsedByName.set(name, parsed);
    }

    const neededPackages = [...new Set([...parsedByName.values()].map((p) => p.pkg))];
    const modulesByPackage = new Map(
      await Promise.all(
        neededPackages.map(async (pkg) => [pkg, await loadPackage(pkg)])
      )
    );

    const namesByPackage = new Map();
    for (const [name, { pkg, exportName }] of parsedByName) {
      const mod = modulesByPackage.get(pkg);
      if (!mod) {
        errors.push(`Unknown react-icons pack "${pkg}" (at ${pathsFor(name).join(", ")}).`);
        continue;
      }
      if (!(exportName in mod)) {
        errors.push(
          `Unknown icon "${exportName}" in pack "${pkg}" (at ${pathsFor(name).join(", ")}).`
        );
        continue;
      }
      if (!namesByPackage.has(pkg)) {
        namesByPackage.set(pkg, []);
      }
      namesByPackage.get(pkg).push(exportName);
    }

    if (errors.length > 0) {
      throw new Error("Invalid config.json:\n - " + errors.join("\n - "));
    }

    const importLines = [...namesByPackage.entries()]
      .map(([pkg, names]) => `import { ${names.join(", ")} } from "react-icons/${pkg}";`)
      .join("\n");
    const exportBody = [...parsedByName.entries()]
      .map(([name, { exportName }]) => `  ${JSON.stringify(name)}: ${exportName},`)
      .join("\n");

    return `${importLines}\nexport default {\n${exportBody}\n};\n`;
  }

  return {
    name: "config-icons",
    async buildStart() {
      // Fail the build (or surface in the dev overlay on startup) on an
      // unknown ICON_NAME, same as validateConfigPlugin.
      await buildIconModule();
    },
    resolveId(id) {
      if (id === virtualId) {
        return resolvedId;
      }
    },
    async load(id) {
      if (id !== resolvedId) {
        return;
      }
      this.addWatchFile(configPath);
      return buildIconModule();
    },
    async handleHotUpdate({ file, modules, server }) {
      if (file !== configPath) {
        return;
      }
      const iconModule = server.moduleGraph.getModuleById(resolvedId);
      if (!iconModule) {
        return;
      }
      const ok = await rebuildOrReport(server, "config-icons", configPath, buildIconModule);
      if (!ok) {
        return [];
      }
      // No importer accepts this module (it's a plain data import), so
      // including it here escalates to a full page reload, same as any
      // other unaccepted change - which is what a changed icon set needs.
      return [...modules, iconModule];
    },
  };
}
