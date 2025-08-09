import Customer from "order/domain/customer"
import { CustomerCreateInput, CustomerResponse } from "order/dto/customer-dto"
import { CustomerRepositoryLive } from "order/repository/customer-repository"
import { CustomerService, CustomerServiceLive } from "order/services/customer-service"
import { PrismaLive } from "prisma-service"
import { Effect } from "effect"
import { Request, Response, Router } from "express"

export const CustomerController = Router()

CustomerController.get("/", async (_req, res: Response<Customer[] | { message: string }>) => {
  const customersEffect = CustomerService.pipe(
    Effect.andThen((customerService) => customerService.getCustomers()),
    Effect.map((customers: Customer[]) => {
      const customersResponse = customers.map(CustomerResponse.fromCustomer)
      return res.json(customersResponse)
    }),
    Effect.catchAll((error) =>
      Effect.sync(() => {
        console.error(error)
        res.status(500).json({ message: "Internal Server Error" })
      })
    )
  ).pipe(Effect.provide(CustomerServiceLive), Effect.provide(CustomerRepositoryLive), Effect.provide(PrismaLive))

  Effect.runPromise(customersEffect)
})

CustomerController.get("/:id", async (req: Request, res: Response<CustomerResponse | { message: string }>) => {
  const customerId = req.params.id

  const customerByIdEffect = CustomerService.pipe(
    Effect.andThen((customerService) => customerService.getCustomerById(customerId)),
    Effect.map((customer: Customer) => {
      const customerResponse = CustomerResponse.fromCustomer(customer)
      return res.json(customerResponse)
    }),
    Effect.catchTag("delivery/CustomerNotFoundError", (error) =>
      Effect.sync(() => res.status(404).json({ message: error.message }))
    )
  ).pipe(Effect.provide(CustomerServiceLive), Effect.provide(CustomerRepositoryLive), Effect.provide(PrismaLive))

  Effect.runPromise(customerByIdEffect)
})

CustomerController.post("/", async (req: Request, res: Response<CustomerResponse | { message: string }>) => {
  const customerInput = CustomerCreateInput.make(req.body)

  const customerCreatedEffect = CustomerService.pipe(
    Effect.andThen((customerService) => customerService.createCustomer(customerInput)),
    Effect.map((customer: Customer) => {
      const response = CustomerResponse.fromCustomer(customer)
      return res.json(response)
    }),
    Effect.catchAll((error) =>
      Effect.sync(() => {
        console.error(error)
        res.status(500).json({ message: "Internal Server Error" })
      })
    )
  ).pipe(Effect.provide(CustomerServiceLive), Effect.provide(CustomerRepositoryLive), Effect.provide(PrismaLive))

  Effect.runPromise(customerCreatedEffect)
})
