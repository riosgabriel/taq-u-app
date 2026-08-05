import { PersistenceError, RecordNotFoundError } from "@/persistence-errors"
import { OrderStatus, PackageStatus, Prisma } from "@prisma/client"
import { Context, Effect, Layer, Schema } from "effect"
import { DriverId, OrderId, PackageId } from "@/ids"
import { PrismaService } from "prisma-service"
import { EventPublisher } from "events/event-publisher"
import { DomainEvent } from "events/domain-event"
import { ValidatedOrderStatus } from "ordering/domain/order-status"
import { AddPackageInput, OrderCreateInput, OrderUpdateInput } from "ordering/dto/order-dto"
import { TrackingNumberService } from "ordering/services/tracking-number-service"

const orderNotFound = (orderId: string) =>
  new RecordNotFoundError({ model: "Order", id: orderId, message: `Order with id ${orderId} not found` })

export type CreateOrderResult = {
  readonly order: OrderWithPackages
  readonly events: ReadonlyArray<DomainEvent>
}

export class OrderRepository extends Context.Tag("order/OrderRepository")<
  OrderRepository,
  {
    readonly createOrder: (deliveryOrderInput: OrderCreateInput) => Effect.Effect<CreateOrderResult, PersistenceError>
    readonly getOrderById: (orderId: OrderId) => Effect.Effect<OrderWithPackages, PersistenceError>
    readonly listOrders: () => Effect.Effect<OrderWithPackages[], PersistenceError>
    readonly findByDriverId: (driverId: DriverId) => Effect.Effect<OrderWithPackages[], PersistenceError>
    readonly updateOrder: (
      orderId: OrderId,
      updateInput: OrderUpdateInput
    ) => Effect.Effect<OrderWithPackages, PersistenceError>
    readonly updateOrderStatus: (
      orderId: OrderId,
      status: ValidatedOrderStatus
    ) => Effect.Effect<OrderWithPackages, PersistenceError>
    readonly assignDriver: (
      orderId: OrderId,
      driverId: DriverId,
      assignedAt: Date,
      status: ValidatedOrderStatus
    ) => Effect.Effect<CreateOrderResult, PersistenceError>
    readonly addPackageToOrder: (
      orderId: OrderId,
      packageInput: AddPackageInput
    ) => Effect.Effect<OrderWithPackages, PersistenceError>
    readonly findPackageByTrackingNumber: (trackingNumber: string) => Effect.Effect<
      {
        package: { id: PackageId; trackingNumber: string; status: string }
        order: { id: OrderId; pickupAddress: string; deliveryAddress: string; pickupDate: Date; customerName: string }
      } | null,
      PersistenceError
    >
    readonly updatePackageStatus: (
      orderId: OrderId,
      packageId: PackageId,
      status: PackageStatus
    ) => Effect.Effect<OrderWithPackages, PersistenceError>
  }
>() {}

export type OrderRepositoryShape = Context.Tag.Service<OrderRepository>

const OrderWithPackages = Prisma.validator<Prisma.OrderDefaultArgs>()({
  include: { packages: true },
})

export type OrderWithPackages = Prisma.OrderGetPayload<typeof OrderWithPackages>

export const OrderRepositoryLive = Layer.effect(
  OrderRepository,
  Effect.gen(function* () {
    const prismaService = yield* PrismaService
    const trackingNumberService = yield* TrackingNumberService
    const eventPublisher = yield* EventPublisher

    const generateTrackingNumbersInTx = async (tx: Prisma.TransactionClient, count: number): Promise<string[]> => {
      const numbers: string[] = []
      for (let i = 0; i < count; i++) {
        numbers.push(await trackingNumberService.generateInTx(tx))
      }
      return numbers
    }

    return OrderRepository.of({
      createOrder: (orderInput: OrderCreateInput) => {
        return Effect.gen(function* () {
          const { order, events } = yield* prismaService.$transaction(async (tx) => {
            const trackingNumbers = await generateTrackingNumbersInTx(tx, orderInput.packages.length)

            const order = await tx.order.create({
              data: {
                customer: {
                  connect: {
                    id: orderInput.customerId,
                  },
                },
                packages: {
                  createMany: {
                    data: orderInput.packages.map((pkg, index) => ({
                      weightKg: pkg.weightKg,
                      dimensions: pkg.dimensions,
                      description: pkg.description,
                      fragile: pkg.fragile,
                      perishable: pkg.perishable,
                      insured: pkg.insured,
                      status: PackageStatus.AWAITING_PICKUP,
                      trackingNumber: trackingNumbers[index],
                    })),
                  },
                },
                pickupAddress: orderInput.pickupAddress,
                deliveryAddress: orderInput.deliveryAddress,
                pickupDate: orderInput.pickupDate,
                deliveryDate: orderInput.deliveryDate,
                specialInstructions: orderInput.specialInstructions,
                priority: orderInput.priority,
                status: OrderStatus.PENDING,
              },
              include: {
                packages: true,
              },
            })

            const orderEvent: DomainEvent = {
              type: "OrderCreated",
              streamId: `order:${order.id}`,
              payload: { orderId: order.id, customerId: order.customerId },
            }
            const written = await eventPublisher.writeInTransaction(tx, [orderEvent])

            return { order, events: written }
          })

          return { order, events }
        })
      },

      getOrderById: (orderId: OrderId) => {
        return prismaService
          .execute(() =>
            prismaService.prisma.order.findUnique({
              where: { id: orderId },
              include: {
                packages: true,
              },
            })
          )
          .pipe(Effect.flatMap((order) => (order ? Effect.succeed(order) : Effect.fail(orderNotFound(orderId)))))
      },

      listOrders: () => {
        return prismaService.execute(() =>
          prismaService.prisma.order.findMany({
            include: {
              packages: true,
            },
          })
        )
      },

      findByDriverId: (driverId: DriverId) => {
        return prismaService.execute(() =>
          prismaService.prisma.order.findMany({
            where: { driverId },
            include: {
              packages: true,
            },
          })
        )
      },

      updateOrder: (orderId: OrderId, updateInput: OrderUpdateInput) => {
        return prismaService.execute(() =>
          prismaService.prisma.order.update({
            where: { id: orderId },
            data: {
              pickupAddress: updateInput.pickupAddress,
              deliveryAddress: updateInput.deliveryAddress,
              pickupDate: updateInput.pickupDate,
              deliveryDate: updateInput.deliveryDate,
              specialInstructions: updateInput.specialInstructions,
              priority: updateInput.priority,
            },
            include: {
              packages: true,
            },
          })
        )
      },

      updateOrderStatus: (orderId: OrderId, status: ValidatedOrderStatus) => {
        return prismaService.execute(() =>
          prismaService.prisma.order.update({
            where: { id: orderId },
            data: { status },
            include: {
              packages: true,
            },
          })
        )
      },

      assignDriver: (orderId: OrderId, driverId: DriverId, assignedAt: Date, status: ValidatedOrderStatus) => {
        return Effect.gen(function* () {
          const { order, events } = yield* prismaService.$transaction(async (tx) => {
            const order = await tx.order.update({
              where: { id: orderId },
              data: {
                driverId,
                assignedAt,
                status,
              },
              include: {
                packages: true,
              },
            })

            const event: DomainEvent = {
              type: "DriverAssigned",
              streamId: `order:${order.id}`,
              payload: { orderId: order.id, driverId, assignedAt },
            }
            const written = await eventPublisher.writeInTransaction(tx, [event])

            return { order, events: written }
          })

          return { order, events }
        })
      },

      addPackageToOrder: (orderId: OrderId, packageInput: AddPackageInput) => {
        return Effect.gen(function* () {
          return yield* prismaService.$transaction(async (tx) => {
            const trackingNumber = await trackingNumberService.generateInTx(tx)

            await tx.package.create({
              data: {
                order: { connect: { id: orderId } },
                weightKg: packageInput.weightKg,
                dimensions: packageInput.dimensions,
                description: packageInput.description,
                fragile: packageInput.fragile,
                perishable: packageInput.perishable,
                insured: packageInput.insured,
                trackingNumber,
                status: PackageStatus.AWAITING_PICKUP,
              },
            })

            return tx.order.findUniqueOrThrow({
              where: { id: orderId },
              include: { packages: true },
            })
          })
        })
      },

      findPackageByTrackingNumber: (trackingNumber: string) => {
        return prismaService
          .execute(() =>
            prismaService.prisma.package.findUnique({
              where: { trackingNumber },
              include: { order: { include: { customer: true } } },
            })
          )
          .pipe(
            Effect.map((pkg) => {
              if (!pkg) return null
              return {
                package: {
                  id: Schema.decodeSync(PackageId)(pkg.id),
                  trackingNumber: pkg.trackingNumber,
                  status: pkg.status,
                },
                order: {
                  id: Schema.decodeSync(OrderId)(pkg.order.id),
                  pickupAddress: pkg.order.pickupAddress,
                  deliveryAddress: pkg.order.deliveryAddress,
                  pickupDate: pkg.order.pickupDate,
                  customerName: pkg.order.customer.name,
                },
              }
            })
          )
      },

      updatePackageStatus: (orderId: OrderId, packageId: PackageId, status: PackageStatus) => {
        return Effect.gen(function* () {
          yield* prismaService.execute(() =>
            prismaService.prisma.package.update({
              where: { id: packageId },
              data: { status },
            })
          )

          return yield* prismaService.execute(() =>
            prismaService.prisma.order.findUniqueOrThrow({
              where: { id: orderId },
              include: { packages: true },
            })
          )
        })
      },
    })
  })
)
