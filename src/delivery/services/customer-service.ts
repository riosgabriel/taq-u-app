import { Effect, Context, Layer, Data } from "effect"
import Customer from "@delivery/domain/customer"
import { CustomerRepository } from "@delivery/repository/customer-repository"
import { UnknownException } from "effect/Cause"
import { CustomerCreateInput } from "@delivery/dto/customer-dto"

export class CustomerNotFoundError extends Data.TaggedError("delivery/CustomerNotFoundError")<{
  readonly message: string
}> {}

export class CustomerService extends Context.Tag("delivery/CustomerService")<
  CustomerService,
  {
    readonly createCustomer: (customerCreateInput: CustomerCreateInput) => Effect.Effect<Customer, UnknownException>
    readonly getCustomers: () => Effect.Effect<Customer[], UnknownException>
    readonly getCustomerById: (id: string) => Effect.Effect<Customer, CustomerNotFoundError | UnknownException>
  }
>() {}

export const CustomerServiceLive = Layer.effect(
  CustomerService,
  Effect.gen(function* () {
    const repository = yield* CustomerRepository

    return CustomerService.of({
      createCustomer: (customerCreateInput: CustomerCreateInput) => {
        return Effect.gen(function* () {
          return yield* repository.createCustomer(customerCreateInput)
        })
      },

      getCustomers: () => {
        return Effect.gen(function* () {
          return yield* repository.getCustomers()
        })
      },
      getCustomerById: (id: string) => {
        return Effect.gen(function* () {
          const customer = yield* repository.getCustomerById(id)

          return customer === null
            ? yield* Effect.fail(new CustomerNotFoundError({ message: `Customer with id ${id} not found` }))
            : yield* Effect.succeed(customer)
        })
      },
    })
  })
)
