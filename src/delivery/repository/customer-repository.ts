import { Context, Effect, Layer } from "effect"
import Customer from "@delivery/domain/customer"
import { CustomerCreateInput } from "@delivery/dto/customer-dto"
import { UnknownException } from "effect/Cause"
import { PrismaService } from "@delivery/services/prisma-service"

export class CustomerRepository extends Context.Tag("delivery/repository/CustomerRepository")<
  CustomerRepository,
  {
    readonly createCustomer: (customerInput: CustomerCreateInput) => Effect.Effect<Customer, UnknownException>
    readonly getCustomers: () => Effect.Effect<Array<Customer>, UnknownException>
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
      },
      getCustomers: () => {
        return Effect.tryPromise(() => prismaService.prisma.customer.findMany())
      },
    })
  })
)
