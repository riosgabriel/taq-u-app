import { PersistenceError, RecordNotFoundError } from "@/persistence-errors"
import { DeliveryId, DriverId, OrderId } from "@/ids"
import { Delivery, DeliveryStatus, Prisma } from "@prisma/client"
import { Context, Effect, Either, Layer } from "effect"
import { ValidatedDeliveryStatus } from "delivery/domain/delivery-status"
import { CreateDeliveryInput } from "delivery/dto/delivery-dto"
import { DriverNotAvailableError, DriverNotFoundError, OrderNotAssignableError } from "delivery/domain/driver-errors"
import { DomainEvent } from "events/domain-event"
import { EventPublisher } from "events/event-publisher"
import { PrismaService } from "prisma-service"

const deliveryNotFound = (id: string) =>
  new RecordNotFoundError({ model: "Delivery", id, message: `Delivery with id ${id} not found` })

const deliveryWithDetailsInclude = {
  driver: true,
  route: { include: { pickup: true, dropoff: true } },
  orders: { include: { packages: true } },
} satisfies Prisma.DeliveryInclude

export type DeliveryWithDetails = Prisma.DeliveryGetPayload<{
  include: typeof deliveryWithDetailsInclude
}>

export type CreateDeliveryResult = {
  readonly delivery: Delivery
  readonly events: ReadonlyArray<DomainEvent>
}

export class DeliveryRepository extends Context.Tag("delivery/DeliveryRepository")<
  DeliveryRepository,
  {
    readonly createDelivery: (input: CreateDeliveryInput) => Effect.Effect<CreateDeliveryResult, PersistenceError>
    readonly createAssignment: (
      orderId: OrderId,
      driverId: DriverId,
      assignedAt: Date
    ) => Effect.Effect<
      CreateDeliveryResult,
      DriverNotFoundError | DriverNotAvailableError | OrderNotAssignableError | PersistenceError
    >
    readonly listAll: () => Effect.Effect<Array<Delivery>, PersistenceError>
    readonly listWithDetails: () => Effect.Effect<Array<DeliveryWithDetails>, PersistenceError>
    readonly getById: (id: DeliveryId) => Effect.Effect<Delivery, PersistenceError>
    readonly updateStatus: (
      id: DeliveryId,
      status: ValidatedDeliveryStatus
    ) => Effect.Effect<{ delivery: Delivery; events: ReadonlyArray<DomainEvent> }, PersistenceError>
    readonly assignDriver: (
      id: DeliveryId,
      newDriverId: DriverId,
      previousDriverId: DriverId
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
        return prismaService.$transaction(async (tx) => {
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

          return Either.right({ delivery: created, events: written })
        })
      },

      createAssignment: (orderId: OrderId, driverId: DriverId, assignedAt: Date) =>
        prismaService.$transaction(
          async (
            tx
          ): Promise<
            Either.Either<
              CreateDeliveryResult,
              RecordNotFoundError | OrderNotAssignableError | DriverNotFoundError | DriverNotAvailableError
            >
          > => {
            const order = await tx.order.findUnique({
              where: { id: orderId },
              select: { status: true },
            })

            if (!order) {
              return Either.left(
                new RecordNotFoundError({ model: "Order", id: orderId, message: `Order ${orderId} not found` })
              )
            }
            if (order.status !== "PENDING") {
              return Either.left(
                new OrderNotAssignableError({
                  orderId,
                  currentStatus: order.status,
                  message: `Order ${orderId} is not assignable (current status: ${order.status})`,
                })
              )
            }

            const claim = await tx.driver.updateMany({
              where: { id: driverId, isAvailable: true },
              data: { isAvailable: false },
            })

            if (claim.count === 0) {
              const driver = await tx.driver.findUnique({ where: { id: driverId } })
              if (!driver) {
                return Either.left(new DriverNotFoundError({ id: driverId, message: `Driver ${driverId} not found` }))
              }
              return Either.left(
                new DriverNotAvailableError({ id: driverId, message: `Driver ${driverId} is not available` })
              )
            }

            const created = await tx.delivery.create({
              data: {
                driver: { connect: { id: driverId } },
                orders: { connect: [{ id: orderId }] },
                status: DeliveryStatus.ASSIGNED,
              },
            })

            const event: DomainEvent = {
              type: "DriverAssigned",
              streamId: `order:${orderId}`,
              payload: { orderId, driverId, assignedAt },
            }
            const written = await eventPublisher.writeInTransaction(tx, [event])

            return Either.right({ delivery: created, events: written })
          }
        ),
      listAll: () => {
        return prismaService.execute(() => prismaService.prisma.delivery.findMany())
      },

      listWithDetails: () => {
        return prismaService.execute(() =>
          prismaService.prisma.delivery.findMany({ include: deliveryWithDetailsInclude })
        )
      },

      getById: (id: DeliveryId) => {
        return prismaService
          .execute(() => prismaService.prisma.delivery.findUnique({ where: { id } }))
          .pipe(Effect.flatMap((delivery) => (delivery ? Effect.succeed(delivery) : Effect.fail(deliveryNotFound(id)))))
      },

      updateStatus: (id: DeliveryId, status: ValidatedDeliveryStatus) => {
        return prismaService.$transaction(async (tx) => {
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

          return Either.right({ delivery: updated, events: written })
        })
      },

      assignDriver: (id: DeliveryId, newDriverId: DriverId, previousDriverId: DriverId) => {
        return prismaService.$transaction(async (tx) => {
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

          return Either.right({ delivery: updated, events: written })
        })
      },
    })
  })
)
