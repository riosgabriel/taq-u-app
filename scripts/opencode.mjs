import { config } from "dotenv"
import { spawn } from "child_process"
import { fileURLToPath } from "url"
import { dirname, resolve } from "path"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
config({ path: resolve(root, ".env") })

const child = spawn("opencode", process.argv.slice(2), {
  stdio: "inherit",
  env: { ...process.env },
})

child.on("exit", (code) => process.exit(code ?? 0))
