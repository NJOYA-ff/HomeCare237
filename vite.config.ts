/// <reference types="vitest" />

import legacy from "@vitejs/plugin-legacy";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
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
        target: "http://localhost:3400",
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

