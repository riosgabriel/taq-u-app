import { ConfigService } from "@order/services/config-service"
import { Effect, Layer, LogLevel, Logger } from "effect"

const toLogLevel = (level: "debug" | "info" | "warn" | "error"): LogLevel.LogLevel => {
  switch (level) {
    case "debug":
      return LogLevel.Debug
    case "info":
      return LogLevel.Info
    case "warn":
      return LogLevel.Warning
    case "error":
      return LogLevel.Error
  }
}

export const AppLogger = Layer.unwrapEffect(
  Effect.gen(function* () {
    const { logLevel } = yield* ConfigService
    const base = process.env.NODE_ENV === "production" ? Logger.json : Logger.pretty
    return Layer.merge(base, Logger.minimumLogLevel(toLogLevel(logLevel)))
  })
)
