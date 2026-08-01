import { readConfig } from "./readConfig.js";

export function injectDataPreloads(configPath) {
  return {
    name: "inject-data-preloads",
    transformIndexHtml(html) {
      const config = readConfig(configPath);

      const preloads = [config.PROGRAM_DATA_URL, config.PEOPLE_DATA_URL]
        .filter(Boolean)
        .map((url) => ({
          tag: "link",
          attrs: {
            rel: "preload",
            href: url,
            as: "fetch",
            crossorigin: "anonymous",
          },
        }));

      return preloads;
    },
  };
}
