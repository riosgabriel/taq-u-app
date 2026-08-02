import { PersistenceError } from "@/persistence-errors"
import { Context, Data, Effect, Layer } from "effect"
import Location from "location/domain/location"
import { LocationCreateInput, LocationUpdateInput } from "location/dto/location-dto"
import { LocationRepository } from "location/repository/location-repository"

export class LocationNotFoundError extends Data.TaggedError("location/LocationNotFoundError")<{
  readonly id: string
  readonly message: string
}> {}

export class LocationService extends Context.Tag("location/LocationService")<
  LocationService,
  {
    readonly create: (locationCreateInput: LocationCreateInput) => Effect.Effect<Location, PersistenceError>
    readonly listAll: () => Effect.Effect<Array<Location>, PersistenceError>
    readonly getById: (id: string) => Effect.Effect<Location, LocationNotFoundError | PersistenceError>
    readonly update: (
      id: string,
      locationUpdateInput: LocationUpdateInput
    ) => Effect.Effect<Location, LocationNotFoundError | PersistenceError>
    readonly delete: (id: string) => Effect.Effect<void, LocationNotFoundError | PersistenceError>
  }
>() {}

export const LocationServiceLive = Layer.effect(
  LocationService,
  Effect.gen(function* () {
    const repository = yield* LocationRepository

    return LocationService.of({
      create: (locationInput: LocationCreateInput) => {
        return Effect.gen(function* () {
          return yield* repository.create(locationInput).pipe(Effect.map((location) => Location.fromLocation(location)))
        })
      },

      listAll: () => {
        return Effect.gen(function* () {
          return yield* repository
            .listAll()
            .pipe(Effect.map((locations) => locations.map((location) => Location.fromLocation(location))))
        })
      },

      getById: (id: string) => {
        return repository.getById(id).pipe(
          Effect.map((location) => Location.fromLocation(location)),
          Effect.catchTag("persistence/RecordNotFoundError", (error) =>
            Effect.fail(new LocationNotFoundError({ id, message: error.message }))
          )
        )
      },

      update: (id: string, locationUpdateInput: LocationUpdateInput) => {
        return repository.update(id, locationUpdateInput).pipe(
          Effect.map((location) => Location.fromLocation(location)),
          Effect.catchTag("persistence/RecordNotFoundError", (error) =>
            Effect.fail(new LocationNotFoundError({ id, message: error.message }))
          )
        )
      },

      delete: (id: string) => {
        return repository.delete(id).pipe(
          Effect.catchTag("persistence/RecordNotFoundError", (error) =>
            Effect.fail(new LocationNotFoundError({ id, message: error.message }))
          )
        )
      },
    })
  })
)
