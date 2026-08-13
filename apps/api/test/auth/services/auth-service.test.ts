import { CustomerId } from "@/ids"
import { describe, expect, it } from "@effect/vitest"
import { ConfigService } from "config-service"
import { EmailAlreadyRegisteredError, InvalidCredentialsError, InvalidTokenError } from "auth/auth-errors"
import { hashPassword } from "auth/domain/password"
import { AuthRepository } from "auth/repository/auth-repository"
import { AuthService, AuthServiceLive } from "auth/services/auth-service"
import { TokenService, TokenServiceLive } from "auth/services/token-service"
import { LoginInput, RegisterInput } from "auth/dto/auth-dto"
import { Effect, Layer, Schema } from "effect"

const customer = {
  id: "cust-123",
  name: "John Doe",
  email: "john@example.com",
  phone: "123-456-7890",
  address: null as string | null,
  passwordHash: "",
}

const registerInput = {
  name: "John Doe",
  email: "john@example.com",
  password: "password123",
}

const loginInput = {
  email: "john@example.com",
  password: "password123",
}

const testConfig = ConfigService.of({
  databaseUrl: "postgres://localhost:5432/test",
  dbPoolSize: 5,
  dbConnectTimeout: 10,
  logLevel: "info",
  jwtSecret: "test-secret-for-token-signing",
})

const tokenLayer = TokenServiceLive.pipe(Layer.provide(Layer.succeed(ConfigService, testConfig)))

const buildTestLayer = (mockRepo: typeof AuthRepository.Service) =>
  AuthServiceLive.pipe(Layer.provide(Layer.succeed(AuthRepository, mockRepo)), Layer.provide(tokenLayer))

describe("AuthService", () => {
  describe("register", () => {
    it.effect("creates the customer and returns a token and the customer", () =>
      Effect.gen(function* () {
        const service = yield* AuthService
        const result = yield* service.register(registerInput)
        expect(result.token).toBeTruthy()
        expect(result.customer.email).toBe(registerInput.email)
        expect(result.customer.name).toBe(registerInput.name)
      }).pipe(
        Effect.provide(
          buildTestLayer(
            AuthRepository.of({
              findByEmail: () => Effect.die("unexpected"),
              findById: () => Effect.die("unexpected"),
              createCustomer: (_input, _passwordHash) => Effect.succeed({ ...customer, passwordHash: _passwordHash }),
            })
          )
        )
      )
    )

    it.effect("fails with EmailAlreadyRegisteredError when the email is taken", () =>
      Effect.gen(function* () {
        const service = yield* AuthService
        const failure = yield* service.register(registerInput).pipe(Effect.flip)
        expect(failure._tag).toBe("auth/EmailAlreadyRegisteredError")
        expect(failure).toBeInstanceOf(EmailAlreadyRegisteredError)
      }).pipe(
        Effect.provide(
          buildTestLayer(
            AuthRepository.of({
              findByEmail: () => Effect.die("unexpected"),
              findById: () => Effect.die("unexpected"),
              createCustomer: () =>
                Effect.fail(
                  new EmailAlreadyRegisteredError({
                    email: registerInput.email,
                    message: `Customer with email ${registerInput.email} already exists`,
                  })
                ),
            })
          )
        )
      )
    )

    it.effect("normalizes a mixed-case email to lowercase before storing", () => {
      const repo = AuthRepository.of({
        findByEmail: () => Effect.die("unexpected"),
        findById: () => Effect.die("unexpected"),
        createCustomer: (input, _passwordHash) => Effect.succeed({ ...customer, email: input.email }),
      })
      return Effect.gen(function* () {
        const input = yield* Schema.decodeUnknown(RegisterInput)({
          name: "Mixed Case",
          email: "Mixed.Case@Email.COM",
          password: "password123",
        })
        expect(input.email).toBe("mixed.case@email.com")

        const service = yield* AuthService
        const result = yield* service.register(input)
        expect(result.customer.email).toBe("mixed.case@email.com")
      }).pipe(Effect.provide(buildTestLayer(repo)))
    })
  })

  describe("login", () => {
    it.effect("lowercases a mixed-case email before looking up the customer", () => {
      const passwordHashPromise = hashPassword("password123")
      let lookedUpEmail: string | null = null
      const repo = AuthRepository.of({
        findByEmail: (email) => {
          lookedUpEmail = email
          return Effect.promise(async () => ({ ...customer, passwordHash: await passwordHashPromise }))
        },
        findById: () => Effect.die("unexpected"),
        createCustomer: () => Effect.die("unexpected"),
      })
      return Effect.gen(function* () {
        const input = yield* Schema.decodeUnknown(LoginInput)({
          email: "John.Doe@Example.COM",
          password: "password123",
        })
        expect(input.email).toBe("john.doe@example.com")

        const service = yield* AuthService
        const result = yield* service.login(input)
        expect(lookedUpEmail).toBe("john.doe@example.com")
        expect(result.customer.email).toBe(customer.email)
      }).pipe(Effect.provide(buildTestLayer(repo)))
    })
    it.effect("returns a token and the customer for valid credentials", () => {
      const passwordHashPromise = hashPassword("password123")
      const repo = AuthRepository.of({
        findByEmail: () => Effect.promise(async () => ({ ...customer, passwordHash: await passwordHashPromise })),
        findById: () => Effect.die("unexpected"),
        createCustomer: () => Effect.die("unexpected"),
      })
      return Effect.gen(function* () {
        const service = yield* AuthService
        const result = yield* service.login(loginInput)
        expect(result.token).toBeTruthy()
        expect(result.customer.email).toBe(loginInput.email)
      }).pipe(Effect.provide(buildTestLayer(repo)))
    })

    it.effect("fails with InvalidCredentialsError for a wrong password", () => {
      const passwordHashPromise = hashPassword("password123")
      const repo = AuthRepository.of({
        findByEmail: () => Effect.promise(async () => ({ ...customer, passwordHash: await passwordHashPromise })),
        findById: () => Effect.die("unexpected"),
        createCustomer: () => Effect.die("unexpected"),
      })
      return Effect.gen(function* () {
        const service = yield* AuthService
        const failure = yield* service.login({ email: loginInput.email, password: "wrong-password" }).pipe(Effect.flip)
        expect(failure._tag).toBe("auth/InvalidCredentialsError")
        expect(failure).toBeInstanceOf(InvalidCredentialsError)
      }).pipe(Effect.provide(buildTestLayer(repo)))
    })

    it.effect("fails with InvalidCredentialsError for an unknown email", () => {
      const repo = AuthRepository.of({
        findByEmail: () => Effect.succeed(null),
        findById: () => Effect.die("unexpected"),
        createCustomer: () => Effect.die("unexpected"),
      })
      return Effect.gen(function* () {
        const service = yield* AuthService
        const failure = yield* service.login(loginInput).pipe(Effect.flip)
        expect(failure._tag).toBe("auth/InvalidCredentialsError")
        expect(failure).toBeInstanceOf(InvalidCredentialsError)
      }).pipe(Effect.provide(buildTestLayer(repo)))
    })
  })

  describe("getMe", () => {
    it.effect("returns the customer for a valid customer id", () => {
      const repo = AuthRepository.of({
        findByEmail: () => Effect.die("unexpected"),
        findById: () => Effect.succeed({ ...customer, passwordHash: "scrypt$hash" }),
        createCustomer: () => Effect.die("unexpected"),
      })
      return Effect.gen(function* () {
        const service = yield* AuthService
        const result = yield* service.getMe(Schema.decodeSync(CustomerId)("cust-123"))
        expect(result.email).toBe(customer.email)
      }).pipe(Effect.provide(buildTestLayer(repo)))
    })

    it.effect("fails with InvalidTokenError when the customer does not exist", () => {
      const repo = AuthRepository.of({
        findByEmail: () => Effect.die("unexpected"),
        findById: () => Effect.succeed(null),
        createCustomer: () => Effect.die("unexpected"),
      })
      return Effect.gen(function* () {
        const service = yield* AuthService
        const failure = yield* service.getMe(Schema.decodeSync(CustomerId)("missing-id")).pipe(Effect.flip)
        expect(failure._tag).toBe("auth/InvalidTokenError")
      }).pipe(Effect.provide(buildTestLayer(repo)))
    })
  })

  describe("TokenService", () => {
    it.effect("signs and verifies a token round-trip", () =>
      Effect.gen(function* () {
        const tokenService = yield* TokenService
        const token = yield* tokenService.sign({
          id: Schema.decodeSync(CustomerId)("cust-123"),
          email: customer.email,
        })
        const claims = yield* tokenService.verify(token)
        expect(claims.id).toBe("cust-123")
        expect(claims.email).toBe(customer.email)
      }).pipe(Effect.provide(tokenLayer))
    )

    it.effect("rejects a tampered token with InvalidTokenError", () =>
      Effect.gen(function* () {
        const tokenService = yield* TokenService
        const token = yield* tokenService.sign({
          id: Schema.decodeSync(CustomerId)("cust-123"),
          email: customer.email,
        })
        const failure = yield* tokenService.verify(`${token}extra`).pipe(Effect.flip)
        expect(failure._tag).toBe("auth/InvalidTokenError")
        expect(failure).toBeInstanceOf(InvalidTokenError)
      }).pipe(Effect.provide(tokenLayer))
    )

    it.effect("rejects a garbage token with InvalidTokenError", () =>
      Effect.gen(function* () {
        const tokenService = yield* TokenService
        const failure = yield* tokenService.verify("not-a-jwt").pipe(Effect.flip)
        expect(failure._tag).toBe("auth/InvalidTokenError")
      }).pipe(Effect.provide(tokenLayer))
    )
  })
})
