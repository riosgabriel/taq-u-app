import { PersistenceError } from "@/persistence-errors"
import { Context, Data, Effect, Layer } from "effect"
import { CalculateEstimateInput } from "estimate/dto/estimate-dto"
import { calculateEstimate, Estimate, ServiceLevel } from "estimate/domain/estimate"
import { EstimateRepository } from "estimate/repository/estimate-repository"

export class EstimateNotFoundError extends Data.TaggedError("estimate/EstimateNotFoundError")<{
  readonly id: string
  readonly message: string
}> {}

export class EstimateService extends Context.Tag("estimate/EstimateService")<
  EstimateService,
  {
    readonly calculate: (input: CalculateEstimateInput) => Effect.Effect<
      {
        estimatedCost: number
        currency: string
        estimatedDeliveryTime: Date
      },
      never
    >
    readonly create: (input: CalculateEstimateInput) => Effect.Effect<Estimate, PersistenceError>
    readonly getById: (id: string) => Effect.Effect<Estimate, EstimateNotFoundError | PersistenceError>
    readonly listByOrderId: (orderId: string) => Effect.Effect<Array<Estimate>, PersistenceError>
  }
>() {}

export const EstimateServiceLive = Layer.effect(
  EstimateService,
  Effect.gen(function* () {
    const repository = yield* EstimateRepository

    return EstimateService.of({
      calculate: (input) => {
        return Effect.sync(() =>
          calculateEstimate(
            {
              weightKg: input.weightKg,
              serviceLevel: input.serviceLevel as ServiceLevel,
              insured: input.insured,
              distanceKm: input.distanceKm,
            },
            new Date()
          )
        )
      },

      create: (input) => {
        return Effect.gen(function* () {
          const calculation = yield* Effect.sync(() =>
            calculateEstimate(
              {
                weightKg: input.weightKg,
                serviceLevel: input.serviceLevel as ServiceLevel,
                insured: input.insured,
                distanceKm: input.distanceKm,
              },
              new Date()
            )
          )
          const estimate = yield* repository.create(input, calculation)
          return Estimate.fromPrisma(estimate)
        })
      },

      getById: (id) => {
        return repository.getById(id).pipe(
          Effect.map((estimate) => Estimate.fromPrisma(estimate)),
          Effect.catchTag("order/RecordNotFoundError", (error) =>
            Effect.fail(new EstimateNotFoundError({ id, message: error.message }))
          )
        )
      },

      listByOrderId: (orderId) => {
        return repository
          .listByOrderId(orderId)
          .pipe(Effect.map((estimates) => estimates.map((estimate) => Estimate.fromPrisma(estimate))))
      },
    })
  })
)
