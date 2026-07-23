import { PersistenceError, RecordNotFoundError } from "@/persistence-errors"
import { Delivery, DeliveryStatus } from "@prisma/client"
import { Context, Effect, Layer } from "effect"
import { ValidatedDeliveryStatus } from "delivery/domain/delivery-status"
import { CreateDeliveryInput } from "delivery/dto/delivery-dto"
import { DomainEvent } from "events/domain-event"
import { EventPublisher } from "events/event-publisher"
import { PrismaService } from "prisma-service"

const deliveryNotFound = (id: string) =>
  new RecordNotFoundError({ model: "Delivery", id, message: `Delivery with id ${id} not found` })

export type CreateDeliveryResult = {
  readonly delivery: Delivery
  readonly events: ReadonlyArray<DomainEvent>
}

export class DeliveryRepository extends Context.Tag("delivery/DeliveryRepository")<
  DeliveryRepository,
  {
    readonly createDelivery: (input: CreateDeliveryInput) => Effect.Effect<CreateDeliveryResult, PersistenceError>
    readonly listAll: () => Effect.Effect<Array<Delivery>, PersistenceError>
    readonly getById: (id: string) => Effect.Effect<Delivery, PersistenceError>
    readonly updateStatus: (
      id: string,
      status: ValidatedDeliveryStatus
    ) => Effect.Effect<{ delivery: Delivery; events: ReadonlyArray<DomainEvent> }, PersistenceError>
    readonly assignDriver: (
      id: string,
      newDriverId: string,
      previousDriverId: string
    ) => Effect.Effect<{ delivery: Delivery; events: ReadonlyArray<DomainEvent> }, PersistenceError>
  }
>() {}

export type DeliveryRepositoryShape = Context.Tag.Service<DeliveryRepository>

export const DeliveryRepositoryLive = Layer.effect(
  DeliveryRepository,
  Effect.gen(function* () {
    const prismaService = yield* PrismaService
    const eventPublisher = yield* EventPublisher

    return DeliveryRepository.of({
      createDelivery: (input: CreateDeliveryInput) => {
        return Effect.gen(function* () {
          const { delivery, events } = yield* prismaService.$transaction(async (tx) => {
            const created = await tx.delivery.create({
              data: {
                driver: { connect: { id: input.driverId } },
                route: { connect: { id: input.routeId } },
                orders: input.orderIds ? { connect: input.orderIds.map((id) => ({ id })) } : undefined,
                estimatedPickupTime: input.estimatedPickupTime,
                estimatedDeliveryTime: input.estimatedDeliveryTime,
                status: DeliveryStatus.ASSIGNED,
              },
            })

            const event: DomainEvent = {
              type: "DeliveryCreated",
              streamId: `delivery:${created.id}`,
              payload: {
                deliveryId: created.id,
                driverId: created.driverId,
                routeId: created.routeId,
                orderIds: input.orderIds ?? [],
              },
            }
            const written = await eventPublisher.writeInTransaction(tx, [event])

            return { delivery: created, events: written }
          })

          return { delivery, events }
        })
      },

      listAll: () => {
        return prismaService.execute(() => prismaService.prisma.delivery.findMany())
      },

      getById: (id: string) => {
        return prismaService
          .execute(() => prismaService.prisma.delivery.findUnique({ where: { id } }))
          .pipe(Effect.flatMap((delivery) => (delivery ? Effect.succeed(delivery) : Effect.fail(deliveryNotFound(id)))))
      },

      updateStatus: (id: string, status: ValidatedDeliveryStatus) => {
        return Effect.gen(function* () {
          const result = yield* prismaService.$transaction(async (tx) => {
            const updated = await tx.delivery.update({
              where: { id },
              data: { status },
            })

            const event: DomainEvent = {
              type: "DeliveryStatusChanged",
              streamId: `delivery:${updated.id}`,
              payload: { deliveryId: updated.id, status: updated.status },
            }
            const written = await eventPublisher.writeInTransaction(tx, [event])

            return { delivery: updated, events: written }
          })

          return result
        })
      },

      assignDriver: (id: string, newDriverId: string, previousDriverId: string) => {
        return Effect.gen(function* () {
          const result = yield* prismaService.$transaction(async (tx) => {
            const updated = await tx.delivery.update({
              where: { id },
              data: { driverId: newDriverId },
            })

            const event: DomainEvent = {
              type: "DeliveryDriverReassigned",
              streamId: `delivery:${updated.id}`,
              payload: { deliveryId: updated.id, previousDriverId, newDriverId: updated.driverId },
            }
            const written = await eventPublisher.writeInTransaction(tx, [event])

            return { delivery: updated, events: written }
          })

          return result
        })
      },
    })
  })
)
