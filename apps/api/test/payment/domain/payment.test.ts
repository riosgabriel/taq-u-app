import { describe, expect, it } from "@effect/vitest"
import { Schema } from "effect"
import {
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  Payment,
  type PaymentMethod,
  type PaymentStatus,
} from "payment/domain/payment"

const base = {
  id: "pay-123",
  amount: 49.99,
  currency: "USD",
  timestamp: "2026-09-01T12:00:00.000Z",
  transactionId: null,
  orderId: "order-abc",
}

const decode = (input: unknown) => Schema.decodeUnknownSync(Payment)(input)

describe("Payment domain schema", () => {
  it("accepts a known method and status", () => {
    const payment = decode({ ...base, method: "CREDIT_CARD", status: "PENDING" })
    expect(payment.method).toBe("CREDIT_CARD")
    expect(payment.status).toBe("PENDING")
  })

  it("rejects an unknown method", () => {
    expect(() => decode({ ...base, method: "WIRE_TRANSFER", status: "PENDING" })).toThrow()
  })

  it("rejects an unknown status", () => {
    expect(() => decode({ ...base, method: "CREDIT_CARD", status: "UNKNOWN" })).toThrow()
  })
})

describe("domain enum types", () => {
  it("exposes PaymentMethod and PaymentStatus types derived from the const arrays", () => {
    const method: PaymentMethod = "CREDIT_CARD"
    const status: PaymentStatus = "PAID"
    expect(PAYMENT_METHODS).toContain(method)
    expect(PAYMENT_STATUSES).toContain(status)
  })

  it("defines the canonical payment methods", () => {
    expect([...PAYMENT_METHODS]).toEqual(["CREDIT_CARD", "CASH", "BANK_TRANSFER", "MOBILE"])
  })

  it("defines the canonical payment statuses", () => {
    expect([...PAYMENT_STATUSES]).toEqual(["PENDING", "PAID", "REFUNDED", "FAILED"])
  })
})
