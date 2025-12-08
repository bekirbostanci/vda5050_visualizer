import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import inject from "@rollup/plugin-inject";
import commonjs from "@rollup/plugin-commonjs";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isDevelopment = mode === "development";

  return {
    base: "./",
    plugins: [
      vue(),
      isDevelopment && commonjs(),
      isDevelopment &&
        inject({ Buffer: ["buffer", "Buffer"], process: "process" }),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
        "balm-ui-plus": "balm-ui/dist/balm-ui-plus.esm.js",
        "balm-ui-css": "balm-ui/dist/balm-ui.css",
        process: "process/browser",
        mqtt: "mqtt/dist/mqtt.min.js", // Explicitly resolve the MQTT library
      },
    },
    optimizeDeps: {
      exclude: ["vda-5050-lib"],
      esbuildOptions: {
        define: {
          global: "globalThis",
        },
      },
    },
    build: {
      outDir: "dist",
      emptyOutDir: true,
      assetsDir: "assets",
      rollupOptions: {
        plugins: [inject({ Buffer: ["buffer", "Buffer"], process: "process" })],
        output: {
          manualChunks: undefined,
        },
      },
      commonjsOptions: {
        exclude: ["vda-5050-lib"],
      },
    },
    define: {
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: true,
    },
  };
});
