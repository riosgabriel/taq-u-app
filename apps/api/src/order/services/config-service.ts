import { Config, Context, Effect, Layer } from "effect"

export const DatabaseURLConfig = Config.string("DATABASE_URL")

export const LogLevelConfig = Config.literal("debug", "info", "warn", "error")("LOG_LEVEL").pipe(
  Config.withDefault("info")
)

export const AppConfig = Config.all({
  databaseUrl: DatabaseURLConfig,
  logLevel: LogLevelConfig,
})

export class ConfigService extends Context.Tag("order/ConfigService")<
  ConfigService,
  {
    readonly databaseUrl: string
    readonly logLevel: "debug" | "info" | "warn" | "error"
  }
>() {}

export const ConfigLive = Layer.effect(
  ConfigService,
  Effect.gen(function* () {
    const config = yield* Effect.configProviderWith((provider) => provider.load(AppConfig))
    return ConfigService.of(config)
  })
)
