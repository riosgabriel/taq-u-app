import { decodeBody, decodeParams, IdParams } from "@/middleware/validate"
import { runEffect } from "@/middleware/effect-runner"
import { badRequest, notFound, ok } from "@/middleware/http"
import {
  AddPackageInput,
  AssignDriverInput,
  OrderCreateInput,
  OrderResponse,
  OrderUpdateInput,
  PackageResponse,
  PackageStatusUpdateInput,
} from "ordering/dto/order-dto"
import { OrderService } from "ordering/services/order-service"
import { PackageStatus } from "@prisma/client"
import { Effect, Schema } from "effect"
import { NextFunction, Request, Response, Router } from "express"

export const OrderController = Router()

OrderController.post("/", async (req: Request, res: Response, next: NextFunction) => {
  const program = Effect.gen(function* (_) {
    const orderInput = yield* decodeBody(OrderCreateInput, req)
    const orderService = yield* OrderService
    return ok(OrderResponse.fromOrderWithPackages(yield* orderService.createOrder(orderInput)))
  }).pipe(Effect.catchTag("order/CustomerNotFoundError", (error) => Effect.succeed(notFound(error.message))))

  runEffect(req, res, next, program)
})

OrderController.get("/", async (req: Request, res: Response, next: NextFunction) => {
  const program = Effect.gen(function* (_) {
    const orderService = yield* OrderService
    const orders = yield* orderService.listOrders()
    return ok(orders.map(OrderResponse.fromOrderWithPackages))
  })

  runEffect(req, res, next, program)
})

OrderController.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  const program = Effect.gen(function* (_) {
    const { id: orderId } = yield* decodeParams(IdParams, req)
    const orderService = yield* OrderService
    return ok(OrderResponse.fromOrderWithPackages(yield* orderService.getOrderById(orderId)))
  }).pipe(Effect.catchTag("order/OrderNotFoundError", (error) => Effect.succeed(notFound(error.message))))

  runEffect(req, res, next, program)
})

OrderController.get("/:id/status", async (req: Request, res: Response, next: NextFunction) => {
  const program = Effect.gen(function* (_) {
    const { id: orderId } = yield* decodeParams(IdParams, req)
    const orderService = yield* OrderService
    const order = yield* orderService.getOrderById(orderId)
    return ok({ status: order.status })
  }).pipe(Effect.catchTag("order/OrderNotFoundError", (error) => Effect.succeed(notFound(error.message))))

  runEffect(req, res, next, program)
})

class CancelOrderParams extends IdParams {}

OrderController.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  const program = Effect.gen(function* (_) {
    const { id: orderId } = yield* decodeParams(CancelOrderParams, req)
    const orderService = yield* OrderService
    const cancelledOrder = yield* orderService.cancelOrder(orderId)
    return ok(OrderResponse.fromOrderWithPackages(cancelledOrder))
  }).pipe(
    Effect.catchTag("order/OrderNotFoundError", (error) => Effect.succeed(notFound(error.message))),
    Effect.catchTag("order/OrderStatusError", (error) => Effect.succeed(badRequest(error.message)))
  )

  runEffect(req, res, next, program)
})

OrderController.post("/:orderId/assign", async (req: Request, res: Response, next: NextFunction) => {
  class AssignOrderParams extends Schema.Class<AssignOrderParams>("AssignOrderParams")({
    orderId: Schema.String,
  }) {}

  const program = Effect.gen(function* (_) {
    const { orderId } = yield* decodeParams(AssignOrderParams, req)
    const { driverId } = yield* decodeBody(AssignDriverInput, req)
    const orderService = yield* OrderService
    const assigned = yield* orderService.assignDriver(orderId, driverId)
    return ok(OrderResponse.fromOrderWithPackages(assigned))
  }).pipe(
    Effect.catchTag("order/OrderNotFoundError", (error) => Effect.succeed(notFound(error.message))),
    Effect.catchTag("order/DriverNotFoundError", (error) => Effect.succeed(notFound(error.message))),
    Effect.catchTag("order/OrderStatusError", (error) => Effect.succeed(badRequest(error.message)))
  )

  runEffect(req, res, next, program)
})

OrderController.patch("/:id", async (req: Request, res: Response, next: NextFunction) => {
  const program = Effect.gen(function* (_) {
    const { id: orderId } = yield* decodeParams(IdParams, req)
    const updateInput = yield* decodeBody(OrderUpdateInput, req)
    const orderService = yield* OrderService
    return ok(OrderResponse.fromOrderWithPackages(yield* orderService.updateOrder(orderId, updateInput)))
  }).pipe(Effect.catchTag("order/OrderNotFoundError", (error) => Effect.succeed(notFound(error.message))))

  runEffect(req, res, next, program)
})

OrderController.post("/:orderId/packages", async (req: Request, res: Response, next: NextFunction) => {
  class AddPackageParams extends Schema.Class<AddPackageParams>("AddPackageParams")({
    orderId: Schema.String,
  }) {}

  const program = Effect.gen(function* (_) {
    const { orderId } = yield* decodeParams(AddPackageParams, req)
    const packageInput = yield* decodeBody(AddPackageInput, req)
    const orderService = yield* OrderService
    return ok(OrderResponse.fromOrderWithPackages(yield* orderService.addPackageToOrder(orderId, packageInput)))
  }).pipe(Effect.catchTag("order/OrderNotFoundError", (error) => Effect.succeed(notFound(error.message))))

  runEffect(req, res, next, program)
})

OrderController.get("/:orderId/packages/:packageId", async (req: Request, res: Response, next: NextFunction) => {
  class PackageParams extends Schema.Class<PackageParams>("PackageParams")({
    orderId: Schema.String,
    packageId: Schema.String,
  }) {}

  const program = Effect.gen(function* (_) {
    const { orderId, packageId } = yield* decodeParams(PackageParams, req)
    const orderService = yield* OrderService
    const order = yield* orderService.getOrderById(orderId)
    const pkg = order.packages.find((p) => p.id === packageId)
    return pkg ? ok(PackageResponse.fromPackage(pkg)) : notFound("Package not found")
  }).pipe(Effect.catchTag("order/OrderNotFoundError", (error) => Effect.succeed(notFound(error.message))))

  runEffect(req, res, next, program)
})

OrderController.patch(
  "/:orderId/packages/:packageId/status",
  async (req: Request, res: Response, next: NextFunction) => {
    class PackageStatusParams extends Schema.Class<PackageStatusParams>("PackageStatusParams")({
      orderId: Schema.String,
      packageId: Schema.String,
    }) {}

    const program = Effect.gen(function* (_) {
      const { orderId, packageId } = yield* decodeParams(PackageStatusParams, req)
      const statusInput = yield* decodeBody(PackageStatusUpdateInput, req)
      const orderService = yield* OrderService
      return ok(
        OrderResponse.fromOrderWithPackages(
          yield* orderService.updatePackageStatus(orderId, packageId, statusInput.status as PackageStatus)
        )
      )
    }).pipe(
      Effect.catchTag("order/OrderNotFoundError", (error) => Effect.succeed(notFound(error.message))),
      Effect.catchTag("order/PackageNotFoundError", (error) => Effect.succeed(notFound(error.message)))
    )

    runEffect(req, res, next, program)
  }
)
