import { RecordNotFoundError } from "@/persistence-errors"
import { CustomerId } from "@/ids"
import { describe, expect, it } from "@effect/vitest"
import { assertLeft } from "@effect/vitest/utils"
import { CustomerRepository } from "customer/repository/customer-repository"
import { CustomerNotFoundError, CustomerService, CustomerServiceLive } from "customer/services/customer-service"
import { Effect, Layer, Schema } from "effect"

const customer = {
  id: "cust-123",
  name: "John Doe",
  email: "john@example.com",
  phone: "123-456-7890",
  address: "123 Main St",
  passwordHash: "scrypt$test-hash",
}

const customerEntity = {
  id: "cust-123",
  name: "John Doe",
  email: "john@example.com",
  phone: "123-456-7890",
  address: "123 Main St",
}

const buildTestLayer = (mockRepo: typeof CustomerRepository.Service) =>
  CustomerServiceLive.pipe(Layer.provide(Layer.succeed(CustomerRepository, mockRepo)))

describe("CustomerService", () => {
  describe("getCustomers", () => {
    it.effect("returns all customers", () =>
      Effect.gen(function* () {
        const service = yield* CustomerService
        const result = yield* service.getCustomers()
        expect(result).toEqual([customerEntity])
      }).pipe(
        Effect.provide(
          buildTestLayer(
            CustomerRepository.of({
              getCustomers: () => Effect.succeed([customer]),
              getCustomerById: () => Effect.die("unexpected"),
            })
          )
        )
      )
    )

    it.effect("returns empty list when no customers exist", () =>
      Effect.gen(function* () {
        const service = yield* CustomerService
        const result = yield* service.getCustomers()
        expect(result).toEqual([])
      }).pipe(
        Effect.provide(
          buildTestLayer(
            CustomerRepository.of({
              getCustomers: () => Effect.succeed([]),
              getCustomerById: () => Effect.die("unexpected"),
            })
          )
        )
      )
    )
  })

  describe("getCustomerById", () => {
    it.effect("returns the customer when found", () =>
      Effect.gen(function* () {
        const service = yield* CustomerService
        const result = yield* service.getCustomerById(Schema.decodeSync(CustomerId)("cust-123"))
        expect(result).toEqual(customerEntity)
      }).pipe(
        Effect.provide(
          buildTestLayer(
            CustomerRepository.of({
              getCustomers: () => Effect.die("unexpected"),
              getCustomerById: () => Effect.succeed(customer),
            })
          )
        )
      )
    )

    it.effect("fails with CustomerNotFoundError when customer does not exist", () =>
      Effect.gen(function* () {
        const program = Effect.gen(function* () {
          const service = yield* CustomerService
          return yield* service.getCustomerById(Schema.decodeSync(CustomerId)("missing-id"))
        }).pipe(Effect.either)

        const result = yield* program
        assertLeft(result, new CustomerNotFoundError({ customerId: "missing-id", message: "Not found" }))
      }).pipe(
        Effect.provide(
          buildTestLayer(
            CustomerRepository.of({
              getCustomers: () => Effect.die("unexpected"),
              getCustomerById: (_id) =>
                Effect.fail(new RecordNotFoundError({ model: "Customer", id: _id, message: "Not found" })),
            })
          )
        )
      )
    )
  })
})
