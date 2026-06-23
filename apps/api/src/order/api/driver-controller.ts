import { runEffect } from "@/middleware/effect-runner"
import { DriverCreateInput, DriverResponse } from "@order/dto/driver-dto"
import { DriverService } from "@order/services/driver-service"
import { Effect, Schema } from "effect"
import { NextFunction, Request, Response, Router } from "express"

export const DriverController = Router()

DriverController.post("/", async (req: Request, res: Response<DriverResponse>, next: NextFunction) => {
  const program = Effect.gen(function* (_) {
    const driverInput = yield* Schema.decodeUnknown(DriverCreateInput)(req.body)
    const driverService = yield* DriverService
    return DriverResponse.fromDriver(
      yield* driverService.create(driverInput)
    )
  })

  runEffect(req, res, next, program, (driver) => {
    res.json(driver)
  })
})

DriverController.get("/", async (req: Request, res: Response<Array<DriverResponse>>, next: NextFunction) => {
  const program = Effect.gen(function* (_) {
    const driverService = yield* DriverService
    return yield* driverService.listAll()
  })

  runEffect(req, res, next, program, (drivers) => {
    res.json(drivers)
  })
})

DriverController.get("/:id", async (req: Request, res: Response<DriverResponse>, next: NextFunction) => {
  const program = Effect.gen(function* (_) {
    const driverService = yield* DriverService
    return yield* driverService.getById(req.params.id)
  })

  runEffect(req, res, next, program, (driver) => {
    res.json(driver)
  })
})

DriverController.patch("/:id", async (req: Request, res: Response<DriverResponse>, next: NextFunction) => {
  const program = Effect.gen(function* (_) {
    const driverService = yield* DriverService
    return yield* driverService.update(req.params.id, req.body)
  })

  runEffect(req, res, next, program, (driver) => {
    res.json(driver)
  })
})

DriverController.delete("/:id", async (req: Request, res: Response<{ message: string }>, next: NextFunction) => {
  const program = Effect.gen(function* (_) {
    const driverService = yield* DriverService
    yield* driverService.delete(req.params.id)
    return { message: "Driver deleted successfully" }
  })

  runEffect(req, res, next, program, (result) => {
    res.json(result)
  })
})
