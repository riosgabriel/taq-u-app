import { PersistenceError, RecordNotFoundError } from "@/persistence-errors"
import { Customer } from "@prisma/client"
import { Context, Data, Effect, Layer } from "effect"
import { CustomerCreateInput } from "order/dto/customer-dto"
import { PrismaService } from "prisma-service"

export class CustomerEmailAlreadyExistsError extends Data.TaggedError("order/CustomerEmailAlreadyExistsError")<{
  readonly message: string
  readonly email: string
}> {}

const customerNotFound = (id: string) =>
  new RecordNotFoundError({ model: "Customer", id, message: `Customer with id ${id} not found` })

export class CustomerRepository extends Context.Tag("order/CustomerRepository")<
  CustomerRepository,
  {
    readonly createCustomer: (
      customerInput: CustomerCreateInput
    ) => Effect.Effect<Customer, CustomerEmailAlreadyExistsError | PersistenceError>
    readonly getCustomers: () => Effect.Effect<Array<Customer>, PersistenceError>
    readonly getCustomerById: (id: string) => Effect.Effect<Customer, PersistenceError>
  }
>() {}

export type CustomerRepositoryShape = Context.Tag.Service<CustomerRepository>

export const CustomerRepositoryLive = Layer.effect(
  CustomerRepository,
  Effect.gen(function* () {
    const prismaService = yield* PrismaService

    return CustomerRepository.of({
      createCustomer: (customerInput: CustomerCreateInput) => {
        return prismaService
          .execute(() =>
            prismaService.prisma.customer.create({
              data: {
                name: customerInput.name,
                address: customerInput.address,
                email: customerInput.email,
                phone: customerInput.phone,
              },
            })
          )
          .pipe(
            Effect.catchTag("UniqueConstraintViolation", () =>
              Effect.fail(
                new CustomerEmailAlreadyExistsError({
                  message: `Customer with email ${customerInput.email} already exists`,
                  email: customerInput.email,
                })
              )
            )
          )
      },
      getCustomers: () => {
        return prismaService.execute(() => prismaService.prisma.customer.findMany())
      },
      getCustomerById: (id: string) => {
        return prismaService
          .execute(() => prismaService.prisma.customer.findUnique({ where: { id } }))
          .pipe(
            Effect.flatMap((customer) => (customer ? Effect.succeed(customer) : Effect.fail(customerNotFound(id))))
          )
      },
    })
  })
)
