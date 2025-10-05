import { Customer, Prisma } from "@prisma/client"
import { Context, Data, Effect, Layer } from "effect"
import { UnknownException } from "effect/Cause"
import { CustomerCreateInput } from "order/dto/customer-dto"
import { PrismaService } from "prisma-service"

export class CustomerEmailAlreadyExistsError extends Data.TaggedError("order/CustomerEmailAlreadyExistsError")<{
  readonly message: string
  readonly email: string
}> {}

export class CustomerRepository extends Context.Tag("order/CustomerRepository")<
  CustomerRepository,
  {
    readonly createCustomer: (
      customerInput: CustomerCreateInput
    ) => Effect.Effect<Customer, CustomerEmailAlreadyExistsError | UnknownException>
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
      createCustomer: (customerInput: CustomerCreateInput) => {
        return Effect.tryPromise({
          try: () =>
            prismaService.prisma.customer.create({
              data: {
                name: customerInput.name,
                address: customerInput.address,
                email: customerInput.email,
                phone: customerInput.phone,
              },
            }),
          catch: (error) => {
            // TODO: what if we add another field to the unique constraint?
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
              return new CustomerEmailAlreadyExistsError({ message: error.message, email: customerInput.email })
            }

            return new UnknownException({ error })
          },
        })
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
