import { describe, expect, it } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { CalculateEstimateInput } from "estimate/dto/estimate-dto"
import { EstimateRepository } from "estimate/repository/estimate-repository"
import { EstimateService, EstimateServiceLive } from "estimate/services/estimate-service"

const baseInput: CalculateEstimateInput = {
  weightKg: 1,
  serviceLevel: "STANDARD",
  insured: false,
}

const mockRepo = EstimateRepository.of({
  create: () => Effect.die("not used"),
  getById: () => Effect.die("not used"),
  listByOrderId: () => Effect.die("not used"),
})

const testLayer = EstimateServiceLive.pipe(Layer.provide(Layer.succeed(EstimateRepository, mockRepo)))

describe("EstimateService", () => {
  describe("calculate", () => {
    it.effect("includes distance in the cost when distanceKm is supplied", () =>
      Effect.gen(function* () {
        const service = yield* EstimateService
        const withoutDistance = yield* service.calculate(baseInput)
        const withDistance = yield* service.calculate({ ...baseInput, distanceKm: 100 })
        // The pure formula adds DISTANCE_RATE_PER_KM * 100 = 50 to the
        // base cost when distanceKm = 100. If the service drops
        // distanceKm (the previous bug), withDistance would equal
        // withoutDistance.
        expect(withDistance.estimatedCost).toBeGreaterThan(withoutDistance.estimatedCost)
      }).pipe(Effect.provide(testLayer))
    )

    it.effect("without distanceKm, the cost matches the weight-only formula", () =>
      Effect.gen(function* () {
        const service = yield* EstimateService
        const result = yield* service.calculate(baseInput)
        // (5 + 1 * 2) * 1.0 = 7.00, no insurance, no distance
        expect(result.estimatedCost).toBe(7.0)
      }).pipe(Effect.provide(testLayer))
    )
  })

  describe("create", () => {
    it.effect("includes distance in the persisted cost when distanceKm is supplied", () => {
      const captured: { cost: number | null } = { cost: null }
      const capturingMock = EstimateRepository.of({
        create: (_input, calculation) => {
          captured.cost = calculation.estimatedCost
          return Effect.succeed({
            id: "est-1",
            estimatedCost: calculation.estimatedCost,
            currency: calculation.currency,
            estimatedDeliveryTime: calculation.estimatedDeliveryTime,
            orderId: null,
          })
        },
        getById: () => Effect.die("not used"),
        listByOrderId: () => Effect.die("not used"),
      })
      const layer = EstimateServiceLive.pipe(Layer.provide(Layer.succeed(EstimateRepository, capturingMock)))
      return Effect.gen(function* () {
        const service = yield* EstimateService
        yield* service.create({ ...baseInput, distanceKm: 100 })
        // The pure formula adds 100 km at DISTANCE_RATE_PER_KM each
        // to the base cost. If the service drops distanceKm (the
        // previous bug), the cost would match the no-distance result
        // (7.0).
        expect(captured.cost).toBeGreaterThan(7.0)
      }).pipe(Effect.provide(layer))
    })
  })
})
