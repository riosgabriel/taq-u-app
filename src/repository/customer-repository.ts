import { Effect } from "effect"
import Customer from "../domain/customer"
import prisma from "../prisma"
import { CustomerCreateInput } from "../api/customer-dto"
import { UnknownException } from "effect/Cause"

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
