import { OrderStatus } from "@prisma/client"
import { describe, expect, it } from "@effect/vitest"
import { canTransition, transition, ValidatedOrderStatus, validTargets } from "ordering/domain/order-status"
import { Effect, Exit } from "effect"

describe("OrderStatus state machine", () => {
  describe("canTransition", () => {
    it("PENDING → CONFIRMED is valid", () => {
      expect(canTransition(OrderStatus.PENDING, OrderStatus.CONFIRMED)).toBe(true)
    })

    it("PENDING → CANCELLED is valid", () => {
      expect(canTransition(OrderStatus.PENDING, OrderStatus.CANCELLED)).toBe(true)
    })

    it("PENDING → ASSIGNED is invalid (needs CONFIRMED first)", () => {
      expect(canTransition(OrderStatus.PENDING, OrderStatus.ASSIGNED)).toBe(false)
    })

    it("PENDING → COMPLETED is invalid", () => {
      expect(canTransition(OrderStatus.PENDING, OrderStatus.COMPLETED)).toBe(false)
    })

    it("CONFIRMED → ASSIGNED is valid", () => {
      expect(canTransition(OrderStatus.CONFIRMED, OrderStatus.ASSIGNED)).toBe(true)
    })

    it("CONFIRMED → CANCELLED is valid", () => {
      expect(canTransition(OrderStatus.CONFIRMED, OrderStatus.CANCELLED)).toBe(true)
    })

    it("CONFIRMED → PENDING is invalid (no reverse)", () => {
      expect(canTransition(OrderStatus.CONFIRMED, OrderStatus.PENDING)).toBe(false)
    })

    it("CONFIRMED → COMPLETED is invalid (needs IN_PROGRESS)", () => {
      expect(canTransition(OrderStatus.CONFIRMED, OrderStatus.COMPLETED)).toBe(false)
    })

    it("ASSIGNED → IN_PROGRESS is valid", () => {
      expect(canTransition(OrderStatus.ASSIGNED, OrderStatus.IN_PROGRESS)).toBe(true)
    })

    it("ASSIGNED → CANCELLED is valid", () => {
      expect(canTransition(OrderStatus.ASSIGNED, OrderStatus.CANCELLED)).toBe(true)
    })

    it("ASSIGNED → CONFIRMED is invalid (no reverse)", () => {
      expect(canTransition(OrderStatus.ASSIGNED, OrderStatus.CONFIRMED)).toBe(false)
    })

    it("ASSIGNED → COMPLETED is invalid (needs IN_PROGRESS)", () => {
      expect(canTransition(OrderStatus.ASSIGNED, OrderStatus.COMPLETED)).toBe(false)
    })

    it("IN_PROGRESS → COMPLETED is valid", () => {
      expect(canTransition(OrderStatus.IN_PROGRESS, OrderStatus.COMPLETED)).toBe(true)
    })

    it("IN_PROGRESS → CANCELLED is valid", () => {
      expect(canTransition(OrderStatus.IN_PROGRESS, OrderStatus.CANCELLED)).toBe(true)
    })

    it("IN_PROGRESS → ASSIGNED is invalid (no reverse)", () => {
      expect(canTransition(OrderStatus.IN_PROGRESS, OrderStatus.ASSIGNED)).toBe(false)
    })

    it("COMPLETED → nothing is valid (terminal state)", () => {
      expect(canTransition(OrderStatus.COMPLETED, OrderStatus.PENDING)).toBe(false)
      expect(canTransition(OrderStatus.COMPLETED, OrderStatus.CONFIRMED)).toBe(false)
      expect(canTransition(OrderStatus.COMPLETED, OrderStatus.ASSIGNED)).toBe(false)
      expect(canTransition(OrderStatus.COMPLETED, OrderStatus.IN_PROGRESS)).toBe(false)
      expect(canTransition(OrderStatus.COMPLETED, OrderStatus.CANCELLED)).toBe(false)
    })

    it("CANCELLED → nothing is valid (terminal state)", () => {
      expect(canTransition(OrderStatus.CANCELLED, OrderStatus.PENDING)).toBe(false)
      expect(canTransition(OrderStatus.CANCELLED, OrderStatus.CONFIRMED)).toBe(false)
      expect(canTransition(OrderStatus.CANCELLED, OrderStatus.ASSIGNED)).toBe(false)
      expect(canTransition(OrderStatus.CANCELLED, OrderStatus.IN_PROGRESS)).toBe(false)
      expect(canTransition(OrderStatus.CANCELLED, OrderStatus.COMPLETED)).toBe(false)
    })
  })

  describe("transition", () => {
    it.effect("returns a branded ValidatedOrderStatus for valid transitions", () =>
      Effect.gen(function* () {
        const result = yield* transition(OrderStatus.PENDING, OrderStatus.CONFIRMED)
        expect(result).toBe(OrderStatus.CONFIRMED)
        expect(ValidatedOrderStatus.is(result)).toBe(true)
      })
    )

    it.effect("fails with InvalidTransitionError for invalid transitions", () =>
      Effect.gen(function* () {
        const exit = yield* Effect.exit(transition(OrderStatus.PENDING, OrderStatus.COMPLETED))
        expect(Exit.isFailure(exit)).toBe(true)
      })
    )
  })

  describe("validTargets", () => {
    it("returns CONFIRMED and CANCELLED for PENDING", () => {
      const targets = validTargets(OrderStatus.PENDING)
      expect(targets.has(OrderStatus.CONFIRMED)).toBe(true)
      expect(targets.has(OrderStatus.CANCELLED)).toBe(true)
      expect(targets.size).toBe(2)
    })

    it("returns empty set for COMPLETED", () => {
      expect(validTargets(OrderStatus.COMPLETED).size).toBe(0)
    })

    it("returns empty set for CANCELLED", () => {
      expect(validTargets(OrderStatus.CANCELLED).size).toBe(0)
    })
  })
})
