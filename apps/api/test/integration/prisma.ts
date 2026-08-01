import { PrismaClient } from "@prisma/client"

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
 * DATABASE_URL follows the same convention as the rest of the test
 * suite: default to the local docker-compose Postgres.
 */
const DATABASE_URL = process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/taq-u"

export const prisma = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } })
