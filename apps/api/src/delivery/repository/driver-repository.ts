import { PersistenceError, RecordNotFoundError } from "@/persistence-errors"
import { DriverId } from "@/ids"
import { Driver } from "@prisma/client"
import { DriverCreateInput, DriverUpdateInput } from "delivery/dto/driver-dto"
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
    readonly getById: (id: DriverId) => Effect.Effect<Driver, PersistenceError>
    readonly update: (id: DriverId, driverUpdateInput: DriverUpdateInput) => Effect.Effect<Driver, PersistenceError>
    readonly delete: (id: DriverId) => Effect.Effect<void, PersistenceError>
    readonly findAvailable: () => Effect.Effect<
      { id: DriverId; name: string; email: string; phone: string; isAvailable: boolean; vehicleType: string } | null,
      PersistenceError
    >
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
                vehicleType: driverInput.vehicleType,
                isAvailable: driverInput.isAvailable,
              },
            })
          )
          .pipe(
            Effect.catchTag("persistence/UniqueConstraintViolation", () =>
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

      getById: (id: DriverId) => {
        return prismaService
          .execute(() => prismaService.prisma.driver.findUnique({ where: { id } }))
          .pipe(Effect.flatMap((driver) => (driver ? Effect.succeed(driver) : Effect.fail(driverNotFound(id)))))
      },

      update: (id: DriverId, driverUpdateInput: DriverUpdateInput) => {
        return prismaService.execute(() =>
          prismaService.prisma.driver.update({
            where: { id },
            data: {
              name: driverUpdateInput.name,
              email: driverUpdateInput.email,
              phone: driverUpdateInput.phone,
              licenseNumber: driverUpdateInput.licenseNumber,
              vehicleType: driverUpdateInput.vehicleType,
              isAvailable: driverUpdateInput.isAvailable,
            },
          })
        )
      },

      delete: (id: DriverId) => {
        return prismaService.execute(() => prismaService.prisma.driver.delete({ where: { id } })).pipe(Effect.asVoid)
      },

      findAvailable: () => {
        return prismaService
          .execute(() =>
            prismaService.prisma.driver.findFirst({
              where: { isAvailable: true },
            })
          )
          .pipe(
            Effect.map((driver) =>
              driver
                ? {
                    id: driver.id as DriverId,
                    name: driver.name,
                    email: driver.email,
                    phone: driver.phone,
                    isAvailable: driver.isAvailable,
                    vehicleType: driver.vehicleType,
                  }
                : null
            )
          )
      },
    })
  })
)
