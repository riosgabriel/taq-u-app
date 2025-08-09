import { OrderCreateInput } from "@order/dto/order-dto"
import { OrderRepository, OrderWithPackages } from "@order/repository/order-repository"
import { Context, Effect, Layer } from "effect"
import { UnknownException } from "effect/Cause"

export class OrderService extends Context.Tag("order/OrderService")<
  OrderService,
  {
    readonly createOrder: (orderInput: OrderCreateInput) => Effect.Effect<OrderWithPackages, UnknownException>
  }
>() {}

export type OrderServiceShape = Context.Tag.Service<OrderService>

export const OrderServiceLive = Layer.effect(
    OrderService,
    Effect.gen(function* () {
      const orderRepository = yield* OrderRepository

      return OrderService.of({
        createOrder: (orderInput: OrderCreateInput) => orderRepository.createOrder(orderInput),
      })
    })
  )