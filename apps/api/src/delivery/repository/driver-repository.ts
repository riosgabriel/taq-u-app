import { PersistenceError, RecordNotFoundError } from "@/persistence-errors"
import { DriverCreateInput, DriverUpdateInput } from "delivery/dto/driver-dto"
import { Driver, VehicleType } from "@prisma/client"
import { Context, Data, Effect, Layer } from "effect"
import { PrismaService } from "prisma-service"

export class DriverEmailAlreadyExistsError extends Data.TaggedError("order/DriverEmailAlreadyExistsError")<{
  readonly email: string
  readonly message: string
}> {}

const driverNotFound = (id: string) =>
  new RecordNotFoundError({ model: "Driver", id, message: `Driver with id ${id} not found` })

export class DriverRepository extends Context.Tag("order/DriverRepository")<
  DriverRepository,
  {
    readonly create: (
      driverInput: DriverCreateInput
    ) => Effect.Effect<Driver, DriverEmailAlreadyExistsError | PersistenceError>
    readonly listAll: () => Effect.Effect<Array<Driver>, PersistenceError>
    readonly getById: (id: string) => Effect.Effect<Driver, PersistenceError>
    readonly update: (id: string, driverUpdateInput: DriverUpdateInput) => Effect.Effect<Driver, PersistenceError>
    readonly delete: (id: string) => Effect.Effect<Driver, PersistenceError>
  }
>() {}

export const DriverRepositoryLive = Layer.effect(
  DriverRepository,
  Effect.gen(function* () {
    const prismaService = yield* PrismaService

    return DriverRepository.of({
      create: (driverInput: DriverCreateInput) => {
        return prismaService
          .execute(() =>
            prismaService.prisma.driver.create({
              data: {
                name: driverInput.name,
                email: driverInput.email,
                phone: driverInput.phone,
                licenseNumber: driverInput.licenseNumber ?? "",
                vehicleType: driverInput.vehicleType.toUpperCase() as VehicleType,
                isAvailable: driverInput.isAvailable,
              },
            })
          )
          .pipe(
            Effect.catchTag("UniqueConstraintViolation", () =>
              Effect.fail(
                new DriverEmailAlreadyExistsError({
                  email: driverInput.email,
                  message: "Driver email already exists",
                })
              )
            )
          )
      },

      listAll: () => {
        return prismaService.execute(() => prismaService.prisma.driver.findMany())
      },

      getById: (id: string) => {
        return prismaService
          .execute(() => prismaService.prisma.driver.findUnique({ where: { id } }))
          .pipe(Effect.flatMap((driver) => (driver ? Effect.succeed(driver) : Effect.fail(driverNotFound(id)))))
      },

      update: (id: string, driverUpdateInput: DriverUpdateInput) => {
        return prismaService.execute(() =>
          prismaService.prisma.driver.update({
            where: { id },
            data: {
              name: driverUpdateInput.name,
              email: driverUpdateInput.email,
              phone: driverUpdateInput.phone,
              licenseNumber: driverUpdateInput.licenseNumber,
              vehicleType: driverUpdateInput.vehicleType?.toUpperCase() as VehicleType,
              isAvailable: driverUpdateInput.isAvailable,
            },
          })
        )
      },

      delete: (id: string) => {
        return prismaService.execute(() => prismaService.prisma.driver.delete({ where: { id } }))
      },
    })
  })
)
