import { DriverController } from "@order/api/driver-controller"
import { OrderController } from "@order/api/order-controller"
import dotenv from "dotenv"
import { Console, Effect } from "effect"
import express from "express"
import { CustomerController } from "order/api/customer-controller"

dotenv.config()

const startServer = Effect.suspend(() => {
  const app = express()
  const PORT = 3000 // Use config provider

  app.use(express.json())

  const apiRouter = express.Router()

  apiRouter.use("/customers", CustomerController)
  apiRouter.use("/orders", OrderController)
  apiRouter.use("/drivers", DriverController)

  app.use("/api", apiRouter)

  return Effect.try(() => app.listen(PORT)).pipe(
    Effect.tap((_) => Console.log(`Server is running on http://localhost:${PORT}`))
  )
})

Effect.runPromise(startServer)
