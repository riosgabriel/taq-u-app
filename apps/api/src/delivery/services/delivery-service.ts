import { PersistenceError } from "@/persistence-errors"
import { Context, Data, Effect, Layer } from "effect"
import Delivery from "delivery/domain/delivery"
import { transitionDelivery } from "delivery/domain/delivery-status"
import { AssignDeliveryDriverInput, CreateDeliveryInput, UpdateDeliveryStatusInput } from "delivery/dto/delivery-dto"
import { DeliveryRepository } from "delivery/repository/delivery-repository"
import { DriverNotFoundError, DriverService } from "delivery/services/driver-service"
import { EventPublisher } from "events/event-publisher"
import { PrismaService } from "prisma-service"

export class DeliveryNotFoundError extends Data.TaggedError("delivery/DeliveryNotFoundError")<{
  readonly deliveryId: string
  readonly message: string
}> {}

export class RouteNotFoundError extends Data.TaggedError("delivery/RouteNotFoundError")<{
  readonly routeId: string
  readonly message: string
}> {}

export class DeliveryStatusError extends Data.TaggedError("delivery/DeliveryStatusError")<{
  readonly deliveryId: string
  readonly currentStatus: string
  readonly message: string
}> {}

export class DeliveryService extends Context.Tag("delivery/DeliveryService")<
  DeliveryService,
  {
    readonly createDelivery: (
      input: CreateDeliveryInput
    ) => Effect.Effect<Delivery, RouteNotFoundError | DriverNotFoundError | PersistenceError>
    readonly listDeliveries: () => Effect.Effect<Delivery[], PersistenceError>
    readonly getDeliveryById: (id: string) => Effect.Effect<Delivery, DeliveryNotFoundError | PersistenceError>
    readonly updateStatus: (
      id: string,
      input: UpdateDeliveryStatusInput
    ) => Effect.Effect<Delivery, DeliveryNotFoundError | DeliveryStatusError | PersistenceError>
    readonly assignDriver: (
      id: string,
      input: AssignDeliveryDriverInput
    ) => Effect.Effect<Delivery, DeliveryNotFoundError | DriverNotFoundError | PersistenceError>
  }
>() {}

export const DeliveryServiceLive = Layer.effect(
  DeliveryService,
  Effect.gen(function* () {
    const deliveryRepository = yield* DeliveryRepository
    const driverService = yield* DriverService
    const eventPublisher = yield* EventPublisher
    const prismaService = yield* PrismaService

    return DeliveryService.of({
      createDelivery: (input) => {
        return Effect.gen(function* () {
          yield* driverService.getById(input.driverId)
          yield* prismaService
            .execute(() => prismaService.prisma.route.findUnique({ where: { id: input.routeId } }))
            .pipe(
              Effect.flatMap((route) =>
                route
                  ? Effect.succeed(route)
                  : Effect.fail(
                      new RouteNotFoundError({
                        routeId: input.routeId,
                        message: `Route with id ${input.routeId} not found`,
                      })
                    )
              )
            )
          const result = yield* deliveryRepository.createDelivery(input)
          yield* eventPublisher.notify(result.events)
          return Delivery.fromDelivery(result.delivery)
        })
      },

      listDeliveries: () => {
        return deliveryRepository.listAll().pipe(Effect.map((rows) => rows.map(Delivery.fromDelivery)))
      },

      getDeliveryById: (id) => {
        return deliveryRepository.getById(id).pipe(
          Effect.map(Delivery.fromDelivery),
          Effect.catchTag("order/RecordNotFoundError", (error) =>
            Effect.fail(new DeliveryNotFoundError({ deliveryId: id, message: error.message }))
          )
        )
      },

      updateStatus: (id, input) => {
        return Effect.gen(function* () {
          const existing = yield* deliveryRepository
            .getById(id)
            .pipe(
              Effect.catchTag("order/RecordNotFoundError", (error) =>
                Effect.fail(new DeliveryNotFoundError({ deliveryId: id, message: error.message }))
              )
            )
          const validated = yield* transitionDelivery(existing.status, input.status)
          const result = yield* deliveryRepository.updateStatus(id, validated)
          yield* eventPublisher.notify(result.events)
          return Delivery.fromDelivery(result.delivery)
        }).pipe(
          Effect.catchTag("delivery/InvalidDeliveryTransitionError", (error) =>
            Effect.fail(
              new DeliveryStatusError({
                deliveryId: id,
                currentStatus: error.currentStatus,
                message: error.message,
              })
            )
          )
        )
      },

      assignDriver: (id, input) => {
        return Effect.gen(function* () {
          yield* deliveryRepository
            .getById(id)
            .pipe(
              Effect.catchTag("order/RecordNotFoundError", (error) =>
                Effect.fail(new DeliveryNotFoundError({ deliveryId: id, message: error.message }))
              )
            )
          yield* driverService.getById(input.driverId)
          const result = yield* deliveryRepository.assignDriver(id, input.driverId)
          yield* eventPublisher.notify(result.events)
          return Delivery.fromDelivery(result.delivery)
        })
      },
    })
  })
)
