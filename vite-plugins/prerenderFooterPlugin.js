import { readConfig } from "./readConfig.js";

/**
 * The footer's markdown comes from config.json, so it's known at build
 * time. Rendering it to HTML here keeps the markdown-rendering packages
 * out of the eager bundle entirely - at runtime they're only in the lazy
 * chunk for the info page. micromark escapes raw HTML by default, so the
 * output is safe for dangerouslySetInnerHTML.
 */
export function prerenderFooterPlugin(configPath) {
  const virtualId = "virtual:footer-html";
  const resolvedId = "\0" + virtualId;
  return {
    name: "prerender-footer-markdown",
    resolveId(id) {
      if (id === virtualId) {
        return resolvedId;
      }
    },
    async load(id) {
      if (id !== resolvedId) {
        return;
      }
      // Dynamic import: micromark is ESM-only and this config is CJS.
      const { micromark } = await import("micromark");
      const footer = readConfig(configPath).FOOTER;
      const html = {
        site: micromark(footer.SITE_NOTE_MARKDOWN),
        copyright: micromark(footer.COPYRIGHT_MARKDOWN),
        conclar: micromark(footer.CONCLAR_NOTE_MARKDOWN),
      };
      return `export default ${JSON.stringify(html)};`;
    },
  };
}
