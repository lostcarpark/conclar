import { readConfig } from "./readConfig.js";
import { validateConfig } from "../src/validateConfig.js";
import { rebuildOrReport } from "./reportBuildError.js";

function readAndValidateConfig(configPath) {
  const config = readConfig(configPath);
  validateConfig(config);
  return config;
}

export function validateConfigPlugin(configPath) {
  return {
    name: "validate-config",
    buildStart() {
      // Throws on an invalid config.json, failing the build (or surfacing
      // in the dev server's error overlay on startup).
      readAndValidateConfig(configPath);
    },
    async handleHotUpdate({ file, server }) {
      if (file === configPath) {
        await rebuildOrReport(server, "validate-config", configPath, () =>
          readAndValidateConfig(configPath)
        );
      }
    },
  };
}
