import { PersistenceError, RecordNotFoundError } from "@/persistence-errors"
import { RouteId } from "@/ids"
import { Context, Effect, Either, Layer } from "effect"
import { AddRouteLegInput, RouteCreateInput, RouteUpdateInput } from "route/dto/route-dto"
import { RouteWithLegs } from "route/domain/route"
import { PrismaService } from "prisma-service"

const routeNotFound = (id: string) =>
  new RecordNotFoundError({ model: "Route", id, message: `Route with id ${id} not found` })

export class RouteRepository extends Context.Tag("route/RouteRepository")<
  RouteRepository,
  {
    readonly create: (input: RouteCreateInput) => Effect.Effect<RouteWithLegs, PersistenceError>
    readonly listAll: () => Effect.Effect<Array<RouteWithLegs>, PersistenceError>
    readonly getById: (id: RouteId) => Effect.Effect<RouteWithLegs, PersistenceError>
    readonly update: (id: RouteId, input: RouteUpdateInput) => Effect.Effect<RouteWithLegs, PersistenceError>
    readonly delete: (id: RouteId) => Effect.Effect<RouteWithLegs, PersistenceError>
    readonly addLeg: (routeId: RouteId, input: AddRouteLegInput) => Effect.Effect<RouteWithLegs, PersistenceError>
  }
>() {}

export const RouteRepositoryLive = Layer.effect(
  RouteRepository,
  Effect.gen(function* () {
    const prismaService = yield* PrismaService

    return RouteRepository.of({
      create: (input: RouteCreateInput) => {
        return prismaService.$transaction(async (tx) => {
          return Either.right(
            await tx.route.create({
              data: {
                pickup: { connect: { id: input.pickupId } },
                dropoff: { connect: { id: input.dropoffId } },
                carrier: input.carrierId ? { connect: { id: input.carrierId } } : undefined,
                legs: input.legs
                  ? {
                      createMany: {
                        data: input.legs.map((leg) => ({
                          transportMode: leg.transportMode,
                          pickupLocationId: leg.pickupLocationId,
                          dropoffLocationId: leg.dropoffLocationId,
                          carrierId: leg.carrierId,
                          startTime: leg.startTime,
                          endTime: leg.endTime,
                        })),
                      },
                    }
                  : undefined,
              },
              include: { legs: true },
            })
          )
        })
      },

      listAll: () => {
        return prismaService.execute(() =>
          prismaService.prisma.route.findMany({
            include: { legs: true },
          })
        )
      },

      getById: (id: RouteId) => {
        return prismaService
          .execute(() =>
            prismaService.prisma.route.findUnique({
              where: { id },
              include: { legs: true },
            })
          )
          .pipe(Effect.flatMap((route) => (route ? Effect.succeed(route) : Effect.fail(routeNotFound(id)))))
      },

      update: (id: RouteId, input: RouteUpdateInput) => {
        return prismaService.execute(() =>
          prismaService.prisma.route.update({
            where: { id },
            data: {
              pickupId: input.pickupId,
              dropoffId: input.dropoffId,
              carrierId: input.carrierId,
            },
            include: { legs: true },
          })
        )
      },

      delete: (id: RouteId) => {
        return prismaService.execute(() =>
          prismaService.prisma.route.delete({
            where: { id },
            include: { legs: true },
          })
        )
      },

      addLeg: (routeId: RouteId, input: AddRouteLegInput) => {
        return prismaService.$transaction(async (tx) => {
          await tx.routeLeg.create({
            data: {
              route: { connect: { id: routeId } },
              transportMode: input.transportMode,
              pickupPoint: { connect: { id: input.pickupLocationId } },
              dropoffPoint: { connect: { id: input.dropoffLocationId } },
              carrier: input.carrierId ? { connect: { id: input.carrierId } } : undefined,
              startTime: input.startTime,
              endTime: input.endTime,
            },
          })

          return Either.right(
            await tx.route.findUniqueOrThrow({
              where: { id: routeId },
              include: { legs: true },
            })
          )
        })
      },
    })
  })
)
