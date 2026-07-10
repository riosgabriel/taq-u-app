import { DriverCreateInput, DriverUpdateInput } from "@order/dto/driver-dto"
import { isRecordNotFoundError, RecordNotFoundError } from "@order/repository/errors"
import { Driver, Prisma, VehicleType } from "@prisma/client"
import { Context, Data, Effect, Layer } from "effect"
import { UnknownException } from "effect/Cause"
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
    ) => Effect.Effect<Driver, DriverEmailAlreadyExistsError | UnknownException>
    readonly listAll: () => Effect.Effect<Array<Driver>, UnknownException>
    readonly getById: (id: string) => Effect.Effect<Driver, RecordNotFoundError | UnknownException>
    readonly update: (
      id: string,
      driverUpdateInput: DriverUpdateInput
    ) => Effect.Effect<Driver, RecordNotFoundError | UnknownException>
    readonly delete: (id: string) => Effect.Effect<Driver, RecordNotFoundError | UnknownException>
  }
>() {}

export const DriverRepositoryLive = Layer.effect(
  DriverRepository,
  Effect.gen(function* () {
    const prismaService = yield* PrismaService

    return DriverRepository.of({
      create: (driverInput: DriverCreateInput) => {
        return Effect.tryPromise({
          try: () =>
            prismaService.prisma.driver.create({
              data: {
                name: driverInput.name,
                email: driverInput.email,
                phone: driverInput.phone,
                licenseNumber: driverInput.licenseNumber ?? "",
                vehicleType: driverInput.vehicleType.toUpperCase() as VehicleType, // TODO: fix casting
                isAvailable: driverInput.isAvailable,
              },
            }),
          catch: (error) => {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
              if (error.code === "P2002") {
                return new DriverEmailAlreadyExistsError({
                  email: driverInput.email,
                  message: "Driver email already exists",
                })
              }
            }
            return new UnknownException({ error })
          },
        })
      },

      listAll: () => { // TODO: 
        return Effect.tryPromise(() => prismaService.prisma.driver.findMany())
      },

      getById: (id: string) => {
        return Effect.tryPromise(() => prismaService.prisma.driver.findUnique({ where: { id } })).pipe(
          Effect.flatMap((driver) => (driver ? Effect.succeed(driver) : Effect.fail(driverNotFound(id))))
        )
      },

      update: (id: string, driverUpdateInput: DriverUpdateInput) => {
        return Effect.tryPromise(() =>
          // TODO: check if undefined values are ignored by Prisma
          prismaService.prisma.driver.update({
            where: { id },
            data: {
              name: driverUpdateInput.name,
              email: driverUpdateInput.email,
              phone: driverUpdateInput.phone,
              licenseNumber: driverUpdateInput.licenseNumber,
              vehicleType: driverUpdateInput.vehicleType?.toUpperCase() as VehicleType, // TODO: fix casting
              isAvailable: driverUpdateInput.isAvailable,
            },
          })
        ).pipe(Effect.catchIf(isRecordNotFoundError, () => Effect.fail(driverNotFound(id))))
      },

      delete: (id: string) => {
        return Effect.tryPromise(() => prismaService.prisma.driver.delete({ where: { id } })).pipe(
          Effect.catchIf(isRecordNotFoundError, () => Effect.fail(driverNotFound(id)))
        )
      },
    })
  })
)
