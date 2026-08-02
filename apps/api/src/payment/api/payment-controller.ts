import { runEffect } from "@/middleware/effect-runner"
import { notFound, ok } from "@/middleware/http"
import { decodeBody, decodeParams, IdParams } from "@/middleware/validate"
import { Effect, Schema } from "effect"
import { NextFunction, Request, Response, Router } from "express"
import { PaymentCreateInput, PaymentResponse, PaymentUpdateStatusInput } from "payment/dto/payment-dto"
import { PaymentService } from "payment/services/payment-service"

export const PaymentController = Router()

class OrderIdParams extends Schema.Class<OrderIdParams>("payment/OrderIdParams")({
  orderId: Schema.String,
}) {}

PaymentController.post("/", async (req: Request, res: Response, next: NextFunction) => {
  const program = Effect.gen(function* (_) {
    const input = yield* decodeBody(PaymentCreateInput, req)
    const paymentService = yield* PaymentService
    return ok(PaymentResponse.fromPayment(yield* paymentService.create(input)))
  })

  runEffect(req, res, next, program)
})

PaymentController.get("/", async (req: Request, res: Response, next: NextFunction) => {
  const program = Effect.gen(function* (_) {
    const paymentService = yield* PaymentService
    const payments = yield* paymentService.listAll()
    return ok(payments.map(PaymentResponse.fromPayment))
  })

  runEffect(req, res, next, program)
})

PaymentController.get("/order/:orderId", async (req: Request, res: Response, next: NextFunction) => {
  const program = Effect.gen(function* (_) {
    const { orderId } = yield* decodeParams(OrderIdParams, req)
    const paymentService = yield* PaymentService
    const payments = yield* paymentService.listByOrderId(orderId)
    return ok(payments.map(PaymentResponse.fromPayment))
  })

  runEffect(req, res, next, program)
})

PaymentController.patch("/:id/status", async (req: Request, res: Response, next: NextFunction) => {
  const program = Effect.gen(function* (_) {
    const { id } = yield* decodeParams(IdParams, req)
    const input = yield* decodeBody(PaymentUpdateStatusInput, req)
    const paymentService = yield* PaymentService
    return ok(PaymentResponse.fromPayment(yield* paymentService.updateStatus(id, input.status)))
  }).pipe(Effect.catchTag("payment/PaymentNotFoundError", (error) => Effect.succeed(notFound(error.message))))

  runEffect(req, res, next, program)
})

PaymentController.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  const program = Effect.gen(function* (_) {
    const { id } = yield* decodeParams(IdParams, req)
    const paymentService = yield* PaymentService
    return ok(PaymentResponse.fromPayment(yield* paymentService.getById(id)))
  }).pipe(Effect.catchTag("payment/PaymentNotFoundError", (error) => Effect.succeed(notFound(error.message))))

  runEffect(req, res, next, program)
})
