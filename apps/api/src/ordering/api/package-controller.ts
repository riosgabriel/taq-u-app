import { runEffect } from "@/middleware/effect-runner"
import { notFound, ok } from "@/middleware/http"
import { decodeParams } from "@/middleware/validate"
import { OrderService } from "ordering/services/order-service"
import { Effect, Schema } from "effect"
import { NextFunction, Request, Response, Router } from "express"

/**
 * Top-level package endpoints. The order context owns the package
 * aggregate (packages are always created within an order, and live
 * within an order's lifecycle), so the service that resolves a
 * package by tracking number is `OrderService.findPackageByTrackingNumber`.
 * This controller is a thin shim that exposes that lookup as a
 * public tracking endpoint — the same lookup the frontend
 * `PackageTracker` component uses.
 */
export const PackageController = Router()

class TrackingNumberParams extends Schema.Class<TrackingNumberParams>("ordering/TrackingNumberParams")({
  trackingNumber: Schema.String,
}) {}

PackageController.get("/track/:trackingNumber", async (req: Request, res: Response, next: NextFunction) => {
  const program = Effect.gen(function* (_) {
    const { trackingNumber } = yield* decodeParams(TrackingNumberParams, req)
    const orderService = yield* OrderService
    const result = yield* orderService.findPackageByTrackingNumber(trackingNumber)
    return ok({
      trackingNumber: result.package.trackingNumber,
      status: result.package.status,
      senderName: result.order.customerName,
      recipientAddress: result.order.deliveryAddress,
      pickupAddress: result.order.pickupAddress,
      pickupDate: result.order.pickupDate,
      estimatedDelivery: result.order.pickupDate,
      updates: [],
    })
  }).pipe(Effect.catchTag("order/PackageNotFoundError", (error) => Effect.succeed(notFound(error.message))))

  runEffect(req, res, next, program)
})
