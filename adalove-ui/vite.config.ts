import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// O app do site (../src) NÃO é movido: os módulos puros de lá são importados
// daqui por alias. Nada em ../src, ../package.json ou ../tsconfig.json muda.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // `~/` = código desta overlay. `@/` = o app do site, com exatamente o
      // mesmo significado do tsconfig da raiz — assim os módulos puros de
      // ../src/lib importam `@/types/grades` sem precisar de tradução.
      "~": here("./src"),
      "@": here("../src"),
      "@logos": here("../public/logos"),
      "@assets": here("../assets"),
    },
  },
  server: {
    port: 5173,
    // Necessário porque importamos TS de fora da raiz deste pacote.
    fs: { allow: [here("."), here("..")] },
  },
  build: {
    // Content script MV3: um único arquivo IIFE, sem code-splitting, sem hash.
    outDir: here("../extension/dist"),
    emptyOutDir: false,
    cssCodeSplit: false,
    target: "chrome111", // adoptedStyleSheets + :host — Chrome 111+ cobre tudo que usamos
    rollupOptions: {
      input: here("./src/mount.tsx"),
      output: {
        format: "iife",
        entryFileNames: "adalove-ui.js",
        inlineDynamicImports: true,
        assetFileNames: "adalove-ui.[ext]",
      },
    },
  },
});
