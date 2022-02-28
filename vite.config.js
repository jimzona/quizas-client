import { defineConfig } from "vite"
import eslintPlugin from "vite-plugin-eslint"

// vite.config.js
export default defineConfig({
  plugins: [eslintPlugin()],
  server: {
    host: "localhost",
    cors: "*",
    hmr: {
      host: "localhost",
      protocol: "ws",
    },
  },
  build: {
    minify: true,
    manifest: false,
    rollupOptions: {
      input: "./src/main.ts",
      output: {
        entryFileNames: (chunkInfo) => `${chunkInfo.name}.js`,
        format: "umd",
        esModule: false,
        compact: true,
        globals: {
          jquery: "$",
        },
      },
      external: ["jquery"],
    },
  },
})
