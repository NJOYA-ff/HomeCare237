// vite.config.ts
import legacy from "file:///home/njoya/Desktop/HomeCare237/node_modules/@vitejs/plugin-legacy/dist/index.mjs";
import react from "file:///home/njoya/Desktop/HomeCare237/node_modules/@vitejs/plugin-react/dist/index.js";
import { defineConfig } from "file:///home/njoya/Desktop/HomeCare237/node_modules/vite/dist/node/index.js";
import { spawn } from "child_process";
import path from "path";
var __vite_injected_original_dirname = "/home/njoya/Desktop/HomeCare237";
function apiServerPlugin() {
  let apiProcess = null;
  const apiPort = process.env.API_PORT || "3400";
  return {
    name: "homecare237-api-server",
    apply: "serve",
    // only active during dev, not build
    configureServer() {
      const serverPath = path.resolve(__vite_injected_original_dirname, "server/twilio-function.cjs");
      console.log("[HomeCare237] Starting API server...");
      apiProcess = spawn("node", [serverPath], {
        stdio: "inherit",
        env: {
          ...process.env,
          PORT: apiPort
        },
        shell: false
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
    }
  };
}
var vite_config_default = defineConfig({
  plugins: [
    apiServerPlugin(),
    react(),
    process.env.VITE_LEGACY_BUILD === "true" && legacy()
  ].filter(Boolean),
  build: {
    chunkSizeWarningLimit: 1500,
    // Increased for better code splitting
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules"))
            return;
          if (id.includes("@ionic") || id.includes("ionicons") || id.includes("react") || id.includes("scheduler") || id.includes("history") || id.includes("leaflet")) {
            return "vendor-core";
          }
          if (id.includes("firebase"))
            return "vendor-firebase";
          if (id.includes("framer-motion"))
            return "vendor-motion";
          if (id.includes("twilio-video"))
            return "vendor-video";
          if (id.includes("@react-pdf") || id.includes("pdfkit"))
            return "vendor-pdf";
        },
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]"
      }
    },
    // Optimize assets
    assetsInlineLimit: 4096
    // Inline assets smaller than 4KB
  },
  server: {
    port: 8100,
    // Proxy frontend `/api` calls to the local API server during development
    proxy: {
      "/api": {
        target: `http://localhost:${process.env.API_PORT || "3400"}`,
        changeOrigin: true,
        secure: false
      }
    }
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/setupTests.ts"
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "@ionic/react",
      "@tanstack/react-query"
    ]
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9uam95YS9EZXNrdG9wL0hvbWVDYXJlMjM3XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9uam95YS9EZXNrdG9wL0hvbWVDYXJlMjM3L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL25qb3lhL0Rlc2t0b3AvSG9tZUNhcmUyMzcvdml0ZS5jb25maWcudHNcIjsvLy8gPHJlZmVyZW5jZSB0eXBlcz1cInZpdGVzdFwiIC8+XG5cbmltcG9ydCBsZWdhY3kgZnJvbSBcIkB2aXRlanMvcGx1Z2luLWxlZ2FjeVwiO1xuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdFwiO1xuaW1wb3J0IHsgZGVmaW5lQ29uZmlnLCBQbHVnaW4gfSBmcm9tIFwidml0ZVwiO1xuaW1wb3J0IHsgc3Bhd24sIENoaWxkUHJvY2VzcyB9IGZyb20gXCJjaGlsZF9wcm9jZXNzXCI7XG5pbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiO1xuXG4vKipcbiAqIFZpdGUgcGx1Z2luIHRoYXQgc3RhcnRzIHRoZSBUd2lsaW8vQVBJIHNlcnZlciBhbG9uZ3NpZGUgVml0ZSBkZXYgc2VydmVyLlxuICogV29ya3Mgd2l0aCBgbnBtIHJ1biBkZXZgLCBgaW9uaWMgc2VydmVgLCBvciBwbGFpbiBgdml0ZWAuXG4gKiBUaGUgc2VydmVyIHByb2Nlc3MgaXMga2lsbGVkIGF1dG9tYXRpY2FsbHkgd2hlbiBWaXRlIGV4aXRzLlxuICovXG5mdW5jdGlvbiBhcGlTZXJ2ZXJQbHVnaW4oKTogUGx1Z2luIHtcbiAgbGV0IGFwaVByb2Nlc3M6IENoaWxkUHJvY2VzcyB8IG51bGwgPSBudWxsO1xuICAvLyBJb25pYyBDTEkgc2V0cyBQT1JUIGZvciBWaXRlIChub3JtYWxseSA4MTAwKS4gRG8gbm90IHBhc3MgdGhhdCB2YWx1ZSB0b1xuICAvLyB0aGUgQVBJIGNoaWxkIHByb2Nlc3MsIG9yIGl0IHdpbGwgdHJ5IHRvIGJpbmQgVml0ZSdzIHBvcnQgaW5zdGVhZCBvZiB0aGVcbiAgLy8gQVBJIHBvcnQgYW5kIGAvYXBpYCByZXF1ZXN0cyB3aWxsIGZhaWwgd2l0aCBjb25uZWN0aW9uIHJlZnVzZWQuXG4gIGNvbnN0IGFwaVBvcnQgPSBwcm9jZXNzLmVudi5BUElfUE9SVCB8fCBcIjM0MDBcIjtcblxuICByZXR1cm4ge1xuICAgIG5hbWU6IFwiaG9tZWNhcmUyMzctYXBpLXNlcnZlclwiLFxuICAgIGFwcGx5OiBcInNlcnZlXCIsIC8vIG9ubHkgYWN0aXZlIGR1cmluZyBkZXYsIG5vdCBidWlsZFxuICAgIGNvbmZpZ3VyZVNlcnZlcigpIHtcbiAgICAgIGNvbnN0IHNlcnZlclBhdGggPSBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcInNlcnZlci90d2lsaW8tZnVuY3Rpb24uY2pzXCIpO1xuXG4gICAgICBjb25zb2xlLmxvZyhcIltIb21lQ2FyZTIzN10gU3RhcnRpbmcgQVBJIHNlcnZlci4uLlwiKTtcbiAgICAgIGFwaVByb2Nlc3MgPSBzcGF3bihcIm5vZGVcIiwgW3NlcnZlclBhdGhdLCB7XG4gICAgICAgIHN0ZGlvOiBcImluaGVyaXRcIixcbiAgICAgICAgZW52OiB7XG4gICAgICAgICAgLi4ucHJvY2Vzcy5lbnYsXG4gICAgICAgICAgUE9SVDogYXBpUG9ydCxcbiAgICAgICAgfSxcbiAgICAgICAgc2hlbGw6IGZhbHNlLFxuICAgICAgfSk7XG5cbiAgICAgIGFwaVByb2Nlc3Mub24oXCJlcnJvclwiLCAoZXJyKSA9PiB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXCJbSG9tZUNhcmUyMzddIEFQSSBzZXJ2ZXIgZmFpbGVkIHRvIHN0YXJ0OlwiLCBlcnIubWVzc2FnZSk7XG4gICAgICB9KTtcblxuICAgICAgYXBpUHJvY2Vzcy5vbihcImV4aXRcIiwgKGNvZGUpID0+IHtcbiAgICAgICAgaWYgKGNvZGUgIT09IDAgJiYgY29kZSAhPT0gbnVsbCkge1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYFtIb21lQ2FyZTIzN10gQVBJIHNlcnZlciBleGl0ZWQgd2l0aCBjb2RlICR7Y29kZX1gKTtcbiAgICAgICAgfVxuICAgICAgICBhcGlQcm9jZXNzID0gbnVsbDtcbiAgICAgIH0pO1xuXG4gICAgICAvLyBFbnN1cmUgdGhlIHNlcnZlciBpcyBraWxsZWQgd2hlbiBWaXRlIHNodXRzIGRvd25cbiAgICAgIGNvbnN0IGNsZWFudXAgPSAoKSA9PiB7XG4gICAgICAgIGlmIChhcGlQcm9jZXNzKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coXCJbSG9tZUNhcmUyMzddIFN0b3BwaW5nIEFQSSBzZXJ2ZXIuLi5cIik7XG4gICAgICAgICAgYXBpUHJvY2Vzcy5raWxsKCk7XG4gICAgICAgICAgYXBpUHJvY2VzcyA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgICBwcm9jZXNzLm9uKFwiZXhpdFwiLCBjbGVhbnVwKTtcbiAgICAgIHByb2Nlc3Mub24oXCJTSUdJTlRcIiwgY2xlYW51cCk7XG4gICAgICBwcm9jZXNzLm9uKFwiU0lHVEVSTVwiLCBjbGVhbnVwKTtcbiAgICB9LFxuICB9O1xufVxuXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW1xuICAgIGFwaVNlcnZlclBsdWdpbigpLFxuICAgIHJlYWN0KCksXG4gICAgcHJvY2Vzcy5lbnYuVklURV9MRUdBQ1lfQlVJTEQgPT09IFwidHJ1ZVwiICYmIGxlZ2FjeSgpLFxuICBdLmZpbHRlcihCb29sZWFuKSxcbiAgYnVpbGQ6IHtcbiAgICBjaHVua1NpemVXYXJuaW5nTGltaXQ6IDE1MDAsIC8vIEluY3JlYXNlZCBmb3IgYmV0dGVyIGNvZGUgc3BsaXR0aW5nXG4gICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgb3V0cHV0OiB7XG4gICAgICAgIG1hbnVhbENodW5rcyhpZCkge1xuICAgICAgICAgIGlmICghaWQuaW5jbHVkZXMoXCJub2RlX21vZHVsZXNcIikpIHJldHVybjtcblxuICAgICAgICAgIC8vIE1lcmdlIElvbmljLCBSZWFjdCwgcm91dGluZywgYW5kIG1hcC9ET00gaGVscGVycyBpbnRvIHZlbmRvci1jb3JlXG4gICAgICAgICAgLy8gdG8gZWxpbWluYXRlIGNpcmN1bGFyIGRlcGVuZGVuY2llcyBiZXR3ZWVuIHJlYWN0LXJvdXRlciwgQGlvbmljL3JlYWN0LXJvdXRlcixcbiAgICAgICAgICAvLyBoaXN0b3J5LCBsZWFmbGV0LCBhbmQgY29tbW9uIHJ1bnRpbWUgaGVscGVycy5cbiAgICAgICAgICBpZiAoXG4gICAgICAgICAgICBpZC5pbmNsdWRlcyhcIkBpb25pY1wiKSB8fFxuICAgICAgICAgICAgaWQuaW5jbHVkZXMoXCJpb25pY29uc1wiKSB8fFxuICAgICAgICAgICAgaWQuaW5jbHVkZXMoXCJyZWFjdFwiKSB8fFxuICAgICAgICAgICAgaWQuaW5jbHVkZXMoXCJzY2hlZHVsZXJcIikgfHxcbiAgICAgICAgICAgIGlkLmluY2x1ZGVzKFwiaGlzdG9yeVwiKSB8fFxuICAgICAgICAgICAgaWQuaW5jbHVkZXMoXCJsZWFmbGV0XCIpXG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJ2ZW5kb3ItY29yZVwiO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoXCJmaXJlYmFzZVwiKSkgcmV0dXJuIFwidmVuZG9yLWZpcmViYXNlXCI7XG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKFwiZnJhbWVyLW1vdGlvblwiKSkgcmV0dXJuIFwidmVuZG9yLW1vdGlvblwiO1xuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcyhcInR3aWxpby12aWRlb1wiKSkgcmV0dXJuIFwidmVuZG9yLXZpZGVvXCI7XG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKFwiQHJlYWN0LXBkZlwiKSB8fCBpZC5pbmNsdWRlcyhcInBkZmtpdFwiKSkgcmV0dXJuIFwidmVuZG9yLXBkZlwiO1xuICAgICAgICB9LFxuICAgICAgICBjaHVua0ZpbGVOYW1lczogXCJhc3NldHMvW25hbWVdLVtoYXNoXS5qc1wiLFxuICAgICAgICBlbnRyeUZpbGVOYW1lczogXCJhc3NldHMvW25hbWVdLVtoYXNoXS5qc1wiLFxuICAgICAgICBhc3NldEZpbGVOYW1lczogXCJhc3NldHMvW25hbWVdLVtoYXNoXS5bZXh0XVwiLFxuICAgICAgfSxcbiAgICB9LFxuICAgIC8vIE9wdGltaXplIGFzc2V0c1xuICAgIGFzc2V0c0lubGluZUxpbWl0OiA0MDk2LCAvLyBJbmxpbmUgYXNzZXRzIHNtYWxsZXIgdGhhbiA0S0JcbiAgfSxcbiAgc2VydmVyOiB7XG4gICAgcG9ydDogODEwMCxcbiAgICAvLyBQcm94eSBmcm9udGVuZCBgL2FwaWAgY2FsbHMgdG8gdGhlIGxvY2FsIEFQSSBzZXJ2ZXIgZHVyaW5nIGRldmVsb3BtZW50XG4gICAgcHJveHk6IHtcbiAgICAgIFwiL2FwaVwiOiB7XG4gICAgICAgIHRhcmdldDogYGh0dHA6Ly9sb2NhbGhvc3Q6JHtwcm9jZXNzLmVudi5BUElfUE9SVCB8fCBcIjM0MDBcIn1gLFxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgIHNlY3VyZTogZmFsc2UsXG4gICAgICB9LFxuICAgIH0sXG4gIH0sXG4gIHRlc3Q6IHtcbiAgICBnbG9iYWxzOiB0cnVlLFxuICAgIGVudmlyb25tZW50OiBcImpzZG9tXCIsXG4gICAgc2V0dXBGaWxlczogXCIuL3NyYy9zZXR1cFRlc3RzLnRzXCIsXG4gIH0sXG4gIC8vIE9wdGltaXplIGRlcGVuZGVuY2llc1xuICBvcHRpbWl6ZURlcHM6IHtcbiAgICBpbmNsdWRlOiBbXG4gICAgICBcInJlYWN0XCIsXG4gICAgICBcInJlYWN0LWRvbVwiLFxuICAgICAgXCJAaW9uaWMvcmVhY3RcIixcbiAgICAgIFwiQHRhbnN0YWNrL3JlYWN0LXF1ZXJ5XCIsXG4gICAgXSxcbiAgfSxcbn0pO1xuXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBRUEsT0FBTyxZQUFZO0FBQ25CLE9BQU8sV0FBVztBQUNsQixTQUFTLG9CQUE0QjtBQUNyQyxTQUFTLGFBQTJCO0FBQ3BDLE9BQU8sVUFBVTtBQU5qQixJQUFNLG1DQUFtQztBQWF6QyxTQUFTLGtCQUEwQjtBQUNqQyxNQUFJLGFBQWtDO0FBSXRDLFFBQU0sVUFBVSxRQUFRLElBQUksWUFBWTtBQUV4QyxTQUFPO0FBQUEsSUFDTCxNQUFNO0FBQUEsSUFDTixPQUFPO0FBQUE7QUFBQSxJQUNQLGtCQUFrQjtBQUNoQixZQUFNLGFBQWEsS0FBSyxRQUFRLGtDQUFXLDRCQUE0QjtBQUV2RSxjQUFRLElBQUksc0NBQXNDO0FBQ2xELG1CQUFhLE1BQU0sUUFBUSxDQUFDLFVBQVUsR0FBRztBQUFBLFFBQ3ZDLE9BQU87QUFBQSxRQUNQLEtBQUs7QUFBQSxVQUNILEdBQUcsUUFBUTtBQUFBLFVBQ1gsTUFBTTtBQUFBLFFBQ1I7QUFBQSxRQUNBLE9BQU87QUFBQSxNQUNULENBQUM7QUFFRCxpQkFBVyxHQUFHLFNBQVMsQ0FBQyxRQUFRO0FBQzlCLGdCQUFRLE1BQU0sNkNBQTZDLElBQUksT0FBTztBQUFBLE1BQ3hFLENBQUM7QUFFRCxpQkFBVyxHQUFHLFFBQVEsQ0FBQyxTQUFTO0FBQzlCLFlBQUksU0FBUyxLQUFLLFNBQVMsTUFBTTtBQUMvQixrQkFBUSxNQUFNLDZDQUE2QyxJQUFJLEVBQUU7QUFBQSxRQUNuRTtBQUNBLHFCQUFhO0FBQUEsTUFDZixDQUFDO0FBR0QsWUFBTSxVQUFVLE1BQU07QUFDcEIsWUFBSSxZQUFZO0FBQ2Qsa0JBQVEsSUFBSSxzQ0FBc0M7QUFDbEQscUJBQVcsS0FBSztBQUNoQix1QkFBYTtBQUFBLFFBQ2Y7QUFBQSxNQUNGO0FBQ0EsY0FBUSxHQUFHLFFBQVEsT0FBTztBQUMxQixjQUFRLEdBQUcsVUFBVSxPQUFPO0FBQzVCLGNBQVEsR0FBRyxXQUFXLE9BQU87QUFBQSxJQUMvQjtBQUFBLEVBQ0Y7QUFDRjtBQUdBLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVM7QUFBQSxJQUNQLGdCQUFnQjtBQUFBLElBQ2hCLE1BQU07QUFBQSxJQUNOLFFBQVEsSUFBSSxzQkFBc0IsVUFBVSxPQUFPO0FBQUEsRUFDckQsRUFBRSxPQUFPLE9BQU87QUFBQSxFQUNoQixPQUFPO0FBQUEsSUFDTCx1QkFBdUI7QUFBQTtBQUFBLElBQ3ZCLGVBQWU7QUFBQSxNQUNiLFFBQVE7QUFBQSxRQUNOLGFBQWEsSUFBSTtBQUNmLGNBQUksQ0FBQyxHQUFHLFNBQVMsY0FBYztBQUFHO0FBS2xDLGNBQ0UsR0FBRyxTQUFTLFFBQVEsS0FDcEIsR0FBRyxTQUFTLFVBQVUsS0FDdEIsR0FBRyxTQUFTLE9BQU8sS0FDbkIsR0FBRyxTQUFTLFdBQVcsS0FDdkIsR0FBRyxTQUFTLFNBQVMsS0FDckIsR0FBRyxTQUFTLFNBQVMsR0FDckI7QUFDQSxtQkFBTztBQUFBLFVBQ1Q7QUFDQSxjQUFJLEdBQUcsU0FBUyxVQUFVO0FBQUcsbUJBQU87QUFDcEMsY0FBSSxHQUFHLFNBQVMsZUFBZTtBQUFHLG1CQUFPO0FBQ3pDLGNBQUksR0FBRyxTQUFTLGNBQWM7QUFBRyxtQkFBTztBQUN4QyxjQUFJLEdBQUcsU0FBUyxZQUFZLEtBQUssR0FBRyxTQUFTLFFBQVE7QUFBRyxtQkFBTztBQUFBLFFBQ2pFO0FBQUEsUUFDQSxnQkFBZ0I7QUFBQSxRQUNoQixnQkFBZ0I7QUFBQSxRQUNoQixnQkFBZ0I7QUFBQSxNQUNsQjtBQUFBLElBQ0Y7QUFBQTtBQUFBLElBRUEsbUJBQW1CO0FBQUE7QUFBQSxFQUNyQjtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBO0FBQUEsSUFFTixPQUFPO0FBQUEsTUFDTCxRQUFRO0FBQUEsUUFDTixRQUFRLG9CQUFvQixRQUFRLElBQUksWUFBWSxNQUFNO0FBQUEsUUFDMUQsY0FBYztBQUFBLFFBQ2QsUUFBUTtBQUFBLE1BQ1Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBQ0EsTUFBTTtBQUFBLElBQ0osU0FBUztBQUFBLElBQ1QsYUFBYTtBQUFBLElBQ2IsWUFBWTtBQUFBLEVBQ2Q7QUFBQTtBQUFBLEVBRUEsY0FBYztBQUFBLElBQ1osU0FBUztBQUFBLE1BQ1A7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
