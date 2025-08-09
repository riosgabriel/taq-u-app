import { OrderCreateInput } from "@order/dto/order-dto"
import { Order, OrderPriority, OrderStatus, PackageStatus, Prisma } from "@prisma/client"
import { Context, Effect, Layer } from "effect"
import { UnknownException } from "effect/Cause"
import { PrismaService } from "prisma-service"

export class OrderRepository extends Context.Tag("order/OrderRepository")<
  OrderRepository,
  {
    readonly createOrder: (deliveryOrderInput: OrderCreateInput) => Effect.Effect<OrderWithPackages, UnknownException>
  }
>() {}

export type OrderRepositoryShape = Context.Tag.Service<OrderRepository>

const orderWithPackages = Prisma.validator<Prisma.OrderDefaultArgs>()({
  include: { packages: true },
})

export type OrderWithPackages = Prisma.OrderGetPayload<typeof orderWithPackages>


export const OrderRepositoryLive = Layer.effect(
    OrderRepository,
    Effect.gen(function* () {
      const prismaService = yield* PrismaService
  
      return OrderRepository.of({
        createOrder: (orderInput: OrderCreateInput) => {
          return Effect.tryPromise(() =>
            prismaService.prisma.order.create({
              data: {
                customer: {
                  connect: {
                    id: orderInput.customer.id,
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
                            trackingNumber: `TRACK-${orderInput.customer.id}-${pkg.weightKg}-${pkg.dimensions}-${pkg.description}-${pkg.fragile}-${pkg.perishable}-${pkg.insured}`, // TODO: generate a tracking number
                        })),
                    }
                },
                pickupAddress: orderInput.pickupAddress,
                deliveryAddress: orderInput.deliveryAddress,
                pickupDate: orderInput.pickupDate,
                deliveryDate: orderInput.deliveryDate,
                specialInstructions: orderInput.specialInstructions,
                priority: orderInput.priority as OrderPriority, // TODO: need to map the priority to the enum
                status: OrderStatus.PENDING,
              },
              include: {
                packages: true,
              },
            })
          )
        },
      })
    })
  )