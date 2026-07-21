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

export const AppConfig = Config.all({
  databaseUrl: DatabaseURLConfig,
  dbPoolSize: DbPoolSizeConfig,
  dbConnectTimeout: DbConnectTimeoutConfig,
  logLevel: LogLevelConfig,
})

const withDbParams = (url: string, poolSize: number, connectTimeout: number): string => {
  const u = new URL(url)
  if (!u.searchParams.has("connection_limit")) {
    u.searchParams.set("connection_limit", String(poolSize))
  }
  if (!u.searchParams.has("connect_timeout")) {
    u.searchParams.set("connect_timeout", String(connectTimeout))
  }
  return u.toString()
}

export class ConfigService extends Context.Tag("order/ConfigService")<
  ConfigService,
  {
    readonly databaseUrl: string
    readonly dbPoolSize: number
    readonly dbConnectTimeout: number
    readonly logLevel: "debug" | "info" | "warn" | "error"
  }
>() {}

export const ConfigLive = Layer.effect(
  ConfigService,
  Effect.gen(function* () {
    const config = yield* Effect.configProviderWith((provider) => provider.load(AppConfig))
    return ConfigService.of({
      ...config,
      databaseUrl: withDbParams(config.databaseUrl, config.dbPoolSize, config.dbConnectTimeout),
    })
  })
)
