import { PersistenceError, RecordNotFoundError } from "@/persistence-errors"
import { AddPackageInput, OrderCreateInput, OrderUpdateInput } from "ordering/dto/order-dto"
import { TrackingNumberService } from "ordering/services/tracking-number-service"
import { OrderPriority, OrderStatus, PackageStatus, Prisma } from "@prisma/client"
import { Context, Effect, Layer } from "effect"
import { PrismaService } from "prisma-service"
import { EventPublisher } from "events/event-publisher"
import { DomainEvent } from "events/domain-event"

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
    readonly getOrderById: (orderId: string) => Effect.Effect<OrderWithPackages, PersistenceError>
    readonly listOrders: () => Effect.Effect<OrderWithPackages[], PersistenceError>
    readonly updateOrder: (
      orderId: string,
      updateInput: OrderUpdateInput
    ) => Effect.Effect<OrderWithPackages, PersistenceError>
    readonly updateOrderStatus: (
      orderId: string,
      status: OrderStatus
    ) => Effect.Effect<OrderWithPackages, PersistenceError>
    readonly addPackageToOrder: (
      orderId: string,
      packageInput: AddPackageInput
    ) => Effect.Effect<OrderWithPackages, PersistenceError>
    readonly updatePackageStatus: (
      orderId: string,
      packageId: string,
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

    const generateTrackingNumbers = (count: number): Effect.Effect<string[], PersistenceError> =>
      Effect.gen(function* () {
        const numbers: Array<string> = []
        for (let i = 0; i < count; i++) {
          numbers.push(yield* trackingNumberService.generate())
        }
        return numbers
      })

    return OrderRepository.of({
      createOrder: (orderInput: OrderCreateInput) => {
        return Effect.gen(function* () {
          const trackingNumbers = yield* generateTrackingNumbers(orderInput.packages.length)
          const persistedEvents: DomainEvent[] = []

          const order = yield* prismaService.$transaction(async (tx) => {
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
                priority: orderInput.priority as OrderPriority,
                status: OrderStatus.PENDING,
              },
              include: {
                packages: true,
              },
            })

            const event: DomainEvent = {
              type: "OrderCreated",
              streamId: `order:${order.id}`,
              payload: { orderId: order.id, customerId: order.customerId },
              timestamp: new Date(),
            }
            await eventPublisher.writeInTransaction(tx, [event])
            persistedEvents.push(event)

            return order
          })

          return { order, events: persistedEvents }
        })
      },

      getOrderById: (orderId: string) => {
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

      updateOrder: (orderId: string, updateInput: OrderUpdateInput) => {
        return prismaService.execute(() =>
          prismaService.prisma.order.update({
            where: { id: orderId },
            data: {
              pickupAddress: updateInput.pickupAddress,
              deliveryAddress: updateInput.deliveryAddress,
              pickupDate: updateInput.pickupDate,
              deliveryDate: updateInput.deliveryDate,
              specialInstructions: updateInput.specialInstructions,
              priority: updateInput.priority as OrderPriority,
            },
            include: {
              packages: true,
            },
          })
        )
      },

      updateOrderStatus: (orderId: string, status: OrderStatus) => {
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

      addPackageToOrder: (orderId: string, packageInput: AddPackageInput) => {
        return Effect.gen(function* () {
          const trackingNumbers = yield* generateTrackingNumbers(1)
          const trackingNumber = trackingNumbers[0]

          yield* prismaService.execute(() =>
            prismaService.prisma.package.create({
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
          )

          return yield* prismaService.execute(() =>
            prismaService.prisma.order.findUniqueOrThrow({
              where: { id: orderId },
              include: { packages: true },
            })
          )
        })
      },

      updatePackageStatus: (orderId: string, packageId: string, status: PackageStatus) => {
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
