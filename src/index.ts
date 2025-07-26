import express, { Request, Response } from "express"
import dotenv from "dotenv"
import { CustomerRepository, CustomerRepositoryLive } from "@delivery/repository/customer-repository"
import { Effect, Console } from "effect"
import { PrismaLive } from "@delivery/services/prisma-service"
import { CustomerService, CustomerServiceLive } from "@delivery/services/customer-service"
import Customer from "@delivery/domain/customer"
import { CustomerCreateInput, CustomerResponse } from "@delivery/dto/customer-dto"

dotenv.config()

const startServer = Effect.suspend(() => {
  const app = express()
  const PORT = 3000 // Use config provider

  app.use(express.json())

  app.get("/customers", async (_req, res: Response<Customer[]>) => {
    const customersEffect = CustomerService.pipe(
      Effect.andThen((customerService) => customerService.getCustomers()),
      Effect.provide(CustomerServiceLive),
      Effect.provide(CustomerRepositoryLive),
      Effect.provide(PrismaLive)
    )

    const customers = await Effect.runPromise(customersEffect)

    res.json(customers)
  })

  app.post("/customers", async (req, res: Response<CustomerResponse>) => {
    const customerInput = CustomerCreateInput.make(req.body)

    const customerCreatedEffect = CustomerService.pipe(
      Effect.andThen((customerService) => customerService.createCustomer(customerInput)),
      Effect.provide(CustomerServiceLive),
      Effect.provide(CustomerRepositoryLive),
      Effect.provide(PrismaLive),
      Effect.map((customer: Customer) => CustomerResponse.fromCustomer(customer))
    )

    const customerResponse = await Effect.runPromise(customerCreatedEffect)

    res.json(customerResponse)
  })

  return Effect.try(() => app.listen(PORT)).pipe(
    Effect.tap((_) => Console.log(`Server is running on http://localhost:${PORT}`))
  )
})

Effect.runPromise(startServer)
