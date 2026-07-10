import Driver from "@order/domain/driver"
import { DriverCreateInput, DriverUpdateInput } from "@order/dto/driver-dto"
import { DriverEmailAlreadyExistsError, DriverRepository } from "@order/repository/driver-respository"
import { Context, Data, Effect, Layer } from "effect"
import { UnknownException } from "effect/Cause"

export class DriverNotFoundError extends Data.TaggedError("order/DriverNotFoundError")<{
  readonly id: string
  readonly message: string
}> {}

export class DriverService extends Context.Tag("order/DriverService")<
  DriverService,
  {
    readonly create: (
      driverCreateInput: DriverCreateInput
    ) => Effect.Effect<Driver, DriverEmailAlreadyExistsError | UnknownException>
    readonly listAll: () => Effect.Effect<Array<Driver>, UnknownException>
    readonly getById: (id: string) => Effect.Effect<Driver, DriverNotFoundError | UnknownException>
    readonly update: (id: string, driverUpdateInput: DriverUpdateInput) => Effect.Effect<Driver, DriverNotFoundError | UnknownException>
    readonly delete: (id: string) => Effect.Effect<Driver, DriverNotFoundError | UnknownException>
  }
>() {}

export const DriverServiceLive = Layer.effect(
  DriverService,
  Effect.gen(function* () {
    const repository = yield* DriverRepository

    return DriverService.of({
      create: (driverInput: DriverCreateInput) => {
        return Effect.gen(function* () {
          return yield* repository.create(driverInput).pipe(Effect.map((driver) => Driver.fromDriver(driver)))
        })
      },

      listAll: () => {
        return Effect.gen(function* () {
          return yield* repository
            .listAll()
            .pipe(Effect.map((drivers) => drivers.map((driver) => Driver.fromDriver(driver))))
        })
      },

      getById: (id: string) => {
        return repository.getById(id).pipe(
          Effect.map((driver) => Driver.fromDriver(driver)),
          Effect.catchTag("order/RecordNotFoundError", (error) =>
            Effect.fail(new DriverNotFoundError({ id, message: error.message }))
          )
        )
      },

      update: (id: string, driverUpdateInput: DriverUpdateInput) => {
        return repository.update(id, driverUpdateInput).pipe(
          Effect.map((driver) => Driver.fromDriver(driver)),
          Effect.catchTag("order/RecordNotFoundError", (error) =>
            Effect.fail(new DriverNotFoundError({ id, message: error.message }))
          )
        )
      },

      delete: (id: string) => {
        return repository.delete(id).pipe(
          Effect.map((driver) => Driver.fromDriver(driver)),
          Effect.catchTag("order/RecordNotFoundError", (error) =>
            Effect.fail(new DriverNotFoundError({ id, message: error.message }))
          )
        )
      },
    })
  })
)
