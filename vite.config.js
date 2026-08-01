import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { validateConfigPlugin } from "./vite-plugins/validateConfigPlugin.js";
import { injectDataPreloads } from "./vite-plugins/injectDataPreloads.js";
import { prerenderFooterPlugin } from "./vite-plugins/prerenderFooterPlugin.js";
import { configIconsPlugin } from "./vite-plugins/configIconsPlugin.js";

const configPath = path.resolve(__dirname, "src/config.json");

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    validateConfigPlugin(configPath),
    configIconsPlugin(configPath),
    injectDataPreloads(configPath),
    prerenderFooterPlugin(configPath),
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
