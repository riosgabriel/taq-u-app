import { PersistenceError, RecordNotFoundError } from "@/persistence-errors"
import { Estimate } from "@prisma/client"
import { Context, Effect, Layer } from "effect"
import { CalculateEstimateInput } from "estimate/dto/estimate-dto"
import { PrismaService } from "prisma-service"

const estimateNotFound = (id: string) =>
  new RecordNotFoundError({ model: "Estimate", id, message: `Estimate with id ${id} not found` })

export class EstimateRepository extends Context.Tag("estimate/EstimateRepository")<
  EstimateRepository,
  {
    readonly create: (
      input: CalculateEstimateInput,
      calculation: { estimatedCost: number; currency: string; estimatedDeliveryTime: Date }
    ) => Effect.Effect<Estimate, PersistenceError>
    readonly getById: (id: string) => Effect.Effect<Estimate, PersistenceError>
    readonly listByOrderId: (orderId: string) => Effect.Effect<Array<Estimate>, PersistenceError>
  }
>() {}

export const EstimateRepositoryLive = Layer.effect(
  EstimateRepository,
  Effect.gen(function* () {
    const prismaService = yield* PrismaService

    return EstimateRepository.of({
      create: (input, calculation) => {
        return prismaService.execute(() =>
          prismaService.prisma.estimate.create({
            data: {
              estimatedCost: calculation.estimatedCost,
              currency: calculation.currency,
              estimatedDeliveryTime: calculation.estimatedDeliveryTime,
              order: input.orderId ? { connect: { id: input.orderId } } : undefined,
            },
          })
        )
      },

      getById: (id: string) => {
        return prismaService
          .execute(() => prismaService.prisma.estimate.findUnique({ where: { id } }))
          .pipe(Effect.flatMap((estimate) => (estimate ? Effect.succeed(estimate) : Effect.fail(estimateNotFound(id)))))
      },

      listByOrderId: (orderId: string) => {
        return prismaService.execute(() => prismaService.prisma.estimate.findMany({ where: { orderId } }))
      },
    })
  })
)
