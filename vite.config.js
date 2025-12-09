import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
  },
  build: {
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
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Bundle all node_modules into a single vendor chunk
          // This reduces HTTP requests for short-lived convention deployments
          // where dependencies won't change but app code might get bug fixes
          if (id.includes("node_modules")) {
            return "vendor";
          }
        },
      },
    },
    // We are intentionally bundling all the vendor code together. This is
    // because it is very unlikely we change dependencies once we've deployed
    // because of the short-lived nature of the conventions.
    // Hence, having a single vendor bundle reduces the number of HTTP requests
    // needed to load the app.
    // But this does mean we can end up with a large vendor.js file, so increase
    // the warning limit.
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        ".js": "jsx",
      },
    },
  },
  esbuild: {
    loader: "jsx",
    include: /src\/.*\.jsx?$/,
    exclude: [],
  },
});
