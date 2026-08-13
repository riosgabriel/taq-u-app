import { requireAuth } from "@/middleware/auth"
import { decodeBody, decodeParams } from "@/middleware/validate"
import { runEffect } from "@/middleware/effect-runner"
import { notFound, ok, unauthorized } from "@/middleware/http"
import { CustomerAddressId, CustomerId } from "@/ids"
import {
  CustomerAddressResponse,
  CreateAddressInput,
  UpdateAddressInputSchema,
} from "customer/dto/customer-address-dto"
import { CustomerResponse } from "customer/dto/customer-dto"
import { CustomerAddressService } from "customer/services/customer-address-service"
import { CustomerService } from "customer/services/customer-service"
import { Effect, Schema } from "effect"
import { NextFunction, Request, Response, Router } from "express"

const CustomerIdParams = Schema.Struct({ id: CustomerId })

const CustomerAddressIdParams = Schema.Struct({ id: CustomerAddressId })

export const CustomerController = Router()

CustomerController.get("/", async (req: Request, res: Response, next: NextFunction) => {
  const program = Effect.gen(function* (_) {
    const customerService = yield* CustomerService
    const customers = yield* customerService.getCustomers()
    return ok(customers.map(CustomerResponse.fromCustomer))
  })

  runEffect(req, res, next, program)
})

CustomerController.get("/me/addresses", async (req: Request, res: Response, next: NextFunction) => {
  const program = Effect.gen(function* (_) {
    const customerId = yield* requireAuth(req)
    const addressService = yield* CustomerAddressService
    const addresses = yield* addressService.listByCustomer(customerId)
    return ok(addresses.map(CustomerAddressResponse.fromEntity))
  }).pipe(Effect.catchTag("auth/InvalidTokenError", (error) => Effect.succeed(unauthorized(error.message))))

  runEffect(req, res, next, program)
})

CustomerController.post("/me/addresses", async (req: Request, res: Response, next: NextFunction) => {
  const program = Effect.gen(function* (_) {
    const customerId = yield* requireAuth(req)
    const input = yield* decodeBody(CreateAddressInput, req)
    const addressService = yield* CustomerAddressService
    return ok(CustomerAddressResponse.fromEntity(yield* addressService.create(customerId, input)))
  }).pipe(Effect.catchTag("auth/InvalidTokenError", (error) => Effect.succeed(unauthorized(error.message))))

  runEffect(req, res, next, program)
})

CustomerController.put("/me/addresses/:id", async (req: Request, res: Response, next: NextFunction) => {
  const program = Effect.gen(function* (_) {
    const customerId = yield* requireAuth(req)
    const { id: addressId } = yield* decodeParams(CustomerAddressIdParams, req)
    const input = yield* decodeBody(UpdateAddressInputSchema, req)
    const addressService = yield* CustomerAddressService
    return ok(CustomerAddressResponse.fromEntity(yield* addressService.update(customerId, addressId, input)))
  }).pipe(
    Effect.catchTag("auth/InvalidTokenError", (error) => Effect.succeed(unauthorized(error.message))),
    Effect.catchTag("customer/CustomerAddressNotFoundError", (error) => Effect.succeed(notFound(error.message)))
  )

  runEffect(req, res, next, program)
})

CustomerController.delete("/me/addresses/:id", async (req: Request, res: Response, next: NextFunction) => {
  const program = Effect.gen(function* (_) {
    const customerId = yield* requireAuth(req)
    const { id: addressId } = yield* decodeParams(CustomerAddressIdParams, req)
    const addressService = yield* CustomerAddressService
    yield* addressService.delete(customerId, addressId)
    return ok({ message: "Customer address deleted successfully" })
  }).pipe(
    Effect.catchTag("auth/InvalidTokenError", (error) => Effect.succeed(unauthorized(error.message))),
    Effect.catchTag("customer/CustomerAddressNotFoundError", (error) => Effect.succeed(notFound(error.message)))
  )

  runEffect(req, res, next, program)
})

CustomerController.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  const program = Effect.gen(function* (_) {
    const { id } = yield* decodeParams(CustomerIdParams, req)
    const customerService = yield* CustomerService
    return ok(CustomerResponse.fromCustomer(yield* customerService.getCustomerById(id)))
  }).pipe(Effect.catchTag("order/CustomerNotFoundError", (error) => Effect.succeed(notFound(error.message))))

  runEffect(req, res, next, program)
})
