import { CustomerAddressId, CustomerId } from "@/ids"
import { RecordNotFoundError } from "@/persistence-errors"
import { describe, expect, it } from "@effect/vitest"
import { CustomerAddress } from "customer/domain/customer-address"
import { CustomerAddressRepository } from "customer/repository/customer-address-repository"
import {
  CustomerAddressNotFoundError,
  CustomerAddressService,
  CustomerAddressServiceLive,
} from "customer/services/customer-address-service"
import { Effect, Layer, Schema } from "effect"

const customerId = Schema.decodeSync(CustomerId)("cust-123")
const addressId = Schema.decodeSync(CustomerAddressId)("addr-1")

const addressRow = {
  id: "addr-1",
  customerId: "cust-123",
  label: "Home",
  address: "123 Main St",
  isDefault: false,
}

const addressEntity: CustomerAddress = {
  id: addressId,
  label: "Home",
  address: "123 Main St",
  isDefault: false,
}

const buildTestLayer = (mockRepo: typeof CustomerAddressRepository.Service) =>
  CustomerAddressServiceLive.pipe(Layer.provide(Layer.succeed(CustomerAddressRepository, mockRepo)))

describe("CustomerAddressService", () => {
  describe("listByCustomer", () => {
    it.effect("returns the customer's addresses", () =>
      Effect.gen(function* () {
        const service = yield* CustomerAddressService
        const result = yield* service.listByCustomer(customerId)
        expect(result).toEqual([addressEntity])
      }).pipe(
        Effect.provide(
          buildTestLayer(
            CustomerAddressRepository.of({
              listByCustomer: () => Effect.succeed([addressRow]),
              create: () => Effect.die("unexpected"),
              update: () => Effect.die("unexpected"),
              delete: () => Effect.die("unexpected"),
            })
          )
        )
      )
    )
  })

  describe("create", () => {
    it.effect("creates and returns the address", () =>
      Effect.gen(function* () {
        const service = yield* CustomerAddressService
        const result = yield* service.create(customerId, { label: "Home", address: "123 Main St" })
        expect(result.id).toBe("addr-1")
        expect(result.label).toBe("Home")
      }).pipe(
        Effect.provide(
          buildTestLayer(
            CustomerAddressRepository.of({
              listByCustomer: () => Effect.die("unexpected"),
              create: () => Effect.succeed(addressRow),
              update: () => Effect.die("unexpected"),
              delete: () => Effect.die("unexpected"),
            })
          )
        )
      )
    )
  })

  describe("update", () => {
    it.effect("updates and returns the address", () =>
      Effect.gen(function* () {
        const service = yield* CustomerAddressService
        const result = yield* service.update(customerId, addressId, { label: "Work" })
        expect(result.label).toBe("Work")
      }).pipe(
        Effect.provide(
          buildTestLayer(
            CustomerAddressRepository.of({
              listByCustomer: () => Effect.die("unexpected"),
              create: () => Effect.die("unexpected"),
              update: () => Effect.succeed({ ...addressRow, label: "Work" }),
              delete: () => Effect.die("unexpected"),
            })
          )
        )
      )
    )

    it.effect("fails with CustomerAddressNotFoundError when the address is not owned", () =>
      Effect.gen(function* () {
        const service = yield* CustomerAddressService
        const failure = yield* service.update(customerId, addressId, { label: "Work" }).pipe(Effect.flip)
        expect(failure._tag).toBe("customer/CustomerAddressNotFoundError")
        expect(failure).toBeInstanceOf(CustomerAddressNotFoundError)
      }).pipe(
        Effect.provide(
          buildTestLayer(
            CustomerAddressRepository.of({
              listByCustomer: () => Effect.die("unexpected"),
              create: () => Effect.die("unexpected"),
              update: () =>
                Effect.fail(
                  new RecordNotFoundError({
                    model: "CustomerAddress",
                    id: "addr-1",
                    message: "Customer address addr-1 not found",
                  })
                ),
              delete: () => Effect.die("unexpected"),
            })
          )
        )
      )
    )
  })

  describe("delete", () => {
    it.effect("deletes the address", () =>
      Effect.gen(function* () {
        const service = yield* CustomerAddressService
        const result = yield* service.delete(customerId, addressId)
        expect(result).toBeUndefined()
      }).pipe(
        Effect.provide(
          buildTestLayer(
            CustomerAddressRepository.of({
              listByCustomer: () => Effect.die("unexpected"),
              create: () => Effect.die("unexpected"),
              update: () => Effect.die("unexpected"),
              delete: () => Effect.void,
            })
          )
        )
      )
    )

    it.effect("fails with CustomerAddressNotFoundError when the address is not owned", () =>
      Effect.gen(function* () {
        const service = yield* CustomerAddressService
        const failure = yield* service.delete(customerId, addressId).pipe(Effect.flip)
        expect(failure._tag).toBe("customer/CustomerAddressNotFoundError")
      }).pipe(
        Effect.provide(
          buildTestLayer(
            CustomerAddressRepository.of({
              listByCustomer: () => Effect.die("unexpected"),
              create: () => Effect.die("unexpected"),
              update: () => Effect.die("unexpected"),
              delete: () =>
                Effect.fail(
                  new RecordNotFoundError({
                    model: "CustomerAddress",
                    id: "addr-1",
                    message: "Customer address addr-1 not found",
                  })
                ),
            })
          )
        )
      )
    )
  })
})
