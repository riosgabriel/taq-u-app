import { runEffect } from "@/middleware/effect-runner"
import { CustomerCreateInput, CustomerResponse } from "@order/dto/customer-dto"
import { CustomerService } from "@order/services/customer-service"
import { Effect, Schema } from "effect"
import { NextFunction, Request, Response, Router } from "express"

export const CustomerController = Router()

CustomerController.get("/", async (req: Request, res: Response<Array<CustomerResponse>>, next: NextFunction) => {
  const program = Effect.gen(function* (_) {
    const customerService = yield* CustomerService
    const customers = yield* customerService.getCustomers()
    return customers.map(CustomerResponse.fromCustomer)
  })

  runEffect(req, res, next, program, (customers) => {
    res.json(customers)
  })
})

CustomerController.get("/:id", async (req: Request, res: Response<CustomerResponse>, next: NextFunction) => {
  const program = Effect.gen(function* (_) {
    const customerService = yield* CustomerService
    return CustomerResponse.fromCustomer(
      yield* customerService.getCustomerById(req.params.id)
    )
  })

  runEffect(req, res, next, program, (customer) => {
    res.json(customer)
  })
})

CustomerController.post("/", async (req: Request, res: Response<CustomerResponse>, next: NextFunction) => {
  const program = Effect.gen(function* (_) {
    const customerInput = yield* Schema.decodeUnknown(CustomerCreateInput)(req.body)
    const customerService = yield* CustomerService
    return CustomerResponse.fromCustomer(
      yield* customerService.createCustomer(customerInput)
    )
  })

  runEffect(req, res, next, program, (customer) => {
    res.json(customer)
  })
})
