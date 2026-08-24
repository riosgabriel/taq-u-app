import { wrapHandler } from "@/middleware/wrap-handler"
import { conflict, notFound, ok } from "@/middleware/http"
import { DriverId } from "@/ids"
import { DriverCreateInput, DriverOrderResponse, DriverResponse, DriverUpdateInput } from "delivery/dto/driver-dto"
import { DriverService } from "delivery/services/driver-service"
import { Effect, Schema } from "effect"
import { Router } from "express"

export const DriverController = Router()

const DriverIdPathParams = Schema.Struct({ id: DriverId })
const DriverIdParams = Schema.Struct({ driverId: DriverId })

DriverController.post(
  "/",
  wrapHandler({
    body: DriverCreateInput,
    handler: ({ body }) =>
      Effect.gen(function* () {
        const driverService = yield* DriverService
        return yield* driverService.create(body)
      }),
    responseMapper: (driver) => ok(DriverResponse.fromDriver(driver)),
    errorMappers: {
      "order/DriverEmailAlreadyExistsError": (e) => conflict(e.message),
    },
  })
)

DriverController.get(
  "/",
  wrapHandler({
    handler: () =>
      Effect.gen(function* () {
        const driverService = yield* DriverService
        return yield* driverService.listAll()
      }),
    responseMapper: (drivers) => ok(drivers.map(DriverResponse.fromDriver)),
  })
)

DriverController.get(
  "/:id",
  wrapHandler({
    params: DriverIdPathParams,
    handler: ({ params }) =>
      Effect.gen(function* () {
        const driverService = yield* DriverService
        return yield* driverService.getById(params.id)
      }),
    responseMapper: (driver) => ok(DriverResponse.fromDriver(driver)),
    errorMappers: {
      "delivery/DriverNotFoundError": (e) => notFound(e.message),
    },
  })
)

DriverController.get(
  "/:driverId/orders",
  wrapHandler({
    params: DriverIdParams,
    handler: ({ params }) =>
      Effect.gen(function* () {
        const driverService = yield* DriverService
        return yield* driverService.listOrders(params.driverId)
      }),
    responseMapper: (orders) => ok(orders.map(DriverOrderResponse.fromOrderWithPackages)),
    errorMappers: {
      "delivery/DriverNotFoundError": (e) => notFound(e.message),
    },
  })
)

DriverController.patch(
  "/:id",
  wrapHandler({
    params: DriverIdPathParams,
    body: DriverUpdateInput,
    handler: ({ params, body }) =>
      Effect.gen(function* () {
        const driverService = yield* DriverService
        return yield* driverService.update(params.id, body)
      }),
    responseMapper: (driver) => ok(DriverResponse.fromDriver(driver)),
    errorMappers: {
      "delivery/DriverNotFoundError": (e) => notFound(e.message),
    },
  })
)

DriverController.delete(
  "/:id",
  wrapHandler({
    params: DriverIdPathParams,
    handler: ({ params }) =>
      Effect.gen(function* () {
        const driverService = yield* DriverService
        yield* driverService.delete(params.id)
      }),
    responseMapper: () => ok({ message: "Driver deleted successfully" }),
    errorMappers: {
      "delivery/DriverNotFoundError": (e) => notFound(e.message),
    },
  })
)
