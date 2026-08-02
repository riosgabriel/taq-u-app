import { RecordNotFoundError } from "@/persistence-errors"
import { describe, expect, it } from "@effect/vitest"
import { assertLeft } from "@effect/vitest/utils"
import { Effect, Layer } from "effect"
import { type PaymentStatus } from "payment/domain/payment"
import { PaymentRepository } from "payment/repository/payment-repository"
import { PaymentNotFoundError, PaymentService, PaymentServiceLive } from "payment/services/payment-service"

const payment = {
  id: "pay-123",
  method: "CREDIT_CARD" as const,
  amount: 49.99,
  currency: "USD",
  status: "PENDING" as PaymentStatus,
  transactionId: null,
  timestamp: new Date("2026-09-01T12:00:00Z"),
  orderId: "order-abc",
}

const buildTestLayer = (mockRepo: typeof PaymentRepository.Service) =>
  PaymentServiceLive.pipe(Layer.provide(Layer.succeed(PaymentRepository, mockRepo)))

describe("PaymentService", () => {
  describe("listAll", () => {
    it.effect("returns all payments", () =>
      Effect.gen(function* () {
        const service = yield* PaymentService
        const result = yield* service.listAll()
        expect(result).toHaveLength(1)
        expect(result[0].id).toBe("pay-123")
        expect(result[0].method).toBe("CREDIT_CARD")
        expect(result[0].amount).toBe(49.99)
      }).pipe(
        Effect.provide(
          buildTestLayer(
            PaymentRepository.of({
              create: () => Effect.die("unexpected"),
              listAll: () => Effect.succeed([payment]),
              getById: () => Effect.die("unexpected"),
              updateStatus: () => Effect.die("unexpected"),
              listByOrderId: () => Effect.die("unexpected"),
            })
          )
        )
      )
    )

    it.effect("returns empty list when no payments exist", () =>
      Effect.gen(function* () {
        const service = yield* PaymentService
        const result = yield* service.listAll()
        expect(result).toEqual([])
      }).pipe(
        Effect.provide(
          buildTestLayer(
            PaymentRepository.of({
              create: () => Effect.die("unexpected"),
              listAll: () => Effect.succeed([]),
              getById: () => Effect.die("unexpected"),
              updateStatus: () => Effect.die("unexpected"),
              listByOrderId: () => Effect.die("unexpected"),
            })
          )
        )
      )
    )
  })

  describe("getById", () => {
    it.effect("returns the payment when found", () =>
      Effect.gen(function* () {
        const service = yield* PaymentService
        const result = yield* service.getById("pay-123")
        expect(result.id).toBe("pay-123")
        expect(result.amount).toBe(49.99)
        expect(result.status).toBe("PENDING")
      }).pipe(
        Effect.provide(
          buildTestLayer(
            PaymentRepository.of({
              create: () => Effect.die("unexpected"),
              listAll: () => Effect.die("unexpected"),
              getById: () => Effect.succeed(payment),
              updateStatus: () => Effect.die("unexpected"),
              listByOrderId: () => Effect.die("unexpected"),
            })
          )
        )
      )
    )

    it.effect("fails with PaymentNotFoundError when payment does not exist", () =>
      Effect.gen(function* () {
        const program = Effect.gen(function* () {
          const service = yield* PaymentService
          return yield* service.getById("missing-id")
        }).pipe(Effect.either)

        const result = yield* program
        assertLeft(result, new PaymentNotFoundError({ id: "missing-id", message: "Not found" }))
      }).pipe(
        Effect.provide(
          buildTestLayer(
            PaymentRepository.of({
              create: () => Effect.die("unexpected"),
              listAll: () => Effect.die("unexpected"),
              getById: (id) => Effect.fail(new RecordNotFoundError({ model: "Payment", id, message: "Not found" })),
              updateStatus: () => Effect.die("unexpected"),
              listByOrderId: () => Effect.die("unexpected"),
            })
          )
        )
      )
    )
  })

  describe("create", () => {
    const input = {
      method: "CREDIT_CARD" as const,
      amount: 49.99,
      currency: "USD",
      orderId: "order-abc",
    }

    it.effect("creates and returns the payment", () =>
      Effect.gen(function* () {
        const service = yield* PaymentService
        const result = yield* service.create(input)
        expect(result.id).toBe("pay-123")
        expect(result.amount).toBe(49.99)
        expect(result.method).toBe("CREDIT_CARD")
      }).pipe(
        Effect.provide(
          buildTestLayer(
            PaymentRepository.of({
              create: (data) =>
                Effect.succeed({
                  id: "pay-123",
                  method: data.method,
                  amount: data.amount,
                  currency: data.currency,
                  status: "PENDING" as PaymentStatus,
                  transactionId: data.transactionId ?? null,
                  timestamp: new Date(),
                  orderId: data.orderId ?? null,
                }),
              listAll: () => Effect.die("unexpected"),
              getById: () => Effect.die("unexpected"),
              updateStatus: () => Effect.die("unexpected"),
              listByOrderId: () => Effect.die("unexpected"),
            })
          )
        )
      )
    )
  })

  describe("updateStatus", () => {
    it.effect("updates the status and returns the payment", () =>
      Effect.gen(function* () {
        const service = yield* PaymentService
        const result = yield* service.updateStatus("pay-123", "PAID")
        expect(result.id).toBe("pay-123")
        expect(result.status).toBe("PAID")
      }).pipe(
        Effect.provide(
          buildTestLayer(
            PaymentRepository.of({
              create: () => Effect.die("unexpected"),
              listAll: () => Effect.die("unexpected"),
              getById: () => Effect.die("unexpected"),
              updateStatus: (_id, _status) => Effect.succeed({ ...payment, status: "PAID" }),
              listByOrderId: () => Effect.die("unexpected"),
            })
          )
        )
      )
    )

    it.effect("fails with PaymentNotFoundError when payment does not exist", () =>
      Effect.gen(function* () {
        const program = Effect.gen(function* () {
          const service = yield* PaymentService
          return yield* service.updateStatus("missing-id", "PAID")
        }).pipe(Effect.either)

        const result = yield* program
        assertLeft(result, new PaymentNotFoundError({ id: "missing-id", message: "Not found" }))
      }).pipe(
        Effect.provide(
          buildTestLayer(
            PaymentRepository.of({
              create: () => Effect.die("unexpected"),
              listAll: () => Effect.die("unexpected"),
              getById: () => Effect.die("unexpected"),
              updateStatus: (id) =>
                Effect.fail(new RecordNotFoundError({ model: "Payment", id, message: "Not found" })),
              listByOrderId: () => Effect.die("unexpected"),
            })
          )
        )
      )
    )
  })

  describe("listByOrderId", () => {
    it.effect("returns payments for the order", () =>
      Effect.gen(function* () {
        const service = yield* PaymentService
        const result = yield* service.listByOrderId("order-abc")
        expect(result).toHaveLength(1)
        expect(result[0].orderId).toBe("order-abc")
      }).pipe(
        Effect.provide(
          buildTestLayer(
            PaymentRepository.of({
              create: () => Effect.die("unexpected"),
              listAll: () => Effect.die("unexpected"),
              getById: () => Effect.die("unexpected"),
              updateStatus: () => Effect.die("unexpected"),
              listByOrderId: () => Effect.succeed([payment]),
            })
          )
        )
      )
    )
  })
})
