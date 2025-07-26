import { Effect, Context, Layer } from "effect"
import Customer from "@delivery/domain/customer"
import { CustomerRepository } from "@delivery/repository/customer-repository"
import { UnknownException } from "effect/Cause"
import { CustomerCreateInput } from "@delivery/dto/customer-dto"

export class CustomerService extends Context.Tag("CustomerService")<
  CustomerService,
  {
    readonly createCustomer: (customerCreateInput: CustomerCreateInput) => Effect.Effect<Customer, UnknownException>
    readonly getCustomers: () => Effect.Effect<Customer[], UnknownException>
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
    })
  })
)
