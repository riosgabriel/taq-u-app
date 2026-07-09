import { decodeBody, decodeParams, IdParams } from "@/middleware/validate"
import { runEffect } from "@/middleware/effect-runner"
import { conflict, notFound, ok } from "@/middleware/http"
import { CustomerCreateInput, CustomerResponse } from "@order/dto/customer-dto"
import { CustomerService } from "@order/services/customer-service"
import { Effect } from "effect"
import { NextFunction, Request, Response, Router } from "express"

export const CustomerController = Router()

CustomerController.get("/", async (req: Request, res: Response, next: NextFunction) => {
  const program = Effect.gen(function* (_) {
    const customerService = yield* CustomerService
    const customers = yield* customerService.getCustomers()
    return ok(customers.map(CustomerResponse.fromCustomer))
  })

  runEffect(req, res, next, program)
})

CustomerController.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  const program = Effect.gen(function* (_) {
    const { id } = yield* decodeParams(IdParams, req)
    const customerService = yield* CustomerService
    return ok(CustomerResponse.fromCustomer(yield* customerService.getCustomerById(id)))
  }).pipe(
    Effect.catchTag("order/CustomerNotFoundError", (error) => Effect.succeed(notFound(error.message)))
  )

  runEffect(req, res, next, program)
})

CustomerController.post("/", async (req: Request, res: Response, next: NextFunction) => {
  const program = Effect.gen(function* (_) {
    const customerInput = yield* decodeBody(CustomerCreateInput, req)
    const customerService = yield* CustomerService
    return ok(CustomerResponse.fromCustomer(yield* customerService.createCustomer(customerInput)))
  }).pipe(
    Effect.catchTag("order/CustomerEmailAlreadyExistsError", (error) => Effect.succeed(conflict(error.message)))
  )

  runEffect(req, res, next, program)
})
