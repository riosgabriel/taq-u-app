import { runEffect } from "@/middleware/effect-runner"
import { OrderCreateInput, OrderResponse, OrderUpdateInput } from "@order/dto/order-dto"
import { OrderService } from "@order/services/order-service"
import { Effect, Schema } from "effect"
import { NextFunction, Request, Response, Router } from "express"

export const OrderController = Router()

OrderController.post("/", async (req: Request, res: Response<OrderResponse>, next: NextFunction) => {
  const program = Effect.gen(function* (_) {
    const orderInput = yield* Schema.decodeUnknown(OrderCreateInput)(req.body)
    const orderService = yield* OrderService
    return OrderResponse.fromOrderWithPackages(
      yield* orderService.createOrder(orderInput)
    )
  })

  runEffect(req, res, next, program, (order) => {
    res.json(order)
  })
})

OrderController.get("/:id", async (req: Request, res: Response<OrderResponse>, next: NextFunction) => {
  const orderId = req.params.id

  const program = Effect.gen(function* (_) {
    const orderService = yield* OrderService
    return OrderResponse.fromOrderWithPackages(
      yield* orderService.getOrderById(orderId)
    )
  })

  runEffect(req, res, next, program, (order) => {
    res.json(order)
  })
})

OrderController.put("/:id", async (req: Request, res: Response<OrderResponse>, next: NextFunction) => {
  const orderId = req.params.id

  const program = Effect.gen(function* (_) {
    const orderInput = yield* Schema.decodeUnknown(OrderUpdateInput)(req.body)
    const orderService = yield* OrderService
    return OrderResponse.fromOrderWithPackages(
      yield* orderService.updateOrder(orderId, orderInput)
    )
  })

  runEffect(req, res, next, program, (order) => {
    res.json(order)
  })
})

OrderController.delete("/:id", async (req: Request, res: Response<OrderResponse>, next: NextFunction) => {
  const orderId = req.params.id

  const program = Effect.gen(function* (_) {
    const orderService = yield* OrderService
    return OrderResponse.fromOrderWithPackages(
      yield* orderService.cancelOrder(orderId)
    )
  })

  runEffect(req, res, next, program, (order) => {
    res.json(order)
  })
})

OrderController.get("/", async (req: Request, res: Response<OrderResponse[]>, next: NextFunction) => {
  const program = Effect.gen(function* (_) {
    const orderService = yield* OrderService
    const orders = yield* orderService.listOrders()
    return orders.map((order) => OrderResponse.fromOrderWithPackages(order))
  })

  runEffect(req, res, next, program, (ordersWithPackages) => {
    res.json(ordersWithPackages)
  })
})
