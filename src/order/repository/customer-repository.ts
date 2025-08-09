import { Context, Data, Effect, Layer } from "effect"
import { CustomerCreateInput } from "order/dto/customer-dto"
import { UnknownException } from "effect/Cause"
import { PrismaService } from "prisma-service"
import { Customer } from "@prisma/client"

export class CustomerRepository extends Context.Tag("delivery/CustomerRepository")<
  CustomerRepository,
  {
    readonly createCustomer: (customerInput: CustomerCreateInput) => Effect.Effect<Customer, UnknownException>
    readonly getCustomers: () => Effect.Effect<Array<Customer>, UnknownException>
    readonly getCustomerById: (id: string) => Effect.Effect<Customer | null, UnknownException>
  }
>() {}

export type CustomerRepositoryShape = Context.Tag.Service<CustomerRepository>

export const CustomerRepositoryLive = Layer.effect(
  CustomerRepository,
  Effect.gen(function* () {
    // const config = yield* ConfigService
    const prismaService = yield* PrismaService

    return CustomerRepository.of({
      createCustomer: (customerInput: CustomerCreateInput): Effect.Effect<Customer, UnknownException> => {
        return Effect.tryPromise(() =>
          prismaService.prisma.customer.create({
            data: {
              name: customerInput.name,
              address: customerInput.address,
              email: customerInput.email,
              phone: customerInput.phone,
            },
          })
        )
      },
      getCustomers: () => {
        return Effect.tryPromise(() => prismaService.prisma.customer.findMany())
      },
      getCustomerById: (id: string) => {
        return Effect.tryPromise(() => prismaService.prisma.customer.findUnique({ where: { id } }))
      },
    })
  })
)
