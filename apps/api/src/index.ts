import { DriverController } from "@order/api/driver-controller"
import { OrderController } from "@order/api/order-controller"
import { PackageController } from "@order/api/package-controller"
import cors from "cors"
import dotenv from "dotenv"
import { Effect } from "effect"
import express from "express"
import { CustomerController } from "@order/api/customer-controller"
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
  apiRouter.use("/packages", PackageController)

  app.use("/api", apiRouter)
  app.use(effectErrorHandler)
  
  process.on("SIGTERM", () => {
    Effect.runPromise(AppRuntime.disposeEffect)
    process.exit(0)
  })

  return Effect.try(() => app.listen(PORT)).pipe(
    Effect.tap((_) => Effect.logInfo(`Server is running on http://localhost:${PORT}`))
  )
})


Effect.runPromise(startServer)
