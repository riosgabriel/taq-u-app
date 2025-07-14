import express from "express"
import dotenv from "dotenv"
import * as CustomerRepository from "./repository/customer-repository"
import { Effect, Console } from "effect"
import { CustomerCreateInput, CustomerResponse } from "./api/customer-dto"

dotenv.config()

// TODO: create folder for the presentation layer with the schemas for customer creation
// like createCustomerInput or something
// with Customer Response
// Using Effect schema

const startServer = Effect.suspend(() => {
  const app = express()
  const PORT = 3000

  app.use(express.json())

  app.get("/customers", async (_req, res) => {
    const getCustomerEffect = CustomerRepository.getCustomers().pipe(
      Effect.map((customers) => customers.map((customer) => CustomerResponse.fromCustomer(customer)))
    )

    const customers = await Effect.runPromise(getCustomerEffect)

    res.json(customers)
  })

  app.post("/customers", async (req, res) => {
    const customerInput = CustomerCreateInput.make(req.body)

    const program = CustomerRepository.createCustomer(customerInput)

    const customer = await Effect.runPromise(program)

    res.json(customer)
  })

  return Effect.try(() => app.listen(PORT)).pipe(
    Effect.tap((_) => Console.log(`Server is running on http://localhost:${PORT}`))
  )
})

Effect.runPromise(startServer)
