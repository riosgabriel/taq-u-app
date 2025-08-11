import { OrderCreateInput } from "@order/dto/order-dto"
import { CustomerRepository } from "@order/repository/customer-repository"
import { OrderRepository, OrderWithPackages } from "@order/repository/order-repository"
import { Context, Effect, Layer } from "effect"
import { UnknownException } from "effect/Cause"
import { CustomerNotFoundError } from "./customer-service"

export class OrderService extends Context.Tag("order/OrderService")<
  OrderService,
  {
    readonly createOrder: (orderInput: OrderCreateInput) => Effect.Effect<OrderWithPackages, CustomerNotFoundError | UnknownException>
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
      })
    })
  )