/// <reference types="vite/client" />
/// <reference types="vite/types/importMeta.d.ts" />

import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

export default defineConfig({
  plugins: [TanStackRouterVite({
    routesDirectory: "src/pages", // Diretório onde estão os arquivos de rotas
  }), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist", // Diretório de saída correto para build
    emptyOutDir: true, // Limpa o diretório 'dist' antes de cada build
    sourcemap: true, // Gera mapas de fonte para facilitar o debug
  },
});
