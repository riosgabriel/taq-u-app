import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import { TrackingNumberService, TrackingNumberServiceLive } from "ordering/services/tracking-number-service"

const UUID_V7_PATTERN = /^TAQ-[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe("TrackingNumberService.generate", () => {
  const getService = () => Effect.runSync(TrackingNumberService.pipe(Effect.provide(TrackingNumberServiceLive)))

  it("returns a UUID v7 tracking number with the TAQ- prefix", () => {
    expect(getService().generate()).toMatch(UUID_V7_PATTERN)
  })

  it("generates unique tracking numbers", () => {
    const service = getService()
    const numbers = Array.from({ length: 1000 }, () => service.generate())
    expect(new Set(numbers).size).toBe(1000)
  })

  it("embeds a sortable millisecond timestamp in the prefix", () => {
    const before = Date.now()
    const trackingNumber = getService().generate()
    const after = Date.now()
    const hexTimestamp = trackingNumber.slice(4, 12) + trackingNumber.slice(13, 17)
    const timestamp = Number.parseInt(hexTimestamp, 16)
    expect(timestamp).toBeGreaterThanOrEqual(before)
    expect(timestamp).toBeLessThanOrEqual(after)
  })
})
