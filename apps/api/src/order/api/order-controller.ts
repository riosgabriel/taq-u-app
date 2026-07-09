import { runEffect } from "@/middleware/effect-runner"
import { badRequest, notFound, ok } from "@/middleware/http"
import { OrderCreateInput, OrderResponse, OrderUpdateInput } from "@order/dto/order-dto"
import { OrderService } from "@order/services/order-service"
import { Effect, Schema } from "effect"
import { NextFunction, Request, Response, Router } from "express"

export const OrderController = Router()

OrderController.post("/", async (req: Request, res: Response, next: NextFunction) => {
  const program = Effect.gen(function* (_) {
    const orderInput = yield* Schema.decodeUnknown(OrderCreateInput)(req.body)
    const orderService = yield* OrderService
    return ok(OrderResponse.fromOrderWithPackages(yield* orderService.createOrder(orderInput)))
  }).pipe(
    Effect.catchTag("order/CustomerNotFoundError", (error) => Effect.succeed(notFound(error.message)))
  )

  runEffect(req, res, next, program)
})

OrderController.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  const orderId = req.params.id as string

  const program = Effect.gen(function* (_) {
    const orderService = yield* OrderService
    return ok(OrderResponse.fromOrderWithPackages(yield* orderService.getOrderById(orderId)))
  }).pipe(
    Effect.catchTag("order/OrderNotFoundError", (error) => Effect.succeed(notFound(error.message)))
  )

  runEffect(req, res, next, program)
})

OrderController.put("/:id", async (req: Request, res: Response, next: NextFunction) => {
  const orderId = req.params.id as string

  const program = Effect.gen(function* (_) {
    const orderInput = yield* Schema.decodeUnknown(OrderUpdateInput)(req.body)
    const orderService = yield* OrderService
    return ok(OrderResponse.fromOrderWithPackages(yield* orderService.updateOrder(orderId, orderInput)))
  }).pipe(
    Effect.catchTag("order/OrderNotFoundError", (error) => Effect.succeed(notFound(error.message)))
  )

  runEffect(req, res, next, program)
})

OrderController.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  const orderId = req.params.id as string

  const program = Effect.gen(function* (_) {
    const orderService = yield* OrderService
    return ok(OrderResponse.fromOrderWithPackages(yield* orderService.cancelOrder(orderId)))
  }).pipe(
    Effect.catchTag("order/OrderNotFoundError", (error) => Effect.succeed(notFound(error.message))),
    Effect.catchTag("order/OrderStatusError", (error) => Effect.succeed(badRequest(error.message)))
  )

  runEffect(req, res, next, program)
})

OrderController.get("/", async (req: Request, res: Response, next: NextFunction) => {
  const program = Effect.gen(function* (_) {
    const orderService = yield* OrderService
    const orders = yield* orderService.listOrders()
    return ok(orders.map((order) => OrderResponse.fromOrderWithPackages(order)))
  })

  runEffect(req, res, next, program)
})
