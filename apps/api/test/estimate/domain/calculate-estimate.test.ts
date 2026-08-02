import { describe, expect, it } from "@effect/vitest"
import { calculateEstimate } from "estimate/domain/estimate"

const NOW = new Date("2026-09-01T12:00:00Z")

describe("calculateEstimate", () => {
  describe("base cost", () => {
    it("applies base fee + per-kg rate for STANDARD with no insurance", () => {
      // (5 + 1 * 2) * 1.0 = 7.00
      const result = calculateEstimate({ weightKg: 1, serviceLevel: "STANDARD", insured: false }, NOW)
      expect(result.estimatedCost).toBe(7.0)
      expect(result.currency).toBe("USD")
    })

    it("scales linearly with weight", () => {
      // (5 + 10 * 2) * 1.0 = 25.00
      const result = calculateEstimate({ weightKg: 10, serviceLevel: "STANDARD", insured: false }, NOW)
      expect(result.estimatedCost).toBe(25.0)
    })
  })

  describe("service level multipliers", () => {
    it("STANDARD multiplier is 1.0", () => {
      const result = calculateEstimate({ weightKg: 1, serviceLevel: "STANDARD", insured: false }, NOW)
      // (5 + 1 * 2) * 1.0 = 7.00
      expect(result.estimatedCost).toBe(7.0)
    })

    it("EXPRESS multiplier is 1.5", () => {
      const result = calculateEstimate({ weightKg: 1, serviceLevel: "EXPRESS", insured: false }, NOW)
      // (5 + 1 * 2) * 1.5 = 10.50
      expect(result.estimatedCost).toBe(10.5)
    })

    it("OVERNIGHT multiplier is 2.5", () => {
      const result = calculateEstimate({ weightKg: 1, serviceLevel: "OVERNIGHT", insured: false }, NOW)
      // (5 + 1 * 2) * 2.5 = 17.50
      expect(result.estimatedCost).toBe(17.5)
    })
  })

  describe("insurance surcharge", () => {
    it("adds 1% of the subtotal when insured", () => {
      const result = calculateEstimate({ weightKg: 1, serviceLevel: "EXPRESS", insured: true }, NOW)
      // subtotal = 10.50, surcharge = 10.50 * 0.01 = 0.105, total = 10.605 rounded to 10.61
      expect(result.estimatedCost).toBe(10.61)
    })

    it("does not add a surcharge when not insured", () => {
      const result = calculateEstimate({ weightKg: 1, serviceLevel: "EXPRESS", insured: false }, NOW)
      expect(result.estimatedCost).toBe(10.5)
    })
  })

  describe("currency", () => {
    it("always returns USD", () => {
      const result = calculateEstimate({ weightKg: 1, serviceLevel: "STANDARD", insured: false }, NOW)
      expect(result.currency).toBe("USD")
    })
  })

  describe("delivery time", () => {
    it("STANDARD delivers 5 days from now", () => {
      const result = calculateEstimate({ weightKg: 1, serviceLevel: "STANDARD", insured: false }, NOW)
      const expected = new Date("2026-09-06T12:00:00Z")
      expect(result.estimatedDeliveryTime.toISOString()).toBe(expected.toISOString())
    })

    it("EXPRESS delivers 2 days from now", () => {
      const result = calculateEstimate({ weightKg: 1, serviceLevel: "EXPRESS", insured: false }, NOW)
      const expected = new Date("2026-09-03T12:00:00Z")
      expect(result.estimatedDeliveryTime.toISOString()).toBe(expected.toISOString())
    })

    it("OVERNIGHT delivers 1 day from now", () => {
      const result = calculateEstimate({ weightKg: 1, serviceLevel: "OVERNIGHT", insured: false }, NOW)
      const expected = new Date("2026-09-02T12:00:00Z")
      expect(result.estimatedDeliveryTime.toISOString()).toBe(expected.toISOString())
    })
  })

  describe("distance factor", () => {
    it("omitting distance preserves the weight-only cost", () => {
      // (5 + 10 * 2) * 1.0 = 25.00 — same as the weight-only test
      const result = calculateEstimate(
        { weightKg: 10, serviceLevel: "STANDARD", insured: false },
        NOW
      )
      expect(result.estimatedCost).toBe(25.0)
    })

    it("distance adds a per-km surcharge to the base cost", () => {
      // (5 + 1 * 2 + 100 * 0.5) * 1.0 = 57.00
      const result = calculateEstimate(
        { weightKg: 1, serviceLevel: "STANDARD", insured: false, distanceKm: 100 },
        NOW
      )
      expect(result.estimatedCost).toBe(57.0)
    })

    it("distance compounds with the service multiplier", () => {
      // (5 + 1 * 2 + 100 * 0.5) * 1.5 = 85.50
      const result = calculateEstimate(
        { weightKg: 1, serviceLevel: "EXPRESS", insured: false, distanceKm: 100 },
        NOW
      )
      expect(result.estimatedCost).toBe(85.5)
    })

    it("distance interacts with insurance the same way weight does", () => {
      // subtotal = (5 + 1 * 2 + 100 * 0.5) * 1.0 = 57.00
      // surcharge = 57.00 * 0.01 = 0.57
      // total = 57.57
      const result = calculateEstimate(
        { weightKg: 1, serviceLevel: "STANDARD", insured: true, distanceKm: 100 },
        NOW
      )
      expect(result.estimatedCost).toBe(57.57)
    })

    it("delivery time adds ceil(distanceKm / 500) days to the base", () => {
      // STANDARD base = 5 days. 1000 km -> ceil(1000/500) = 2 days -> 7 days.
      const result = calculateEstimate(
        { weightKg: 1, serviceLevel: "STANDARD", insured: false, distanceKm: 1000 },
        NOW
      )
      const expected = new Date("2026-09-08T12:00:00Z")
      expect(result.estimatedDeliveryTime.toISOString()).toBe(expected.toISOString())
    })

    it("distance and service level combine for delivery time", () => {
      // EXPRESS base = 2 days. 2500 km -> ceil(2500/500) = 5 days -> 7 days.
      const result = calculateEstimate(
        { weightKg: 1, serviceLevel: "EXPRESS", insured: false, distanceKm: 2500 },
        NOW
      )
      const expected = new Date("2026-09-08T12:00:00Z")
      expect(result.estimatedDeliveryTime.toISOString()).toBe(expected.toISOString())
    })

    it("distance of 0 adds no extra days", () => {
      // STANDARD base = 5 days, distance 0 -> 5 days (unchanged from the no-distance case).
      const result = calculateEstimate(
        { weightKg: 1, serviceLevel: "STANDARD", insured: false, distanceKm: 0 },
        NOW
      )
      const expected = new Date("2026-09-06T12:00:00Z")
      expect(result.estimatedDeliveryTime.toISOString()).toBe(expected.toISOString())
    })
  })

  describe("determinism", () => {
    it("returns the same result when called twice with the same inputs", () => {
      const a = calculateEstimate({ weightKg: 3.5, serviceLevel: "EXPRESS", insured: true }, NOW)
      const b = calculateEstimate({ weightKg: 3.5, serviceLevel: "EXPRESS", insured: true }, NOW)
      expect(a.estimatedCost).toBe(b.estimatedCost)
      expect(a.estimatedDeliveryTime.toISOString()).toBe(b.estimatedDeliveryTime.toISOString())
    })
  })
})
