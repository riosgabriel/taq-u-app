import { DriverCreateInput, DriverResponse } from "@order/dto/driver-dto"
import { DriverRepositoryLive } from "@order/repository/driver-respository"
import { DriverService, DriverServiceLive } from "@order/services/driver-service"
import { Console, Effect, Schema } from "effect"
import { Request, Response, Router } from "express"
import { PrismaLive } from "prisma-service"

export const DriverController = Router()

DriverController.post("/", async (req: Request, res: Response<DriverResponse | { message: string }>) => {
  const program = Effect.gen(function* (_) {
    const driverInput = yield* Schema.decodeUnknown(DriverCreateInput)(req.body)
    const driverService = yield* DriverService
    const driver = yield* driverService.create(driverInput)
    return res.json(DriverResponse.fromDriver(driver))
  }).pipe(
    Effect.catchTags({
      ParseError: (error) => {
        console.log(error)
        return Effect.sync(() => res.status(404).json({ message: error.message }))
      },
      "order/DriverEmailAlreadyExistsError": (error) => {
        console.log(error)
        return Effect.sync(() => res.status(400).json({ message: `Driver with email ${error.email} already exists` }))
      },
    }),
    Effect.catchAll((error) => {
      console.log(error)
      return Effect.sync(() => res.status(500).json({ message: "Internal Server Error" }))
    })
  )

  Effect.runPromise(
    program.pipe(Effect.provide(DriverServiceLive), Effect.provide(DriverRepositoryLive), Effect.provide(PrismaLive))
  )
})

DriverController.get("/", async (_req: Request, res: Response<Array<DriverResponse> | { message: string }>) => {
  const program = Effect.gen(function* (_) {
    const driverService = yield* DriverService
    const drivers = yield* driverService.listAll()
    return res.json(drivers)
  }).pipe(
    Effect.catchAll((error) => {
      Console.error(error)
      return Effect.sync(() => res.status(500).json({ message: "Internal Server Error" }))
    })
  )

  Effect.runPromise(
    program.pipe(Effect.provide(DriverServiceLive), Effect.provide(DriverRepositoryLive), Effect.provide(PrismaLive))
  )
})

DriverController.get("/:id", async (req: Request, res: Response<DriverResponse | { message: string }>) => {
  const program = Effect.gen(function* (_) {
    const driverService = yield* DriverService
    const driver = yield* driverService.getById(req.params.id)
    return res.json(driver)
  }).pipe(
    Effect.catchTags({
      "order/DriverNotFoundError": (error) => {
        Console.error(error)
        return Effect.sync(() => res.status(404).json({ message: error.message }))
      },
    }),
    Effect.catchAll((error) => {
      Console.error(error)
      return Effect.sync(() => res.status(500).json({ message: "Internal Server Error" }))
    })
  )

  Effect.runPromise(
    program.pipe(Effect.provide(DriverServiceLive), Effect.provide(DriverRepositoryLive), Effect.provide(PrismaLive))
  )
})
