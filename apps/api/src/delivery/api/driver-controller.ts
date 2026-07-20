import { runEffect } from "@/middleware/effect-runner"
import { conflict, notFound, ok } from "@/middleware/http"
import { decodeBody, decodeParams, IdParams } from "@/middleware/validate"
import { DriverCreateInput, DriverOrderResponse, DriverResponse, DriverUpdateInput } from "delivery/dto/driver-dto"
import { DriverService } from "delivery/services/driver-service"
import { Effect, Schema } from "effect"
import { NextFunction, Request, Response, Router } from "express"

export const DriverController = Router()

DriverController.post("/", async (req: Request, res: Response, next: NextFunction) => {
  const program = Effect.gen(function* (_) {
    const driverInput = yield* decodeBody(DriverCreateInput, req)
    const driverService = yield* DriverService
    return ok(DriverResponse.fromDriver(yield* driverService.create(driverInput)))
  }).pipe(Effect.catchTag("order/DriverEmailAlreadyExistsError", (error) => Effect.succeed(conflict(error.message))))

  runEffect(req, res, next, program)
})

DriverController.get("/", async (req: Request, res: Response, next: NextFunction) => {
  const program = Effect.gen(function* (_) {
    const driverService = yield* DriverService
    const drivers = yield* driverService.listAll()
    return ok(drivers.map(DriverResponse.fromDriver))
  })

  runEffect(req, res, next, program)
})

DriverController.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  const program = Effect.gen(function* (_) {
    const { id } = yield* decodeParams(IdParams, req)
    const driverService = yield* DriverService
    return ok(DriverResponse.fromDriver(yield* driverService.getById(id)))
  }).pipe(Effect.catchTag("delivery/DriverNotFoundError", (error) => Effect.succeed(notFound(error.message))))

  runEffect(req, res, next, program)
})

DriverController.get("/:driverId/orders", async (req: Request, res: Response, next: NextFunction) => {
  class DriverIdParams extends Schema.Class<DriverIdParams>("DriverIdParams")({
    driverId: Schema.String,
  }) {}

  const program = Effect.gen(function* (_) {
    const { driverId } = yield* decodeParams(DriverIdParams, req)
    const driverService = yield* DriverService
    const orders = yield* driverService.listOrders(driverId)
    return ok(orders.map(DriverOrderResponse.fromOrderWithPackages))
  }).pipe(Effect.catchTag("delivery/DriverNotFoundError", (error) => Effect.succeed(notFound(error.message))))

  runEffect(req, res, next, program)
})

DriverController.patch("/:id", async (req: Request, res: Response, next: NextFunction) => {
  const program = Effect.gen(function* (_) {
    const { id } = yield* decodeParams(IdParams, req)
    const driverInput = yield* decodeBody(DriverUpdateInput, req)
    const driverService = yield* DriverService
    return ok(DriverResponse.fromDriver(yield* driverService.update(id, driverInput)))
  }).pipe(Effect.catchTag("delivery/DriverNotFoundError", (error) => Effect.succeed(notFound(error.message))))

  runEffect(req, res, next, program)
})

DriverController.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  const program = Effect.gen(function* (_) {
    const { id } = yield* decodeParams(IdParams, req)
    const driverService = yield* DriverService
    yield* driverService.delete(id)
    return ok({ message: "Driver deleted successfully" })
  }).pipe(Effect.catchTag("delivery/DriverNotFoundError", (error) => Effect.succeed(notFound(error.message))))

  runEffect(req, res, next, program)
})
