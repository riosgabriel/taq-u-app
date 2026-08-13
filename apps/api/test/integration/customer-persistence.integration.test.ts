/* -----------------------------------------------------------------------------
 * EXAMPLE INTEGRATION TEST — REFERENCE IMPLEMENTATION
 *
 * This file is the reference implementation of the three testing axioms
 * codified in TESTING.md. Copy its shape when adding new integration
 * tests; do not invent a new pattern.
 *
 * PREREQUISITES
 *   1. Start the local Postgres:  pnpm docker:up   (see docker-compose.yml)
 *   2. Run the migrations:        pnpm --filter @taq-u-app/api db:deploy
 *   3. Run the integration test script — see apps/api/package.json for the
 *      exact command. (We do not inline the command here because the
 *      TypeScript JSDoc parser tries to read the script name, which
 *      contains a colon, as a type annotation.)
 *
 * The default `pnpm test` does NOT run this file. The `test` script in
 * apps/api/package.json excludes the integration directory so a missing
 * local Postgres cannot break fast feedback loops.
 *
 * ─── How this file satisfies each axiom ────────────────────────────────
 *
 * Rule 1 — Unit tests: no damage, no flakiness.
 *   Although this is an integration test, the same shape of determinism
 *   still applies. We use:
 *     - fixed string IDs and a fixed email (no `Date.now()`, no
 *       `Math.random()`);
 *     - a Prisma transaction that ALWAYS rolls back at the end of the
 *       test, so a failure mid-test cannot leak rows into the next run.
 *
 * Rule 2 — Integration tests: bounded real I/O.
 *   - The boundary under test is real: a real `PrismaClient` connects
 *     to a real local Postgres (the docker-compose service). Nothing
 *     is mocked at the persistence boundary.
 *   - The world outside the test environment is untouched: we connect
 *     to `DATABASE_URL`, which should point at the local docker
 *     Postgres, never at production. Override with a per-developer
 *     `.env` if needed.
 *   - Each test owns the state it creates: every operation runs inside
 *     a single transaction that is rolled back at the end. The next
 *     test (and the next developer run) starts from a known state.
 *   - Self-cleaning on failure: the rollback throw runs whether or not
 *     assertions pass.
 *   - Tagged by directory: `apps/api/test/integration/`. The `test`
 *     script in `package.json` excludes this path so unit-tier
 *     feedback stays fast.
 *
 * Rule 3 — All tests: behavior, not implementation.
 *   - We assert the observable round-trip: a customer row written
 *     through Prisma can be read back with the same data. We do not
 *     assert on Prisma internals, the transaction machinery, or
 *     module structure.
 *   - If the customer schema changes shape, this test will surface
 *     the change through its assertions, not by binding to internals.
 *
 * ─── Out of scope (and why) ───────────────────────────────────────────
 *   - This test does NOT go through `CustomerService` because that
 *     service uses `prismaService.execute()`, which goes through the
 *     global client and does not accept a transaction. A clean
 *     service-layer integration test would require refactoring
 *     `CustomerService` (and siblings) to accept a
 *     `Prisma.TransactionClient`. That refactor is a separate change.
 *   - This file contains ONE test by design. It is the example, not
 *     a suite. Extend the pattern by adding more `it.effect` calls
 *     in this file or by adding new files under
 *     `apps/api/test/integration/`. Each new test must roll back its
 *     own state.
 */

import { describe, it } from "@effect/vitest"
import { PrismaClient } from "@prisma/client"
import { Effect } from "effect"
import { afterAll } from "vitest"

const DATABASE_URL = process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/taq-u"

const prisma = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } })

/**
 * A sentinel error that, when thrown inside a `prisma.$transaction`
 * callback, forces the transaction to roll back. We catch this at the
 * Effect level to recognize the "the test ran successfully and rolled
 * back" outcome; any other error is a real test failure.
 */
class RollbackSignal extends Error {
  readonly _tag = "RollbackSignal"
}

describe("Customer persistence (integration)", () => {
  it.effect("a customer row written through Prisma can be read back with the same data", () =>
    Effect.gen(function* () {
      // Deterministic inputs: no `Date.now()`, no random IDs. The
      // email is hard-coded and unique; if a previous run left a row
      // with this email, the unique constraint will fail the test
      // loudly, which is the right behavior (it means a previous run
      // did not roll back as expected).
      const FIXED_EMAIL = "itest-customer@example.com"

      const failure = yield* Effect.tryPromise({
        try: () =>
          prisma.$transaction(async (tx) => {
            // CREATE — observable: a row is written through the real
            // persistence boundary.
            const created = await tx.customer.create({
              data: {
                name: "Integration Test Customer",
                email: FIXED_EMAIL,
                phone: "555-0000",
                address: "1 Test Way",
              },
            })

            // READ — observable: the same row is retrievable in the
            // same transaction, demonstrating the round-trip through
            // the real DB.
            const read = await tx.customer.findUnique({ where: { id: created.id } })

            // ASSERT — behavior, not implementation. If any of these
            // throw, the error propagates out of the transaction,
            // the rollback happens, and the test fails with that
            // error. We use plain `Error` so the cause is visible in
            // the test output rather than a Prisma-wrapped one.
            if (read === null) {
              throw new Error("customer was not readable immediately after create")
            }
            if (read.id !== created.id) {
              throw new Error(`id mismatch on round-trip: wrote ${created.id}, read ${read.id}`)
            }
            if (read.email !== FIXED_EMAIL) {
              throw new Error(`email mismatch on round-trip: expected ${FIXED_EMAIL}, got ${read.email}`)
            }
            if (read.name !== "Integration Test Customer") {
              throw new Error(`name mismatch on round-trip: got ${read.name}`)
            }
            if (read.phone !== "555-0000") {
              throw new Error(`phone mismatch on round-trip: got ${read.phone}`)
            }
            if (read.address !== "1 Test Way") {
              throw new Error(`address mismatch on round-trip: got ${read.address}`)
            }

            // ROLLBACK — force the transaction to abort. The row we
            // just wrote is never persisted. This is the
            // "self-cleaning on failure" guarantee from Rule 2.
            throw new RollbackSignal()
          }),
        catch: (e): Error => (e instanceof Error ? e : new Error(String(e))),
      }).pipe(Effect.flip)

      // The ONLY acceptable failure is `RollbackSignal` — that means
      // every assertion above passed and the transaction was rolled
      // back cleanly. Anything else (a Prisma connection error, an
      // assertion error that bubbled out) is a real failure; re-throw
      // so the test reports it.
      if (!(failure instanceof RollbackSignal)) {
        throw failure
      }

      // ROLLBACK — observable: the row written inside the transaction
      // must not have been persisted.
      const leaked = yield* Effect.promise(() => prisma.customer.findUnique({ where: { email: FIXED_EMAIL } }))
      if (leaked !== null) {
        throw new Error("customer row leaked after transaction rollback")
      }
    })
  )
})

// Tear down the Prisma connection. Runs after the suite finishes,
// whether tests passed or failed. A missing `afterAll` would leak
// the connection pool, which over many test runs in dev would
// exhaust Postgres connection slots.
afterAll(async () => {
  await prisma.$disconnect()
})
