import { PersistenceError } from "@/persistence-errors"
import Driver from "delivery/domain/driver"
import { DriverCreateInput, DriverUpdateInput } from "delivery/dto/driver-dto"
import { DriverEmailAlreadyExistsError, DriverRepository } from "delivery/repository/driver-repository"
import { Context, Data, Effect, Layer } from "effect"
import { OrderRepository, OrderWithPackages } from "ordering/repository/order-repository"

export class DriverNotFoundError extends Data.TaggedError("delivery/DriverNotFoundError")<{
  readonly id: string
  readonly message: string
}> {}

export class DriverService extends Context.Tag("delivery/DriverService")<
  DriverService,
  {
    readonly create: (
      driverCreateInput: DriverCreateInput
    ) => Effect.Effect<Driver, DriverEmailAlreadyExistsError | PersistenceError>
    readonly listAll: () => Effect.Effect<Array<Driver>, PersistenceError>
    readonly getById: (id: string) => Effect.Effect<Driver, DriverNotFoundError | PersistenceError>
    readonly update: (
      id: string,
      driverUpdateInput: DriverUpdateInput
    ) => Effect.Effect<Driver, DriverNotFoundError | PersistenceError>
    readonly delete: (id: string) => Effect.Effect<Driver, DriverNotFoundError | PersistenceError>
    readonly listOrders: (
      driverId: string
    ) => Effect.Effect<OrderWithPackages[], DriverNotFoundError | PersistenceError>
  }
>() {}

export const DriverServiceLive = Layer.effect(
  DriverService,
  Effect.gen(function* () {
    const repository = yield* DriverRepository
    const orderRepository = yield* OrderRepository

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

      listOrders: (driverId: string) => {
        return Effect.gen(function* () {
          yield* repository.getById(driverId)
          return yield* orderRepository.findByDriverId(driverId)
        }).pipe(
          Effect.catchTag("order/RecordNotFoundError", (error) =>
            Effect.fail(new DriverNotFoundError({ id: driverId, message: error.message }))
          )
        )
      },
    })
  })
)
