import { describe, expect, it } from "@effect/vitest"
import { Effect, Schema } from "effect"
import { DriverAssignedPayload } from "events/domain-event"

describe("DriverAssignedPayload", () => {
  const FIXED = new Date("2026-01-01T10:00:00.000Z")

  it("decodes a Date instance for assignedAt", () => {
    const result = Schema.decodeUnknownSync(DriverAssignedPayload)({
      orderId: "order-1",
      driverId: "driver-1",
      assignedAt: FIXED,
    })
    expect(result.assignedAt).toBeInstanceOf(Date)
    expect(result.assignedAt.getTime()).toBe(FIXED.getTime())
  })

  it("decodes an ISO string for assignedAt", () => {
    const result = Schema.decodeUnknownSync(DriverAssignedPayload)({
      orderId: "order-1",
      driverId: "driver-1",
      assignedAt: "2026-01-01T10:00:00.000Z",
    })
    expect(result.assignedAt).toBeInstanceOf(Date)
    expect(result.assignedAt.getTime()).toBe(FIXED.getTime())
  })

  it("decodes a JSON round-trip of the payload (Prisma JSON column shape)", () => {
    const roundTripped = JSON.parse(JSON.stringify({ orderId: "order-1", driverId: "driver-1", assignedAt: FIXED }))
    const result = Schema.decodeUnknownSync(DriverAssignedPayload)(roundTripped)
    expect(result.assignedAt).toBeInstanceOf(Date)
    expect(result.assignedAt.getTime()).toBe(FIXED.getTime())
    expect(result.orderId).toBe("order-1")
    expect(result.driverId).toBe("driver-1")
  })

  it("rejects a numeric assignedAt", () => {
    const result = Effect.runSync(
      Effect.either(
        Schema.decodeUnknown(DriverAssignedPayload)({
          orderId: "order-1",
          driverId: "driver-1",
          assignedAt: 1234567890,
        })
      )
    )
    expect(result._tag).toBe("Left")
  })

  it("rejects a non-date assignedAt string", () => {
    const result = Effect.runSync(
      Effect.either(
        Schema.decodeUnknown(DriverAssignedPayload)({
          orderId: "order-1",
          driverId: "driver-1",
          assignedAt: "not-a-date",
        })
      )
    )
    expect(result._tag).toBe("Left")
  })

  it("rejects an invalid Date instance for assignedAt", () => {
    const result = Effect.runSync(
      Effect.either(
        Schema.decodeUnknown(DriverAssignedPayload)({
          orderId: "order-1",
          driverId: "driver-1",
          assignedAt: new Date("invalid"),
        })
      )
    )
    expect(result._tag).toBe("Left")
  })

  it("rejects a payload missing assignedAt", () => {
    const result = Effect.runSync(
      Effect.either(
        Schema.decodeUnknown(DriverAssignedPayload)({
          orderId: "order-1",
          driverId: "driver-1",
        })
      )
    )
    expect(result._tag).toBe("Left")
  })
})
