import { runEffect } from "@/middleware/effect-runner"
import { badRequest, notFound, ok } from "@/middleware/http"
import { decodeBody, decodeParams, IdParams } from "@/middleware/validate"
import {
  AssignDeliveryDriverInput,
  CreateDeliveryInput,
  DeliveryResponse,
  UpdateDeliveryStatusInput,
} from "delivery/dto/delivery-dto"
import { DeliveryService } from "delivery/services/delivery-service"
import { Effect } from "effect"
import { NextFunction, Request, Response, Router } from "express"

export const DeliveryController = Router()

DeliveryController.post("/", async (req: Request, res: Response, next: NextFunction) => {
  const program = Effect.gen(function* (_) {
    const input = yield* decodeBody(CreateDeliveryInput, req)
    const service = yield* DeliveryService
    return ok(DeliveryResponse.fromDelivery(yield* service.createDelivery(input)))
  }).pipe(
    Effect.catchTag("delivery/RouteNotFoundError", (error) => Effect.succeed(badRequest(error.message))),
    Effect.catchTag("delivery/DriverNotFoundError", (error) => Effect.succeed(badRequest(error.message)))
  )

  runEffect(req, res, next, program)
})

DeliveryController.get("/", async (req: Request, res: Response, next: NextFunction) => {
  const program = Effect.gen(function* (_) {
    const service = yield* DeliveryService
    const deliveries = yield* service.listDeliveries()
    return ok(deliveries.map(DeliveryResponse.fromDelivery))
  })

  runEffect(req, res, next, program)
})

DeliveryController.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  const program = Effect.gen(function* (_) {
    const { id } = yield* decodeParams(IdParams, req)
    const service = yield* DeliveryService
    return ok(DeliveryResponse.fromDelivery(yield* service.getDeliveryById(id)))
  }).pipe(Effect.catchTag("delivery/DeliveryNotFoundError", (error) => Effect.succeed(notFound(error.message))))

  runEffect(req, res, next, program)
})

DeliveryController.patch("/:id/status", async (req: Request, res: Response, next: NextFunction) => {
  const program = Effect.gen(function* (_) {
    const { id } = yield* decodeParams(IdParams, req)
    const input = yield* decodeBody(UpdateDeliveryStatusInput, req)
    const service = yield* DeliveryService
    return ok(DeliveryResponse.fromDelivery(yield* service.updateStatus(id, input)))
  }).pipe(
    Effect.catchTag("delivery/DeliveryNotFoundError", (error) => Effect.succeed(notFound(error.message))),
    Effect.catchTag("delivery/DeliveryStatusError", (error) => Effect.succeed(badRequest(error.message)))
  )

  runEffect(req, res, next, program)
})

DeliveryController.patch("/:id/assign", async (req: Request, res: Response, next: NextFunction) => {
  const program = Effect.gen(function* (_) {
    const { id } = yield* decodeParams(IdParams, req)
    const input = yield* decodeBody(AssignDeliveryDriverInput, req)
    const service = yield* DeliveryService
    return ok(DeliveryResponse.fromDelivery(yield* service.assignDriver(id, input)))
  }).pipe(
    Effect.catchTag("delivery/DeliveryNotFoundError", (error) => Effect.succeed(notFound(error.message))),
    Effect.catchTag("delivery/DeliveryStatusError", (error) => Effect.succeed(badRequest(error.message))),
    Effect.catchTag("delivery/DriverNotFoundError", (error) => Effect.succeed(badRequest(error.message)))
  )

  runEffect(req, res, next, program)
})
