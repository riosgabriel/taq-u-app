import { PrismaClient } from "@prisma/client"
import { ConfigService } from "config-service"
import { DatabaseConfig, makePgAdapter } from "db-adapter"
import { ConfigProvider, Effect, Layer } from "effect"

/**
 * Shared Prisma client for integration tests.
 *
 * Created once at module load. Every integration test file that
 * imports this module shares the same client. The connection pool
 * is opened on first query and torn down by the `afterAll` in each
 * test file (or on process exit, whichever comes first).
 *
 * The "for free" contract: a new integration test file does not need
 * to construct or disconnect a Prisma client. It imports `prisma`
 * from this module and uses it directly. The lifecycle is owned here.
 *
 * Database settings are read through the app's `DatabaseConfig`, with
 * DATABASE_URL falling back to the local docker-compose Postgres.
 */
const testConfigProvider = ConfigProvider.fromEnv().pipe(
  ConfigProvider.orElse(() =>
    ConfigProvider.fromMap(new Map([["DATABASE_URL", "postgres://postgres:postgres@localhost:5432/taq-u"]]))
  )
)

export const databaseConfig = Effect.runSync(testConfigProvider.load(DatabaseConfig))

export const testConfigLayer = Layer.succeed(
  ConfigService,
  ConfigService.of({ ...databaseConfig, logLevel: "info", jwtSecret: "test-secret" })
)

export const prisma = new PrismaClient({ adapter: makePgAdapter(databaseConfig) })
