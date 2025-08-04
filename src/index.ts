import { CustomerController } from "@delivery/api/customer-controller"
import dotenv from "dotenv"
import { Console, Effect } from "effect"
import express from "express"

dotenv.config()

const startServer = Effect.suspend(() => {
  const app = express()
  const PORT = 3000 // Use config provider

  const apiRouter = express.Router()

  apiRouter.use("/customers", CustomerController)

  app.use("/api", apiRouter)

  app.use(express.json())

  return Effect.try(() => app.listen(PORT)).pipe(
    Effect.tap((_) => Console.log(`Server is running on http://localhost:${PORT}`))
  )
})

Effect.runPromise(startServer)
