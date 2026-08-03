import { defineConfig } from "vitest/config"
import tsconfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  plugins: [tsconfigPaths({ projects: ["./tsconfig.json", "./test/tsconfig.json"] })],
  test: {
    globals: true,
    // Pattern-based exclusion: files matching `*.integration.test.ts`
    // are integration tests that need a running Postgres and are
    // excluded from the default `pnpm test` run. The `test:integration`
    // script in package.json runs only the integration directory, so
    // the path-based dispatch there still picks them up. Pattern-based
    // (not directory-based) so a new integration test can live
    // outside `test/integration/` and still be excluded correctly.
    exclude: ["**/node_modules/**", "**/dist/**", "**/*.integration.test.ts"],
  },
})
