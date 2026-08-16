import { runEffect } from "@/middleware/effect-runner"
import { conflict, ok, unauthorized } from "@/middleware/http"
import { protectedRouter } from "@/middleware/protected-router"
import { decodeBody } from "@/middleware/validate"
import { AuthResponse, LoginInput, RegisterInput } from "auth/dto/auth-dto"
import { AuthService } from "auth/services/auth-service"
import { CustomerResponse } from "customer/dto/customer-dto"
import { Effect } from "effect"
import { NextFunction, Request, Response, Router } from "express"

export const AuthController = Router()

AuthController.post("/register", async (req: Request, res: Response, next: NextFunction) => {
  const program = Effect.gen(function* (_) {
    const input = yield* decodeBody(RegisterInput, req)
    const authService = yield* AuthService
    return ok(AuthResponse.fromAuthResult(yield* authService.register(input)))
  }).pipe(Effect.catchTag("auth/EmailAlreadyRegisteredError", (error) => Effect.succeed(conflict(error.message))))

  runEffect(req, res, next, program)
})

AuthController.post("/login", async (req: Request, res: Response, next: NextFunction) => {
  const program = Effect.gen(function* (_) {
    const input = yield* decodeBody(LoginInput, req)
    const authService = yield* AuthService
    return ok(AuthResponse.fromAuthResult(yield* authService.login(input)))
  }).pipe(Effect.catchTag("auth/InvalidCredentialsError", (error) => Effect.succeed(unauthorized(error.message))))

  runEffect(req, res, next, program)
})

export const AuthPortal = protectedRouter()

AuthPortal.get("/me", (customerId, _req) =>
  Effect.gen(function* (_) {
    const authService = yield* AuthService
    return ok(CustomerResponse.fromCustomer(yield* authService.getMe(customerId)))
  })
)
