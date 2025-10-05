import { Config, Context, Effect, Layer } from "effect"

export const DatabaseURLConfig = Config.string("DATABASE_URL").pipe(
  Config.withDefault("postgresql://postgres:postgres@localhost:5432/postgres") // TODO: remove it
)

const LogLevelsAllowed = ["debug", "info", "warn", "error"]

export const LogLevelConfig = Config.string("LOG_LEVEL").pipe(
  Config.withDefault("info"),
  Config.validate({
    message: `Log level must be one of: ${LogLevelsAllowed.join(", ")}`,
    validation: (value) => LogLevelsAllowed.includes(value),
  })
)

class ConfigService extends Context.Tag("delivery/ConfigService")<
  ConfigService,
  {
    readonly getConfig: Effect.Effect<{
      readonly logLevel: Config.Config<string>
      readonly databaseUrl: Config.Config<string>
    }>
  }
>() {}

export const ConfigLive = Layer.succeed(
  ConfigService,
  ConfigService.of({
    getConfig: Effect.succeed({
      logLevel: LogLevelConfig,
      databaseUrl: DatabaseURLConfig,
    }),
  })
)
