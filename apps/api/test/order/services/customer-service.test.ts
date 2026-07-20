import { RecordNotFoundError } from "@/persistence-errors"
import { describe, expect, it } from "@effect/vitest"
import { assertLeft } from "@effect/vitest/utils"
import { CustomerEmailAlreadyExistsError, CustomerRepository } from "customer/repository/customer-repository"
import { CustomerNotFoundError, CustomerService, CustomerServiceLive } from "customer/services/customer-service"
import { Effect, Layer } from "effect"

const customer = {
  id: "cust-123",
  name: "John Doe",
  email: "john@example.com",
  phone: "123-456-7890",
  address: "123 Main St",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
}

const buildTestLayer = (mockRepo: typeof CustomerRepository.Service) =>
  CustomerServiceLive.pipe(Layer.provide(Layer.succeed(CustomerRepository, mockRepo)))

describe("CustomerService", () => {
  describe("getCustomers", () => {
    it.effect("returns all customers", () =>
      Effect.gen(function* () {
        const service = yield* CustomerService
        const result = yield* service.getCustomers()
        expect(result).toEqual([customer])
      }).pipe(
        Effect.provide(
          buildTestLayer(
            CustomerRepository.of({
              createCustomer: () => Effect.die("unexpected"),
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
              createCustomer: () => Effect.die("unexpected"),
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
        const result = yield* service.getCustomerById("cust-123")
        expect(result).toEqual(customer)
      }).pipe(
        Effect.provide(
          buildTestLayer(
            CustomerRepository.of({
              createCustomer: () => Effect.die("unexpected"),
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
          return yield* service.getCustomerById("missing-id")
        }).pipe(Effect.either)

        const result = yield* program
        assertLeft(result, new CustomerNotFoundError({ customerId: "missing-id", message: "Not found" }))
      }).pipe(
        Effect.provide(
          buildTestLayer(
            CustomerRepository.of({
              createCustomer: () => Effect.die("unexpected"),
              getCustomers: () => Effect.die("unexpected"),
              getCustomerById: (_id) =>
                Effect.fail(new RecordNotFoundError({ model: "Customer", id: _id, message: "Not found" })),
            })
          )
        )
      )
    )
  })

  describe("createCustomer", () => {
    const input = {
      name: "New Customer",
      email: "new@example.com",
      phone: "999-999-9999",
      address: "456 Oak Ave",
    }

    it.effect("creates and returns the customer", () =>
      Effect.gen(function* () {
        const service = yield* CustomerService
        const result = yield* service.createCustomer(input)
        expect(result).toMatchObject(input)
      }).pipe(
        Effect.provide(
          buildTestLayer(
            CustomerRepository.of({
              createCustomer: (data) =>
                Effect.succeed({
                  id: "cust-new",
                  ...data,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                }),
              getCustomers: () => Effect.die("unexpected"),
              getCustomerById: () => Effect.die("unexpected"),
            })
          )
        )
      )
    )

    it.effect("fails with CustomerEmailAlreadyExistsError when email is taken", () =>
      Effect.gen(function* () {
        const program = Effect.gen(function* () {
          const service = yield* CustomerService
          return yield* service.createCustomer(input)
        }).pipe(Effect.either)

        const result = yield* program
        assertLeft(
          result,
          new CustomerEmailAlreadyExistsError({
            message: "Customer with email new@example.com already exists",
            email: input.email,
          })
        )
      }).pipe(
        Effect.provide(
          buildTestLayer(
            CustomerRepository.of({
              createCustomer: () =>
                Effect.fail(
                  new CustomerEmailAlreadyExistsError({
                    message: "Customer with email new@example.com already exists",
                    email: input.email,
                  })
                ),
              getCustomers: () => Effect.die("unexpected"),
              getCustomerById: () => Effect.die("unexpected"),
            })
          )
        )
      )
    )
  })
})
