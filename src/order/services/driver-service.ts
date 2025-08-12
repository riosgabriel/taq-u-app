import Driver from "@order/domain/driver"
import { DriverCreateInput } from "@order/dto/driver-dto"
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
        return Effect.gen(function* () {
          const driver = yield* repository.getById(id)

          if (!driver) {
            return yield* Effect.fail(new DriverNotFoundError({ id, message: "Driver not found" }))
          }

          return yield* Effect.succeed(Driver.fromDriver(driver))
        })
      },
    })
  })
)
