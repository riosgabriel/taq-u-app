import { CustomerId } from "@/ids"
import { PersistenceError } from "@/persistence-errors"
import { Customer } from "@prisma/client"
import { RegisterInput } from "auth/dto/auth-dto"
import { EmailAlreadyRegisteredError } from "auth/auth-errors"
import { Context, Effect, Layer } from "effect"
import { PrismaService } from "prisma-service"

export class AuthRepository extends Context.Tag("auth/AuthRepository")<
  AuthRepository,
  {
    readonly findByEmail: (email: string) => Effect.Effect<Customer | null, PersistenceError>
    readonly findById: (id: CustomerId) => Effect.Effect<Customer | null, PersistenceError>
    readonly createCustomer: (
      input: RegisterInput,
      passwordHash: string
    ) => Effect.Effect<Customer, EmailAlreadyRegisteredError | PersistenceError>
  }
>() {}

export type AuthRepositoryShape = Context.Tag.Service<AuthRepository>

export const AuthRepositoryLive = Layer.effect(
  AuthRepository,
  Effect.gen(function* () {
    const prismaService = yield* PrismaService

    return AuthRepository.of({
      findByEmail: (email: string) => {
        return prismaService.execute(() => prismaService.prisma.customer.findUnique({ where: { email } }))
      },
      findById: (id: CustomerId) => {
        return prismaService.execute(() => prismaService.prisma.customer.findUnique({ where: { id } }))
      },
      createCustomer: (input: RegisterInput, passwordHash: string) => {
        return prismaService
          .execute(() =>
            prismaService.prisma.customer.create({
              data: {
                name: input.name,
                email: input.email,
                passwordHash,
                phone: input.phone ?? null,
              },
            })
          )
          .pipe(
            Effect.catchTag("persistence/UniqueConstraintViolation", () =>
              Effect.fail(
                new EmailAlreadyRegisteredError({
                  email: input.email,
                  message: `Customer with email ${input.email} already exists`,
                })
              )
            )
          )
      },
    })
  })
)
