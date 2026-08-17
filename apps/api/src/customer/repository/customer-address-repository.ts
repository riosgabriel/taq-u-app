import { CustomerAddress as PrismaCustomerAddress } from "@prisma/client"
import { CreateAddressInput, UpdateAddressInput } from "customer/dto/customer-address-dto"
import { CustomerAddressId } from "@/ids"
import { CustomerId } from "@/ids"
import { PersistenceError, RecordNotFoundError } from "@/persistence-errors"
import { Context, Effect, Either, Layer } from "effect"
import { PrismaService } from "prisma-service"

export type CustomerAddressRow = PrismaCustomerAddress

const addressNotFound = (addressId: string) =>
  new RecordNotFoundError({
    model: "CustomerAddress",
    id: addressId,
    message: `Customer address ${addressId} not found`,
  })

export class CustomerAddressRepository extends Context.Tag("customer/CustomerAddressRepository")<
  CustomerAddressRepository,
  {
    readonly listByCustomer: (customerId: CustomerId) => Effect.Effect<CustomerAddressRow[], PersistenceError>
    readonly create: (
      customerId: CustomerId,
      input: CreateAddressInput
    ) => Effect.Effect<CustomerAddressRow, PersistenceError>
    readonly update: (
      customerId: CustomerId,
      addressId: CustomerAddressId,
      input: UpdateAddressInput
    ) => Effect.Effect<CustomerAddressRow, PersistenceError>
    readonly delete: (customerId: CustomerId, addressId: CustomerAddressId) => Effect.Effect<void, PersistenceError>
  }
>() {}

export type CustomerAddressRepositoryShape = Context.Tag.Service<CustomerAddressRepository>

export const CustomerAddressRepositoryLive = Layer.effect(
  CustomerAddressRepository,
  Effect.gen(function* () {
    const prismaService = yield* PrismaService

    return CustomerAddressRepository.of({
      listByCustomer: (customerId: CustomerId) => {
        return prismaService.execute(() =>
          prismaService.prisma.customerAddress.findMany({
            where: { customerId },
          })
        )
      },

      create: (customerId: CustomerId, input: CreateAddressInput) =>
        prismaService.$transaction(async (tx) => {
          if (input.isDefault) {
            await tx.customerAddress.updateMany({ where: { customerId }, data: { isDefault: false } })
          }
          return Either.right(
            await tx.customerAddress.create({
              data: {
                customerId,
                label: input.label,
                address: input.address,
                isDefault: input.isDefault ?? false,
              },
            })
          )
        }),

      update: (customerId: CustomerId, addressId: CustomerAddressId, input: UpdateAddressInput) =>
        prismaService.$transaction(async (tx): Promise<Either.Either<CustomerAddressRow, RecordNotFoundError>> => {
          if (input.isDefault) {
            await tx.customerAddress.updateMany({ where: { customerId }, data: { isDefault: false } })
          }
          const data = {
            ...(input.label !== undefined ? { label: input.label } : {}),
            ...(input.address !== undefined ? { address: input.address } : {}),
            ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
          }
          const updated = await tx.customerAddress.updateMany({
            where: { id: addressId, customerId },
            data,
          })
          if (updated.count === 0) {
            return Either.left(addressNotFound(addressId))
          }
          return Either.right(await tx.customerAddress.findUniqueOrThrow({ where: { id: addressId } }))
        }),

      delete: (customerId: CustomerId, addressId: CustomerAddressId) => {
        return prismaService
          .execute(() =>
            prismaService.prisma.customerAddress.deleteMany({
              where: { id: addressId, customerId },
            })
          )
          .pipe(
            Effect.flatMap((result) => (result.count === 0 ? Effect.fail(addressNotFound(addressId)) : Effect.void))
          )
      },
    })
  })
)
