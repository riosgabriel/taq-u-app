import { PrismaPg } from "@prisma/adapter-pg"
import { Config } from "effect"
import { DatabaseURLConfig, DbConnectTimeoutConfig, DbPoolSizeConfig } from "./config-service"

/**
 * The subset of config needed to open a database connection. Kept separate
 * from AppConfig so scripts like the seed don't require app-only settings
 * (e.g. JWT_SECRET).
 */
export const DatabaseConfig = Config.all({
  databaseUrl: DatabaseURLConfig,
  dbPoolSize: DbPoolSizeConfig,
  dbConnectTimeout: DbConnectTimeoutConfig,
})

export type DatabaseConfig = Config.Config.Success<typeof DatabaseConfig>

// Pool settings go to pg directly: it ignores Prisma 6's `connection_limit`
// and `connect_timeout` URL params.
export const makePgAdapter = ({ databaseUrl, dbPoolSize, dbConnectTimeout }: DatabaseConfig) =>
  new PrismaPg({
    connectionString: databaseUrl,
    max: dbPoolSize,
    connectionTimeoutMillis: dbConnectTimeout * 1000,
  })
