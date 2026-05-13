import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  root: path.resolve(__dirname, "client"),

  plugins: [react()],

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
    sourcemap: false,
    target: "es2020",
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-dom/client"],
        },
      },
    },
  },

  server: {
    fs: {
      allow: ['..']  // For uploads/shared
    },
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin'
    },
    proxy: {
      "/api": "http://localhost:5000",
      "/auth": "http://localhost:5000",
      "/uploads": "http://localhost:5000",
      "/ws": {
        target: "ws://localhost:5000",
        ws: true,
      },
    },
  },
  optimizeDeps: {
    include: ['ws']
  },
  preview: {
    port: 4173
  }
});
