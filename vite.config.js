import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";
import { validateConfig } from "./src/validateConfig.js";

const configPath = path.resolve(__dirname, "src/config.json");

function readAndValidateConfig() {
  const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  validateConfig(config);
  return config;
}

function validateConfigPlugin() {
  return {
    name: "validate-config",
    buildStart() {
      // Throws on an invalid config.json, failing the build (or surfacing
      // in the dev server's error overlay on startup).
      readAndValidateConfig();
    },
    handleHotUpdate({ file, server }) {
      if (file === configPath) {
        try {
          readAndValidateConfig();
        } catch (err) {
          server.ws.send({
            type: "error",
            err: {
              message: err.message,
              stack: err.stack ?? "",
              plugin: "validate-config",
              id: configPath,
            },
          });
        }
      }
    },
  };
}

function injectDataPreloads() {
  return {
    name: "inject-data-preloads",
    transformIndexHtml(html) {
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

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

/**
 * The footer's markdown comes from config.json, so it's known at build
 * time. Rendering it to HTML here (micromark is already in node_modules
 * as react-markdown's core) keeps the markdown-rendering packages out of
 * the eager bundle entirely - at runtime they're only in the lazy chunk
 * for the info page. micromark escapes raw HTML by default, so the
 * output is safe for dangerouslySetInnerHTML.
 */
function prerenderFooterPlugin() {
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
      const footer = JSON.parse(fs.readFileSync(configPath, "utf-8")).FOOTER;
      const html = {
        site: micromark(footer.SITE_NOTE_MARKDOWN),
        copyright: micromark(footer.COPYRIGHT_MARKDOWN),
        conclar: micromark(footer.CONCLAR_NOTE_MARKDOWN),
      };
      return `export default ${JSON.stringify(html)};`;
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    validateConfigPlugin(),
    injectDataPreloads(),
    prerenderFooterPlugin(),
  ],
  server: {
    port: 3000,
    open: true,
  },
  build: {
    target: "es2015",
    outDir: "build",
    minify: "terser",
    terserOptions: {
      compress: {
        drop_debugger: true,
      },
      format: {
        comments: false,
      },
    },
    cssCodeSplit: false,
    chunkSizeWarningLimit: 1000,
  },
});
