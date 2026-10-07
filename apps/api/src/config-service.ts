import { Config, Context, Effect, Layer } from "effect"

export const DatabaseURLConfig = Config.string("DATABASE_URL")

export const DbPoolSizeConfig = Config.number("DB_POOL_SIZE").pipe(Config.withDefault(5))

export const DbConnectTimeoutConfig = Config.number("DB_CONNECT_TIMEOUT").pipe(Config.withDefault(10))

export const LogLevelConfig = Config.literal(
  "debug",
  "info",
  "warn",
  "error"
)("LOG_LEVEL").pipe(Config.withDefault("info"))

export const JwtSecretConfig = Config.string("JWT_SECRET")

export const AppConfig = Config.all({
  databaseUrl: DatabaseURLConfig,
  dbPoolSize: DbPoolSizeConfig,
  dbConnectTimeout: DbConnectTimeoutConfig,
  logLevel: LogLevelConfig,
  jwtSecret: JwtSecretConfig,
})

export class ConfigService extends Context.Tag("order/ConfigService")<
  ConfigService,
  {
    readonly databaseUrl: string
    readonly dbPoolSize: number
    readonly dbConnectTimeout: number
    readonly logLevel: "debug" | "info" | "warn" | "error"
    readonly jwtSecret: string
  }
>() {}

export const ConfigLive = Layer.effect(
  ConfigService,
  Effect.gen(function* () {
    const config = yield* Effect.configProviderWith((provider) => provider.load(AppConfig))
    return ConfigService.of(config)
  })
)
