import { AuditLogService, AuditLogServiceLive } from "audit/audit-log-service"
import { DatabaseUnavailable } from "@/persistence-errors"
import { DomainEvent } from "events/domain-event"
import { describe, expect, it } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { PrismaService } from "prisma-service"
import { Prisma } from "@prisma/client"

const mockEvent: DomainEvent = {
  type: "OrderCreated",
  streamId: "order:123",
  payload: { orderId: "123", customerId: "cust-1" },
}

const mockCreateResult = { id: "audit-1", ...mockEvent, createdAt: new Date() }
const mockFindManyResult = [
  { id: "1", eventType: "OrderCreated", streamId: "order:123", payload: {}, createdAt: new Date() },
]

const buildTestLayer = (mockPrisma: { auditLog: { create: () => Promise<any>; findMany: () => Promise<any[]> } }) =>
  AuditLogServiceLive.pipe(Layer.provide(Layer.succeed(PrismaService, {
    prisma: mockPrisma as any,
    execute: (operation: any) => Effect.tryPromise({ try: operation, catch: (e) => new DatabaseUnavailable({ message: String(e), meta: null }) }),
    $transaction: (fn: any) => Effect.tryPromise({ try: fn, catch: (e) => new DatabaseUnavailable({ message: String(e), meta: null }) }),
  })))

const mockAuditLog = {
  auditLog: {
    create: () => Promise.resolve({ id: "audit-1", ...mockEvent, createdAt: new Date() }),
    findMany: () => Promise.resolve([
      { id: "1", eventType: "OrderCreated", streamId: "order:123", payload: {}, createdAt: new Date() },
    ]),
  },
}

const mockAuditLogError = {
  auditLog: {
    create: () => Promise.reject(new Prisma.PrismaClientInitializationError("DB error", "test", "test")),
    findMany: () => Promise.resolve([]),
  },
}

describe("AuditLogService", () => {
  describe("record", () => {
    it.effect("writes event to audit log", () =>
      Effect.gen(function* () {
        const service = yield* AuditLogService
        yield* service.record(mockEvent)
      }).pipe(
        Effect.provide(
          buildTestLayer(mockAuditLog)
        )
      )
    )

    it.effect("fails with PersistenceError on DB error", () =>
      Effect.gen(function* () {
        const program = Effect.gen(function* () {
          const service = yield* AuditLogService
          return yield* service.record(mockEvent)
        }).pipe(Effect.either)

        const result = yield* program
        expect(result._tag).toBe("Left")
      }).pipe(
        Effect.provide(
          buildTestLayer(mockAuditLogError)
        )
      )
    )
  })

  describe("list", () => {
    it.effect("returns filtered entries", () =>
      Effect.gen(function* () {
        const service = yield* AuditLogService
        const entries = yield* service.list({ streamId: "order:123", limit: 10 })
        expect(entries).toHaveLength(1)
        expect(entries[0].streamId).toBe("order:123")
      }).pipe(
        Effect.provide(
          buildTestLayer(mockAuditLog)
        )
      )
    )
  })
})