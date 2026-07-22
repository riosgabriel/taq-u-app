import { DriverController } from "delivery/api/driver-controller"
import { OrderController } from "ordering/api/order-controller"
import cors from "cors"
import dotenv from "dotenv"
import { Effect } from "effect"
import express from "express"
import { CustomerController } from "customer/api/customer-controller"
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

  app.use("/api", apiRouter)
  app.use(effectErrorHandler)

  process.on("SIGTERM", () => {
    Effect.runPromise(AppRuntime.disposeEffect)
    process.exit(0)
  })

  return Effect.gen(function* () {
    const server = yield* Effect.try(() => {
      const s = app.listen(PORT)
      s.timeout = 30_000
      s.keepAliveTimeout = 5_000
      s.headersTimeout = 31_000
      return s
    })
    yield* Effect.logInfo(`Server is running on http://localhost:${PORT}`)
    return server
  })
})

Effect.runPromise(startServer)
