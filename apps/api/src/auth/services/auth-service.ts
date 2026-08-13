import { CustomerId } from "@/ids"
import { PersistenceError } from "@/persistence-errors"
import { EmailAlreadyRegisteredError, InvalidCredentialsError, InvalidTokenError } from "auth/auth-errors"
import { AuthRepository } from "auth/repository/auth-repository"
import { TokenService } from "auth/services/token-service"
import { LoginInput, RegisterInput } from "auth/dto/auth-dto"
import Customer from "customer/domain/customer"
import { DUMMY_PASSWORD_HASH, hashPasswordEffect, PasswordHashError, verifyPasswordEffect } from "auth/domain/password"
import { Context, Effect, Layer } from "effect"

export type AuthResult = {
  readonly token: string
  readonly customer: Customer
}

export class AuthService extends Context.Tag("auth/AuthService")<
  AuthService,
  {
    readonly register: (
      input: RegisterInput
    ) => Effect.Effect<AuthResult, EmailAlreadyRegisteredError | PasswordHashError | PersistenceError>
    readonly login: (
      input: LoginInput
    ) => Effect.Effect<AuthResult, InvalidCredentialsError | PasswordHashError | PersistenceError>
    readonly getMe: (customerId: CustomerId) => Effect.Effect<Customer, InvalidTokenError | PersistenceError>
  }
>() {}

export type AuthServiceShape = Context.Tag.Service<AuthService>

export const AuthServiceLive = Layer.effect(
  AuthService,
  Effect.gen(function* () {
    const authRepository = yield* AuthRepository
    const tokenService = yield* TokenService

    const signForCustomer = (customer: Customer) => tokenService.sign({ id: customer.id, email: customer.email })

    return AuthService.of({
      register: (input: RegisterInput) => {
        return Effect.gen(function* () {
          const passwordHash = yield* hashPasswordEffect(input.password)
          const created = yield* authRepository.createCustomer(input, passwordHash)
          const customer = Customer.fromPrisma(created)
          const token = yield* signForCustomer(customer)
          return { token, customer }
        })
      },
      login: (input: LoginInput) => {
        return Effect.gen(function* () {
          const found = yield* authRepository.findByEmail(input.email)
          const passwordHash = found ? found.passwordHash : DUMMY_PASSWORD_HASH
          const valid = yield* verifyPasswordEffect(input.password, passwordHash)
          if (!found || !valid) {
            return yield* Effect.fail(new InvalidCredentialsError({ message: "Invalid email or password" }))
          }
          const customer = Customer.fromPrisma(found)
          const token = yield* signForCustomer(customer)
          return { token, customer }
        })
      },
      getMe: (customerId: CustomerId) => {
        return Effect.gen(function* () {
          const found = yield* authRepository.findById(customerId)
          if (!found) {
            return yield* Effect.fail(new InvalidTokenError({ message: "Invalid or expired token" }))
          }
          return Customer.fromPrisma(found)
        })
      },
    })
  })
)
