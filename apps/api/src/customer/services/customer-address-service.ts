import { CustomerAddress } from "customer/domain/customer-address"
import { CreateAddressInput, UpdateAddressInput } from "customer/dto/customer-address-dto"
import { CustomerAddressId } from "@/ids"
import { CustomerId } from "@/ids"
import { PersistenceError } from "@/persistence-errors"
import { CustomerAddressRepository } from "customer/repository/customer-address-repository"
import { Context, Data, Effect, Layer } from "effect"

export class CustomerAddressNotFoundError extends Data.TaggedError("customer/CustomerAddressNotFoundError")<{
  readonly addressId: string
  readonly message: string
}> {}

export class CustomerAddressService extends Context.Tag("customer/CustomerAddressService")<
  CustomerAddressService,
  {
    readonly listByCustomer: (customerId: CustomerId) => Effect.Effect<CustomerAddress[], PersistenceError>
    readonly create: (
      customerId: CustomerId,
      input: CreateAddressInput
    ) => Effect.Effect<CustomerAddress, PersistenceError>
    readonly update: (
      customerId: CustomerId,
      addressId: CustomerAddressId,
      input: UpdateAddressInput
    ) => Effect.Effect<CustomerAddress, CustomerAddressNotFoundError | PersistenceError>
    readonly delete: (
      customerId: CustomerId,
      addressId: CustomerAddressId
    ) => Effect.Effect<void, CustomerAddressNotFoundError | PersistenceError>
  }
>() {}

export type CustomerAddressServiceShape = Context.Tag.Service<CustomerAddressService>

export const CustomerAddressServiceLive = Layer.effect(
  CustomerAddressService,
  Effect.gen(function* () {
    const repository = yield* CustomerAddressRepository

    return CustomerAddressService.of({
      listByCustomer: (customerId: CustomerId) => {
        return repository.listByCustomer(customerId).pipe(Effect.map((rows) => rows.map(CustomerAddress.fromPrisma)))
      },
      create: (customerId: CustomerId, input: CreateAddressInput) => {
        return repository.create(customerId, input).pipe(Effect.map(CustomerAddress.fromPrisma))
      },
      update: (customerId: CustomerId, addressId: CustomerAddressId, input: UpdateAddressInput) => {
        return repository.update(customerId, addressId, input).pipe(
          Effect.map(CustomerAddress.fromPrisma),
          Effect.catchTag("persistence/RecordNotFoundError", (error: { message: string }) =>
            Effect.fail(new CustomerAddressNotFoundError({ addressId, message: error.message }))
          )
        )
      },
      delete: (customerId: CustomerId, addressId: CustomerAddressId) => {
        return repository
          .delete(customerId, addressId)
          .pipe(
            Effect.catchTag("persistence/RecordNotFoundError", (error: { message: string }) =>
              Effect.fail(new CustomerAddressNotFoundError({ addressId, message: error.message }))
            )
          )
      },
    })
  })
)
