import { ForeignKeyViolation, PersistenceError, RecordNotFoundError } from "@/persistence-errors"
import { PackageCreateInput, PackageStatusUpdateInput } from "@order/dto/package-dto"
import { Package, PackageStatus } from "@prisma/client"
import { Context, Effect, Layer } from "effect"
import { PrismaService } from "prisma-service"

const packageNotFound = (id: string) =>
  new RecordNotFoundError({ model: "Package", id, message: `Package with id ${id} not found` })

const orderNotFound = (orderId: string) =>
  new RecordNotFoundError({ model: "Order", id: orderId, message: `Order with id ${orderId} not found` })

export class PackageRepository extends Context.Tag("order/PackageRepository")<
  PackageRepository,
  {
    readonly create: (
      packageInput: PackageCreateInput,
      trackingNumber: string
    ) => Effect.Effect<Package, PersistenceError>
    readonly listAll: () => Effect.Effect<Array<Package>, PersistenceError>
    readonly getById: (id: string) => Effect.Effect<Package, PersistenceError>
    readonly updateStatus: (
      id: string,
      statusUpdateInput: PackageStatusUpdateInput
    ) => Effect.Effect<Package, PersistenceError>
  }
>() {}

export const PackageRepositoryLive = Layer.effect(
  PackageRepository,
  Effect.gen(function* () {
    const prismaService = yield* PrismaService

    return PackageRepository.of({
      create: (packageInput: PackageCreateInput, trackingNumber: string) => {
        return prismaService
          .execute(() =>
            prismaService.prisma.package.create({
              data: {
                order: {
                  connect: {
                    id: packageInput.orderId,
                  },
                },
                weightKg: packageInput.weightKg,
                dimensions: packageInput.dimensions,
                description: packageInput.description,
                fragile: packageInput.fragile,
                perishable: packageInput.perishable,
                insured: packageInput.insured,
                trackingNumber,
                status: PackageStatus.AWAITING_PICKUP,
              },
            })
          )
          .pipe(
            Effect.catchTag("ForeignKeyViolation", () =>
              Effect.fail(
                new RecordNotFoundError({
                  model: "Order",
                  id: packageInput.orderId,
                  message: `Order with id ${packageInput.orderId} not found`,
                })
              )
            )
          )
      },

      listAll: () => {
        return prismaService.execute(() => prismaService.prisma.package.findMany())
      },

      getById: (id: string) => {
        return prismaService
          .execute(() => prismaService.prisma.package.findUnique({ where: { id } }))
          .pipe(Effect.flatMap((pkg) => (pkg ? Effect.succeed(pkg) : Effect.fail(packageNotFound(id)))))
      },

      updateStatus: (id: string, statusUpdateInput: PackageStatusUpdateInput) => {
        return prismaService.execute(() =>
          prismaService.prisma.package.update({
            where: { id },
            data: {
              status: statusUpdateInput.status as PackageStatus,
            },
          })
        )
      },
    })
  })
)
