import { OrderCreateInput, OrderUpdateInput } from "@order/dto/order-dto"
import { CustomerRepository } from "@order/repository/customer-repository"
import { OrderRepository, OrderWithPackages } from "@order/repository/order-repository"
import { OrderStatus } from "@prisma/client"
import { Context, Data, Effect, Layer } from "effect"
import { UnknownException } from "effect/Cause"
import { CustomerNotFoundError } from "./customer-service"
export class OrderNotFoundError extends Data.TaggedError("order/OrderNotFoundError")<{
  readonly orderId: string
  readonly message: string
}> {}

export class OrderStatusError extends Data.TaggedError("order/OrderStatusError")<{
  readonly orderId: string
  readonly currentStatus: string
  readonly message: string
}> {}

export class OrderService extends Context.Tag("order/OrderService")<
  OrderService,
  {
    readonly createOrder: (
      orderInput: OrderCreateInput
    ) => Effect.Effect<OrderWithPackages, CustomerNotFoundError | UnknownException>
    readonly getOrderById: (orderId: string) => Effect.Effect<OrderWithPackages, OrderNotFoundError | UnknownException>
    readonly listOrders: () => Effect.Effect<OrderWithPackages[], UnknownException>
    readonly updateOrder: (
      orderId: string,
      updateInput: OrderUpdateInput
    ) => Effect.Effect<OrderWithPackages, OrderNotFoundError | UnknownException>
    readonly cancelOrder: (
      orderId: string
    ) => Effect.Effect<OrderWithPackages, OrderNotFoundError | OrderStatusError | UnknownException>
  }
>() {}

export type OrderServiceShape = Context.Tag.Service<OrderService>

export const OrderServiceLive = Layer.effect(
  OrderService,
  Effect.gen(function* () {
    const orderRepository = yield* OrderRepository
    const customerRepository = yield* CustomerRepository

    return OrderService.of({
      createOrder: (orderInput: OrderCreateInput) => {
        return Effect.gen(function* () {
          const customer = yield* customerRepository.getCustomerById(orderInput.customerId)

          if (!customer) {
            return yield* Effect.fail(
              new CustomerNotFoundError({
                customerId: orderInput.customerId,
                message: `Customer with id ${orderInput.customerId} not found`,
              })
            )
          }

          return yield* orderRepository.createOrder(orderInput)
        })
      },

      getOrderById: (orderId: string) => {
        return Effect.gen(function* () {
          const order = yield* orderRepository.getOrderById(orderId)

          if (!order) {
            return yield* Effect.fail(
              new OrderNotFoundError({ orderId, message: `Order with id ${orderId} not found` })
            )
          }

          return order
        })
      },

      // TODO: add pagination and filtering
      listOrders: () => orderRepository.listOrders(),

      updateOrder: (orderId: string, updateInput: OrderUpdateInput) => {
        return Effect.gen(function* () {
          const existingOrder = yield* orderRepository.getOrderById(orderId)

          if (!existingOrder) {
            return yield* Effect.fail(
              new OrderNotFoundError({ orderId, message: `Order with id ${orderId} not found` })
            )
          }

          return yield* orderRepository.updateOrder(orderId, updateInput)
        })
      },

      cancelOrder: (orderId: string) => {
        return Effect.gen(function* () {
          const existingOrder = yield* orderRepository.getOrderById(orderId)

          if (!existingOrder) {
            return yield* Effect.fail(
              new OrderNotFoundError({ orderId, message: `Order with id ${orderId} not found` })
            )
          }

          // Cannot cancel orders that are already completed or cancelled
          if (existingOrder.status === OrderStatus.COMPLETED || existingOrder.status === OrderStatus.CANCELLED) {
            return yield* Effect.fail(
              new OrderStatusError({
                orderId,
                currentStatus: existingOrder.status,
                message:
                  existingOrder.status === OrderStatus.CANCELLED
                    ? "Order is already cancelled"
                    : `Cannot cancel order with status ${existingOrder.status}`,
              })
            )
          }

          return yield* orderRepository.updateOrderStatus(orderId, OrderStatus.CANCELLED)
        })
      },
    })
  })
)
