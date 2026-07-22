import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, ".env"), quiet: true });
dotenv.config({ path: path.resolve(__dirname, "client", `.env.${process.env.NODE_ENV || "development"}`), override: false, quiet: true });

const configuredClientPort = Number(process.env.CLIENT_PORT ?? process.env.VITE_CLIENT_PORT ?? 5173);
const clientPort = Number.isFinite(configuredClientPort) && configuredClientPort > 0
  ? configuredClientPort
  : 5173;
const configuredApiPort = Number(process.env.PORT ?? 5000);
const apiPort = Number.isFinite(configuredApiPort) && configuredApiPort > 0
  ? configuredApiPort
  : 5000;
const devApiHost = process.env.DEV_API_HOST ?? "127.0.0.1";
const apiTarget = `http://${devApiHost}:${apiPort}`;
const wsTarget = `ws://${devApiHost}:${apiPort}`;

export default defineConfig({
  root: path.resolve(__dirname, "client"),
  envDir: path.resolve(__dirname, "client"),

  plugins: [react()],
  assetsInclude: ["**/*.JPG", "**/*.JPEG", "**/*.PNG", "**/*.WEBP"],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client/src"),
      "@assets": path.resolve(__dirname, "client/src/assets"),
      "@shared": path.resolve(__dirname, "shared"),
    },
  },

  build: {
    outDir: path.resolve(__dirname, "dist/client"),
    emptyOutDir: true,
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

  server: {
    port: clientPort,
    strictPort: true,
    fs: {
      strict: false,
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
});
