import { Logger } from "effect"

export const AppLogger = process.env.NODE_ENV === "production"
  ? Logger.json
  : Logger.pretty