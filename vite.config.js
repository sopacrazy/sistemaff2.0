import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  server: {
    port: 3000,
    strictPort: false,
    host: true,
  },
  build: {
    outDir: "build",
    emptyOutDir: true,
  },
  resolve: {
    extensions: [".mjs", ".js", ".mts", ".ts", ".jsx", ".tsx", ".json"],
  },
  esbuild: {
    loader: "tsx", // using tsx handles .js with JSX and .tsx with TypeScript correctly
    include: /src\/.*\.[jt]sx?$/,
    exclude: [],
  },
  optimizeDeps: {
    include: [
      "@mui/material/Tooltip",
      "@mui/material/Popper",
      "@mui/material/Box",
      "@mui/material/styles",
      "@emotion/react",
      "@emotion/styled",
    ],
    esbuildOptions: {
      loader: {
        ".js": "jsx",
      },
    },
  },
  // Removido define para permitir detecção automática da URL baseada no hostname
  // A URL será detectada dinamicamente em src/utils/apiConfig.js
});
