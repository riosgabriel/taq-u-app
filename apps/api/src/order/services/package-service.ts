import { PersistenceError } from "@/persistence-errors"
import Package from "@order/domain/package"
import { PackageCreateInput, PackageStatusUpdateInput } from "@order/dto/package-dto"
import { PackageRepository } from "@order/repository/package-repository"
import { OrderNotFoundError } from "@order/services/order-service"
import { TrackingNumberService } from "@order/services/tracking-number-service"
import { Context, Data, Effect, Layer } from "effect"

export class PackageNotFoundError extends Data.TaggedError("order/PackageNotFoundError")<{
  readonly id: string
  readonly message: string
}> {}

export class PackageService extends Context.Tag("order/PackageService")<
  PackageService,
  {
    readonly create: (
      packageCreateInput: PackageCreateInput
    ) => Effect.Effect<Package, OrderNotFoundError | PersistenceError>
    readonly listAll: () => Effect.Effect<Array<Package>, PersistenceError>
    readonly getById: (id: string) => Effect.Effect<Package, PackageNotFoundError | PersistenceError>
    readonly updateStatus: (
      id: string,
      statusUpdateInput: PackageStatusUpdateInput
    ) => Effect.Effect<Package, PackageNotFoundError | PersistenceError>
  }
>() {}

export const PackageServiceLive = Layer.effect(
  PackageService,
  Effect.gen(function* () {
    const repository = yield* PackageRepository
    const trackingNumberService = yield* TrackingNumberService

    return PackageService.of({
      create: (packageInput: PackageCreateInput) => {
        return Effect.gen(function* () {
          const trackingNumber = yield* trackingNumberService.generate()
          return yield* repository.create(packageInput, trackingNumber).pipe(
            Effect.map((pkg) => Package.fromPackage(pkg)),
            Effect.catchTag("order/RecordNotFoundError", (error) =>
              Effect.fail(
                new OrderNotFoundError({
                  orderId: packageInput.orderId,
                  message: error.message,
                })
              )
            )
          )
        })
      },

      listAll: () => {
        return repository.listAll().pipe(Effect.map((packages) => packages.map((pkg) => Package.fromPackage(pkg))))
      },

      getById: (id: string) => {
        return repository.getById(id).pipe(
          Effect.map((pkg) => Package.fromPackage(pkg)),
          Effect.catchTag("order/RecordNotFoundError", (error) =>
            Effect.fail(new PackageNotFoundError({ id, message: error.message }))
          )
        )
      },

      updateStatus: (id: string, statusUpdateInput: PackageStatusUpdateInput) => {
        return repository.updateStatus(id, statusUpdateInput).pipe(
          Effect.map((pkg) => Package.fromPackage(pkg)),
          Effect.catchTag("order/RecordNotFoundError", (error) =>
            Effect.fail(new PackageNotFoundError({ id, message: error.message }))
          )
        )
      },
    })
  })
)
