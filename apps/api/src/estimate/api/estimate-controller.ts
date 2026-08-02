import { runEffect } from "@/middleware/effect-runner"
import { notFound, ok } from "@/middleware/http"
import { decodeBody, decodeParams, IdParams } from "@/middleware/validate"
import { CalculateEstimateInput, EstimateResponse } from "estimate/dto/estimate-dto"
import { EstimateService } from "estimate/services/estimate-service"
import { Effect, Schema } from "effect"
import { NextFunction, Request, Response, Router } from "express"

class OrderIdParams extends Schema.Class<OrderIdParams>("estimate/OrderIdParams")({
  orderId: Schema.String,
}) {}

export const EstimateController = Router()

EstimateController.post("/", async (req: Request, res: Response, next: NextFunction) => {
  const program = Effect.gen(function* (_) {
    const input = yield* decodeBody(CalculateEstimateInput, req)
    const estimateService = yield* EstimateService

    if (input.orderId) {
      const persisted = yield* estimateService.create(input)
      return ok(EstimateResponse.fromEstimate(persisted))
    }

    const calculation = yield* estimateService.calculate(input)
    return ok(EstimateResponse.fromCalculation(calculation, null))
  })

  runEffect(req, res, next, program)
})

EstimateController.get("/order/:orderId", async (req: Request, res: Response, next: NextFunction) => {
  const program = Effect.gen(function* (_) {
    const { orderId } = yield* decodeParams(OrderIdParams, req)
    const estimateService = yield* EstimateService
    const estimates = yield* estimateService.listByOrderId(orderId)
    return ok(estimates.map(EstimateResponse.fromEstimate))
  })

  runEffect(req, res, next, program)
})

EstimateController.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  const program = Effect.gen(function* (_) {
    const { id } = yield* decodeParams(IdParams, req)
    const estimateService = yield* EstimateService
    return ok(EstimateResponse.fromEstimate(yield* estimateService.getById(id)))
  }).pipe(Effect.catchTag("estimate/EstimateNotFoundError", (error) => Effect.succeed(notFound(error.message))))

  runEffect(req, res, next, program)
})
