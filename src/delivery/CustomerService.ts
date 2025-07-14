import { Effect, Context } from "effect"
import Customer from "../domain/customer"

class CustomerService extends Context.Tag("CustomerService")<
  CustomerService,
  {
    readonly createCustomer: (name: string) => Effect.Effect<Customer>
  }
>() {}

class CustomerServiceLive extends CustomerService {
  createCustomer(name: string): Effect.Effect<Customer> {
    return Effect.succeed({ name } as Customer)
  }
}

export { CustomerService, CustomerServiceLive }
