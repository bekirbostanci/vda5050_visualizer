import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import inject from "@rollup/plugin-inject";
import commonjs from "@rollup/plugin-commonjs";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isDevelopment = mode === 'development';

  return {
    plugins: [
      vue(),
      isDevelopment && commonjs(),
      isDevelopment && inject({ Buffer: ["buffer", "Buffer"], process: "process" }),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
        "balm-ui-plus": "balm-ui/dist/balm-ui-plus.esm.js",
        "balm-ui-css": "balm-ui/dist/balm-ui.css",
        process: "process/browser",
      },
    },
    optimizeDeps: {
      esbuildOptions: {
        define: {
          global: "globalThis",
        },
      },
    },
    build: {
      rollupOptions: {
        plugins: [
          // Conditionally include inject plugin during build if needed
          inject({ Buffer: ["buffer", "Buffer"], process: "process" })
        ],
      },
    },
  };
});
