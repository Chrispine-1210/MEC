import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

dotenv.config({ path: path.resolve(rootDir, ".env"), quiet: true });
dotenv.config({ path: path.resolve(rootDir, `.env.${process.env.NODE_ENV || "development"}`), override: false, quiet: true });
dotenv.config({ path: path.resolve(__dirname, ".env"), override: false, quiet: true });
dotenv.config({ path: path.resolve(__dirname, `.env.${process.env.NODE_ENV || "development"}`), override: false, quiet: true });

const configuredAdminPort = Number(process.env.ADMIN_PORT ?? process.env.VITE_ADMIN_PORT ?? 5174);
const adminPort = Number.isFinite(configuredAdminPort) && configuredAdminPort > 0
  ? configuredAdminPort
  : 5174;
const adminBuildOutDir = process.env.ADMIN_BUILD_OUT_DIR
  ? path.resolve(rootDir, process.env.ADMIN_BUILD_OUT_DIR)
  : path.resolve(rootDir, "dist", "admin");
const configuredApiPort = Number(process.env.PORT ?? 5000);
const apiPort = Number.isFinite(configuredApiPort) && configuredApiPort > 0
  ? configuredApiPort
  : 5000;
const devApiHost = process.env.DEV_API_HOST ?? "127.0.0.1";
const apiTarget = `http://${devApiHost}:${apiPort}`;
const wsTarget = `ws://${devApiHost}:${apiPort}`;

export default defineConfig({
  root: path.resolve(__dirname, "client"),
  envDir: __dirname,
  plugins: [react()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client/src"),
      "@shared": path.resolve(__dirname, "shared"),
    },
  },

  build: {
    outDir: adminBuildOutDir,
    emptyOutDir: true,
    sourcemap: false,
    target: "es2020",
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1200,
    rolldownOptions: {
      checks: {
        pluginTimings: false,
      },
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("react-dom") || id.includes("react/jsx") || id.includes("react/index")) return "react-vendor";
          if (id.includes("@radix-ui")) return "radix-vendor";
          if (id.includes("@tanstack")) return "query-vendor";
          if (id.includes("framer-motion")) return "motion-vendor";
          if (id.includes("recharts") || id.includes("d3-")) return "charts-vendor";
          if (id.includes("lucide-react") || id.includes("react-icons")) return "icons-vendor";
          return "vendor";
        },
      },
    },
  },

  base: process.env.VITE_ADMIN_BASE_PATH || "/admin/",

  server: {
    port: adminPort,
    strictPort: true,
    fs: {
      allow: [".."],
    },
    headers: {
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin",
    },
    proxy: {
      "/api": apiTarget,
      "/auth": apiTarget,
      "/uploads": apiTarget,
      "/media-assets": apiTarget,
      "/ws": {
        target: wsTarget,
        ws: true,
      },
    },
  },

  optimizeDeps: {
    include: ["ws"],
  },
});
