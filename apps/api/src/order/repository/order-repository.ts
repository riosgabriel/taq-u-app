import { PersistenceError, RecordNotFoundError } from "@/persistence-errors"
import { OrderCreateInput, OrderUpdateInput } from "@order/dto/order-dto"
import { OrderPriority, OrderStatus, PackageStatus, Prisma } from "@prisma/client"
import { Context, Effect, Layer } from "effect"
import { PrismaService } from "prisma-service"

const orderNotFound = (orderId: string) =>
  new RecordNotFoundError({ model: "Order", id: orderId, message: `Order with id ${orderId} not found` })

export class OrderRepository extends Context.Tag("order/OrderRepository")<
  OrderRepository,
  {
    readonly createOrder: (deliveryOrderInput: OrderCreateInput) => Effect.Effect<OrderWithPackages, PersistenceError>
    readonly getOrderById: (
      orderId: string
    ) => Effect.Effect<OrderWithPackages, PersistenceError>
    readonly listOrders: () => Effect.Effect<OrderWithPackages[], PersistenceError>
    readonly updateOrder: (
      orderId: string,
      updateInput: OrderUpdateInput
    ) => Effect.Effect<OrderWithPackages, PersistenceError>
    readonly updateOrderStatus: (
      orderId: string,
      status: OrderStatus
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

    return OrderRepository.of({
      createOrder: (orderInput: OrderCreateInput) => {
        return prismaService.execute(() =>
          prismaService.prisma.order.create({
            data: {
              customer: {
                connect: {
                  id: orderInput.customerId,
                },
              },
              packages: {
                createMany: {
                  data: orderInput.packages.map((pkg) => ({
                    weightKg: pkg.weightKg,
                    dimensions: pkg.dimensions,
                    description: pkg.description,
                    fragile: pkg.fragile,
                    perishable: pkg.perishable,
                    insured: pkg.insured,
                    status: PackageStatus.AWAITING_PICKUP,
                    trackingNumber: `TRACK-${orderInput.customerId}-${pkg.weightKg}-${pkg.dimensions}-${pkg.description}-${pkg.fragile}-${pkg.perishable}-${pkg.insured}`,
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
        )
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
    })
  })
)
