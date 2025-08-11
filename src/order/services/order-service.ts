import { OrderCreateInput } from "@order/dto/order-dto"
import { CustomerRepository } from "@order/repository/customer-repository"
import { OrderRepository, OrderWithPackages } from "@order/repository/order-repository"
import { Context, Data, Effect, Layer } from "effect"
import { UnknownException } from "effect/Cause"
import { CustomerNotFoundError } from "./customer-service"
export class OrderNotFoundError extends Data.TaggedError("order/OrderNotFoundError")<{
    readonly orderId: string
    readonly message: string
  }
> {}

export class OrderService extends Context.Tag("order/OrderService")<
  OrderService,
  {
    readonly createOrder: (orderInput: OrderCreateInput) => Effect.Effect<OrderWithPackages, CustomerNotFoundError | UnknownException>
    readonly getOrderById: (orderId: string) => Effect.Effect<OrderWithPackages, OrderNotFoundError | UnknownException>
    readonly listOrders: () => Effect.Effect<OrderWithPackages[], UnknownException>
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
              return yield* Effect.fail(new CustomerNotFoundError({ customerId: orderInput.customerId, message: `Customer with id ${orderInput.customerId} not found` }))
            }

            return yield* orderRepository.createOrder(orderInput)
          })
        },

        getOrderById: (orderId: string) => {
          return Effect.gen(function* () {
            const order = yield* orderRepository.getOrderById(orderId)

            if (!order) {
              return yield* Effect.fail(new OrderNotFoundError({ orderId, message: `Order with id ${orderId} not found` }))
            }

            return order
          })
        },
        
        listOrders: () => {
          return Effect.gen(function* () {
            return yield* orderRepository.listOrders()
          })
        }
      })
    })
  )