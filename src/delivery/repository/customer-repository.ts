import { Context, Effect } from "effect"
import Customer from "@delivery/domain/customer"
import { PrismaClient } from "@prisma/client"
import { CustomerCreateInput } from "@delivery/dto/customer-dto"
import { UnknownException } from "effect/Cause"

const prisma = new PrismaClient()

export class CustomerRepository extends Context.Tag("delivery/repository/CustomerRepository")<
  CustomerRepository,
  {
    readonly createCustomer: (customerInput: CustomerCreateInput) => Effect.Effect<Customer, UnknownException>
    readonly getCustomers: () => Effect.Effect<Array<Customer>, UnknownException>
  }
>() {}

export type CustomerRepositoryShape = Context.Tag.Service<CustomerRepository>

const getCustomers = () => {
  return Effect.tryPromise(() => prisma.customer.findMany())
}

const createCustomer = (customerInput: CustomerCreateInput): Effect.Effect<Customer, UnknownException> => {
  return Effect.tryPromise(() =>
    prisma.customer.create({
      data: {
        name: customerInput.name,
        address: customerInput.address,
        email: customerInput.email,
        phone: customerInput.phone,
      },
    })
  ).pipe(
    Effect.map((customerPrisma) => {
      return {
        id: customerPrisma.id,
        name: customerPrisma.name,
        address: customerPrisma.address,
        email: customerPrisma.email,
        phone: customerPrisma.phone,
      }
    })
  )
}

export { createCustomer, getCustomers }
