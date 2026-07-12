import { defineConfig } from "vitest/config"
import path from "path"
import tsconfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  plugins: [tsconfigPaths({ projects: ["./tsconfig.json"] })],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@order": path.resolve(__dirname, "src/order"),
    },
  },
  test: {
    globals: true,
  },
})
