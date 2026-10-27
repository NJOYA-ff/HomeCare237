/// <reference types="vitest" />

import legacy from "@vitejs/plugin-legacy";
import react from "@vitejs/plugin-react";
import { defineConfig, Plugin } from "vite";
import { spawn, ChildProcess } from "child_process";
import path from "path";

/**
 * Vite plugin that starts the Twilio/API server alongside Vite dev server.
 * Works with `npm run dev`, `ionic serve`, or plain `vite`.
 * The server process is killed automatically when Vite exits.
 */
function apiServerPlugin(): Plugin {
  let apiProcess: ChildProcess | null = null;
  // Ionic CLI sets PORT for Vite (normally 8100). Do not pass that value to
  // the API child process, or it will try to bind Vite's port instead of the
  // API port and `/api` requests will fail with connection refused.
  const apiPort = process.env.API_PORT || "3400";

  return {
    name: "homecare237-api-server",
    apply: "serve", // only active during dev, not build
    configureServer() {
      const serverPath = path.resolve(__dirname, "server/twilio-function.cjs");

      console.log("[HomeCare237] Starting API server...");
      apiProcess = spawn("node", [serverPath], {
        stdio: "inherit",
        env: {
          ...process.env,
          PORT: apiPort,
        },
        shell: false,
      });

      apiProcess.on("error", (err) => {
        console.error("[HomeCare237] API server failed to start:", err.message);
      });

      apiProcess.on("exit", (code) => {
        if (code !== 0 && code !== null) {
          console.error(`[HomeCare237] API server exited with code ${code}`);
        }
        apiProcess = null;
      });

      // Ensure the server is killed when Vite shuts down
      const cleanup = () => {
        if (apiProcess) {
          console.log("[HomeCare237] Stopping API server...");
          apiProcess.kill();
          apiProcess = null;
        }
      };
      process.on("exit", cleanup);
      process.on("SIGINT", cleanup);
      process.on("SIGTERM", cleanup);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    apiServerPlugin(),
    react(),
    process.env.VITE_LEGACY_BUILD === "true" && legacy(),
  ].filter(Boolean),
  build: {
    chunkSizeWarningLimit: 1500, // Increased for better code splitting
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          // Merge Ionic, React, routing, and map/DOM helpers into vendor-core
          // to eliminate circular dependencies between react-router, @ionic/react-router,
          // history, leaflet, and common runtime helpers.
          if (
            id.includes("@ionic") ||
            id.includes("ionicons") ||
            id.includes("react") ||
            id.includes("scheduler") ||
            id.includes("history") ||
            id.includes("leaflet")
          ) {
            return "vendor-core";
          }
          if (id.includes("firebase")) return "vendor-firebase";
          if (id.includes("framer-motion")) return "vendor-motion";
          if (id.includes("twilio-video")) return "vendor-video";
          if (id.includes("@react-pdf") || id.includes("pdfkit")) return "vendor-pdf";
        },
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
      },
    },
    // Optimize assets
    assetsInlineLimit: 4096, // Inline assets smaller than 4KB
  },
  server: {
    port: 8100,
    // Proxy frontend `/api` calls to the local API server during development
    proxy: {
      "/api": {
        target: `http://localhost:${process.env.API_PORT || "3400"}`,
        changeOrigin: true,
        secure: false,
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/setupTests.ts",
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "@ionic/react",
      "@tanstack/react-query",
    ],
  },
});

