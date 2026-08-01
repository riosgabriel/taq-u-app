import { PersistenceError, RecordNotFoundError } from "@/persistence-errors"
import { Location } from "@prisma/client"
import { Context, Effect, Layer } from "effect"
import { LocationCreateInput, LocationUpdateInput } from "location/dto/location-dto"
import { PrismaService } from "prisma-service"

const locationNotFound = (id: string) =>
  new RecordNotFoundError({ model: "Location", id, message: `Location with id ${id} not found` })

export class LocationRepository extends Context.Tag("location/LocationRepository")<
  LocationRepository,
  {
    readonly create: (locationInput: LocationCreateInput) => Effect.Effect<Location, PersistenceError>
    readonly listAll: () => Effect.Effect<Array<Location>, PersistenceError>
    readonly getById: (id: string) => Effect.Effect<Location, PersistenceError>
    readonly update: (id: string, locationUpdateInput: LocationUpdateInput) => Effect.Effect<Location, PersistenceError>
    readonly delete: (id: string) => Effect.Effect<void, PersistenceError>
  }
>() {}

export const LocationRepositoryLive = Layer.effect(
  LocationRepository,
  Effect.gen(function* () {
    const prismaService = yield* PrismaService

    return LocationRepository.of({
      create: (locationInput: LocationCreateInput) => {
        return prismaService.execute(() =>
          prismaService.prisma.location.create({
            data: {
              name: locationInput.name,
              address: locationInput.address,
              latitude: locationInput.latitude,
              longitude: locationInput.longitude,
            },
          })
        )
      },

      listAll: () => {
        return prismaService.execute(() => prismaService.prisma.location.findMany())
      },

      getById: (id: string) => {
        return prismaService
          .execute(() => prismaService.prisma.location.findUnique({ where: { id } }))
          .pipe(Effect.flatMap((location) => (location ? Effect.succeed(location) : Effect.fail(locationNotFound(id)))))
      },

      update: (id: string, locationUpdateInput: LocationUpdateInput) => {
        return prismaService.execute(() =>
          prismaService.prisma.location.update({
            where: { id },
            data: {
              name: locationUpdateInput.name,
              address: locationUpdateInput.address,
              latitude: locationUpdateInput.latitude,
              longitude: locationUpdateInput.longitude,
            },
          })
        )
      },

      delete: (id: string) => {
        return prismaService
          .execute(() => prismaService.prisma.location.delete({ where: { id } }))
          .pipe(Effect.asVoid)
      },
    })
  })
)
