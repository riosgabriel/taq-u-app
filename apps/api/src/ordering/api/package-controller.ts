import { runEffect } from "@/middleware/effect-runner"
import { notFound, ok } from "@/middleware/http"
import { decodeParams } from "@/middleware/validate"
import { EventBus } from "events/event-bus"
import { OrderService } from "ordering/services/order-service"
import { AppRuntime } from "@/runtime"
import { Effect, Fiber, PubSub, Schema } from "effect"
import { NextFunction, Request, Response, Router } from "express"

/**
 * Top-level package endpoints. The order context owns the package
 * aggregate (packages are always created within an order, and live
 * within an order's lifecycle), so the service that resolves a
 * package by tracking number is `OrderService.findPackageByTrackingNumber`.
 * This controller is a thin shim that exposes:
 *   - GET /api/packages/track/:trackingNumber — one-shot lookup
 *   - GET /api/packages/track/:trackingNumber/stream — Server-Sent
 *     Events stream of PackageStatusChanged events for that package
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
  }).pipe(
    Effect.catchTag("order/PackageNotFoundError", (error) => Effect.succeed(notFound(error.message)))
  )

  runEffect(req, res, next, program)
})

/**
 * Server-Sent Events stream of package status changes.
 *
 * The flow:
 *   1. Resolve the package ID from the tracking number (404 if not found).
 *   2. Set the SSE headers (Content-Type: text/event-stream, no-cache, keep-alive).
 *   3. Fork a fiber that subscribes to the in-process EventBus and writes
 *      each PackageStatusChanged event whose streamId matches this package
 *      to the response as `data: <json>\n\n`.
 *   4. On client disconnect (req 'close'), interrupt the fiber.
 *
 * The fork runs as a background fiber. Express's request handler returns
 * immediately after the headers are flushed; the SSE stream stays open
 * until the client disconnects or the process shuts down.
 *
 * No reconnection retry is needed on the client side — EventSource auto-
 * reconnects with the Last-Event-ID header. The browser will receive any
 * events that fired while the connection was down IF the backend persisted
 * them; currently the EventStore persists events to the DB, so a future
 * enhancement could replay missed events on reconnect.
 */
PackageController.get(
  "/track/:trackingNumber/stream",
  async (req: Request, res: Response, _next: NextFunction) => {
    // 1. Resolve the package ID.
    let packageId: string
    try {
      const result = await AppRuntime.runPromise(
        Effect.gen(function* () {
          const { trackingNumber } = yield* decodeParams(TrackingNumberParams, req)
          const orderService = yield* OrderService
          return yield* orderService.findPackageByTrackingNumber(trackingNumber)
        })
      )
      packageId = result.package.id
    } catch {
      res.status(404).json({ error: "Package not found" })
      return
    }

    // 2. Set SSE headers.
    res.setHeader("Content-Type", "text/event-stream")
    res.setHeader("Cache-Control", "no-cache")
    res.setHeader("Connection", "keep-alive")
    res.setHeader("X-Accel-Buffering", "no") // disable buffering on nginx-style proxies
    res.flushHeaders()

    // 3. Fork the subscription fiber.
    const streamId = `package:${packageId}`
    const fiber = AppRuntime.runFork(
      Effect.scoped(
        Effect.gen(function* () {
          const bus = yield* EventBus
          const dequeue = yield* PubSub.subscribe(bus)
          while (true) {
            const event = yield* dequeue.take
            if (event.type === "PackageStatusChanged" && event.streamId === streamId) {
              yield* Effect.sync(() => {
                res.write(`data: ${JSON.stringify(event.payload)}\n\n`)
              })
            }
          }
        })
      )
    )

    // 4. Clean up on client disconnect.
    req.on("close", () => {
      AppRuntime.runFork(Fiber.interrupt(fiber))
    })
  }
)
