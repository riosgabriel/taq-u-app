# Testing axioms

Three standing rules for tests in this repo. They are not preferences. A test
that violates any of them is a defect.

The rules differ by test type. Tests in this repo fall into two categories:

- **Unit tests** — exercise a unit (service, domain function, DTO) with all
  collaborators mocked at I/O boundaries. Fast, deterministic, no real I/O.
- **Integration tests** — exercise a real subsystem end-to-end (a real
  database, a real queue, a real in-process server). The boundary under
  test is intentionally real.

The repo currently ships only unit tests. When you add an integration test,
follow the rules below for its category and tag it so it can be excluded
from fast feedback loops.

## Rule 1 — Unit tests: no damage, no flakiness

A unit test must never cause real-world side effects and must never depend
on uncontrolled state.

- **No real I/O.** No real database writes, no real HTTP calls to external
  services, no real money movement, no real emails/notifications, no real
  filesystem mutations outside the test sandbox. Mock at the I/O boundary
  (repositories, external clients, the clock, the network).
- **Deterministic.** Time and randomness are controlled. No `Date.now()` in
  tests, no `Math.random()`, no reliance on the order tests run, no
  `setTimeout` to "wait for the system to settle".
- **Isolated.** No shared mutable state between tests. No test mutates a
  module-level variable another test reads. No test leaves rows behind for
  the next test to trip over.
- **Self-cleaning on failure.** A failing test leaves no residue that affects
  the next run. If a test creates state, it is torn down — even when an
  assertion throws.

A test run that affects the world outside the test, or that fails for a
reason unrelated to what it claims to test, is a defect.

## Rule 2 — Integration tests: bounded real I/O

An integration test crosses a real I/O boundary on purpose. The boundary
under test must be real; the world outside the test environment must not be
touched.

- **The boundary under test is real.** The DB, the queue, the HTTP server,
  the in-memory cache — whatever subsystem you're validating — runs in its
  real form. You do not mock it.
- **The world outside the test environment is not touched.** No production
  database, no real third-party API, no real money movement, no real emails
  to real addresses, no real filesystem mutations outside the test sandbox.
  Use a local Postgres, a docker-compose service, an in-process test server
  (WireMock, msw, testcontainers), an in-memory queue, an ephemeral port —
  not the prod cluster.
- **Isolated.** Each test owns the state it creates. No test depends on
  rows another test left behind. Wrap each test in a transaction that
  rolls back, or a `beforeEach`/`afterEach` that creates and tears down.
- **Deterministic where the subsystem allows.** No `setTimeout`-based "wait
  for it to settle". Use bounded retries with explicit timeouts, or poll on
  a deterministic condition.
- **Self-cleaning on failure.** If a test errors mid-way, the next run must
  still start from a known state. Teardown runs even on failure.
- **Tagged as integration.** The test file, directory, or `describe` block
  must be identifiable so fast feedback loops can skip it
  (`describe.integration` / `vitest --exclude integration`). An integration
  test that always runs with unit tests defeats the purpose of having two
  tiers.

An integration test that hits production data, or that another test can
break by running first, is a defect.

## Rule 3 — All tests: behavior, not implementation

Both unit and integration tests assert observable behavior through the
public contract. They do not assert the shape of the machinery.

- **Test the way a caller would.** Public service methods, HTTP endpoints,
  domain functions, schema DTOs — the surfaces a real consumer can observe.
- **Don't bind to internals.** No assertions on private methods, on the
  internal call sequence of collaborators, on non-observable state, or on
  module structure (file paths, import order, internal helpers).
- **Mock at the boundary, not the seam inside the SUT.** For unit tests:
  replace what the SUT _depends on_. For integration tests: don't replace
  the boundary under test; do replace collaborators _outside_ that boundary.
- **Survive refactors.** A test that breaks when internals are refactored
  while behavior is preserved is testing the wrong thing. If a rename of a
  private helper breaks 40 tests, the tests are wrong, not the rename.

A test that pins implementation is a tax on every future change. Don't pay
that tax.

## In this repo

These rules are already embodied in the existing unit tests. When in doubt,
copy their shape:

- `apps/api/test/order/services/driver-service.test.ts` — tests through
  `DriverService`, mocks `DriverRepository` with `Effect.die("unexpected")` on
  every method the path under test should _not_ touch. That `die` pattern is
  not a quirk; it is a load-bearing assertion that the service does not call
  what it shouldn't.
- `apps/api/test/order/services/customer-service.test.ts` — same shape.
- `apps/api/test/order/domain/order-status.test.ts` — pure-function domain
  test. Trivially satisfies all three rules.

No integration tests exist yet. When one is added:

- Run a real Postgres via `pnpm docker:up` (PostgreSQL 16.3 in
  `docker-compose.yml` at the repo root), not the production URL.
- Wrap each test in a Prisma transaction that rolls back, or use a
  per-test schema. Do not share rows across tests.
- Place the test under `apps/api/test/integration/` and tag the file or
  `describe` block so `pnpm test` (the unit-tier default) does not run it.

Conventions to keep:

- `@effect/vitest` with `it.effect` for anything that returns an `Effect`.
  `it` for pure functions.
- Layer the system under test with `Layer.provide`. Each test owns its
  layer graph; no shared `beforeAll` layer.
- Name tests for the behavior, not the method. `it.effect("returns 400 when
email is malformed")` not `it.effect("validates email")`.

## Quick checks before you commit a test

Unit tests:

- [ ] Does any code path reach a real database, network, clock, or
      filesystem outside the sandbox? If yes — mock it.
- [ ] Is time/randomness controlled? If not, the test is a flake waiting to
      happen.
- [ ] Does the test pass when run alone? Does it pass after every other
      test in the file? If either is no, the test is coupled.

Integration tests:

- [ ] Is the subsystem under test running in its real form (real DB, real
      queue, real in-process server)? If no, it's a unit test mislabeled.
- [ ] Is the world outside the test environment untouched? No prod DB, no
      real third-party API, no real money/emails. If yes — that boundary
      belongs in the test environment.
- [ ] Is each test's state torn down (transaction rollback, fixture
      cleanup), including on failure? If no, the next run starts dirty.
- [ ] Is the test tagged so unit-tier `pnpm test` skips it? If no, fast
      feedback is broken.

All tests:

- [ ] If I rename a private helper, do these tests still pass and still
      cover the same behavior? If no, the test is bound to implementation.
- [ ] If this test fails, does the failure point at the behavior the test
      claims to cover? If no, the test is asserting the wrong thing.
