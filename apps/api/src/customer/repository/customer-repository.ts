import { PersistenceError, RecordNotFoundError } from "@/persistence-errors"
import { CustomerId } from "@/ids"
import { Customer } from "@prisma/client"
import { Context, Effect, Layer } from "effect"
import { PrismaService } from "prisma-service"

const customerNotFound = (id: string) =>
  new RecordNotFoundError({ model: "Customer", id, message: `Customer with id ${id} not found` })

export class CustomerRepository extends Context.Tag("order/CustomerRepository")<
  CustomerRepository,
  {
    readonly getCustomers: () => Effect.Effect<Array<Customer>, PersistenceError>
    readonly getCustomerById: (id: CustomerId) => Effect.Effect<Customer, PersistenceError>
  }
>() {}

export type CustomerRepositoryShape = Context.Tag.Service<CustomerRepository>

export const CustomerRepositoryLive = Layer.effect(
  CustomerRepository,
  Effect.gen(function* () {
    const prismaService = yield* PrismaService

    return CustomerRepository.of({
      getCustomers: () => {
        return prismaService.execute(() => prismaService.prisma.customer.findMany())
      },
      getCustomerById: (id: CustomerId) => {
        return prismaService
          .execute(() => prismaService.prisma.customer.findUnique({ where: { id } }))
          .pipe(Effect.flatMap((customer) => (customer ? Effect.succeed(customer) : Effect.fail(customerNotFound(id)))))
      },
    })
  })
)
