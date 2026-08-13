import { config } from "dotenv"
import { spawn } from "child_process"
import { fileURLToPath } from "url"
import { dirname, resolve } from "path"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
config({ path: resolve(root, ".env") })

const args = process.argv.slice(2).filter((arg) => arg !== "--")
const child = spawn("opencode", args, {
  stdio: "inherit",
  env: { ...process.env },
})

child.on("exit", (code) => process.exit(code ?? 1))
