import { PersistenceError } from "@/persistence-errors"
import { CustomerId } from "@/ids"
import { Context, Data, Effect, Layer } from "effect"
import Customer from "customer/domain/customer"
import { CustomerRepository } from "customer/repository/customer-repository"

export class CustomerNotFoundError extends Data.TaggedError("order/CustomerNotFoundError")<{
  readonly customerId: string
  readonly message: string
}> {}

export class CustomerService extends Context.Tag("order/CustomerService")<
  CustomerService,
  {
    readonly getCustomers: () => Effect.Effect<Customer[], PersistenceError>
    readonly getCustomerById: (id: CustomerId) => Effect.Effect<Customer, CustomerNotFoundError | PersistenceError>
  }
>() {}

export const CustomerServiceLive = Layer.effect(
  CustomerService,
  Effect.gen(function* () {
    const repository = yield* CustomerRepository

    return CustomerService.of({
      getCustomers: () => {
        return Effect.gen(function* () {
          const customers = yield* repository.getCustomers()
          return customers.map(Customer.fromPrisma)
        })
      },

      getCustomerById: (id: CustomerId) => {
        return repository.getCustomerById(id).pipe(
          Effect.map(Customer.fromPrisma),
          Effect.catchTag("persistence/RecordNotFoundError", (error) =>
            Effect.fail(new CustomerNotFoundError({ customerId: id, message: error.message }))
          )
        )
      },
    })
  })
)
