import cors from "cors"
import { CustomerController } from "customer/api/customer-controller"
import { DeliveryController } from "delivery/api/delivery-controller"
import { DriverController } from "delivery/api/driver-controller"
import dotenv from "dotenv"
import { Effect } from "effect"
import { EstimateController } from "estimate/api/estimate-controller"
import express from "express"
import { HealthController } from "health/api/health-controller"
import { LocationController } from "location/api/location-controller"
import { OrderController } from "ordering/api/order-controller"
import { RouteController } from "route/api/route-controller"
import { effectErrorHandler } from "./middleware/error-handler"
import { AppRuntime } from "./runtime"

dotenv.config()

const startServer = Effect.suspend(() => {
  const app = express()
  const PORT = 3000

  app.use(cors())
  app.use(express.json())

  app.locals.runtime = AppRuntime

  const apiRouter = express.Router()

  apiRouter.use("/customers", CustomerController)
  apiRouter.use("/orders", OrderController)
  apiRouter.use("/drivers", DriverController)
  apiRouter.use("/deliveries", DeliveryController)
  apiRouter.use("/estimates", EstimateController)
  apiRouter.use("/locations", LocationController)
  apiRouter.use("/routes", RouteController)

  app.use("/api", apiRouter)
  app.use(HealthController)
  app.use(effectErrorHandler)

  return Effect.gen(function* () {
    const server = yield* Effect.try(() => {
      const s = app.listen(PORT)
      s.timeout = 30_000
      s.keepAliveTimeout = 5_000
      s.headersTimeout = 31_000
      return s
    })

    process.on("SIGTERM", async () => {
      const forceExit = setTimeout(() => process.exit(1), 10_000)
      server.closeIdleConnections?.()
      await new Promise<void>((resolve) => server.close(() => resolve()))
      await Effect.runPromise(AppRuntime.disposeEffect).catch((err) =>
        console.error("Effect runtime dispose failed:", err)
      )
      clearTimeout(forceExit)
      process.exit(0)
    })

    yield* Effect.logInfo(`Server is running on http://localhost:${PORT}`)
    return server
  })
})

Effect.runPromise(startServer)
