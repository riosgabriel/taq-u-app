import { decodeBody, decodeParams, IdParams } from "@/middleware/validate"
import { runEffect } from "@/middleware/effect-runner"
import { notFound, ok } from "@/middleware/http"
import { PackageCreateInput, PackageResponse, PackageStatusUpdateInput } from "@order/dto/package-dto"
import { PackageService } from "@order/services/package-service"
import { Effect } from "effect"
import { NextFunction, Request, Response, Router } from "express"

export const PackageController = Router()

PackageController.post("/", async (req: Request, res: Response, next: NextFunction) => {
  const program = Effect.gen(function* (_) {
    const packageInput = yield* decodeBody(PackageCreateInput, req)
    const packageService = yield* PackageService
    return ok(PackageResponse.fromPackage(yield* packageService.create(packageInput)))
  }).pipe(
    Effect.catchTag("order/OrderNotFoundError", (error) => Effect.succeed(notFound(error.message)))
  )

  runEffect(req, res, next, program)
})

PackageController.get("/", async (req: Request, res: Response, next: NextFunction) => {
  const program = Effect.gen(function* (_) {
    const packageService = yield* PackageService
    const packages = yield* packageService.listAll()
    return ok(packages.map(PackageResponse.fromPackage))
  })

  runEffect(req, res, next, program)
})

PackageController.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  const program = Effect.gen(function* (_) {
    const { id } = yield* decodeParams(IdParams, req)
    const packageService = yield* PackageService
    return ok(PackageResponse.fromPackage(yield* packageService.getById(id)))
  }).pipe(Effect.catchTag("order/PackageNotFoundError", (error) => Effect.succeed(notFound(error.message))))

  runEffect(req, res, next, program)
})

PackageController.patch("/:id/status", async (req: Request, res: Response, next: NextFunction) => {
  const program = Effect.gen(function* (_) {
    const { id } = yield* decodeParams(IdParams, req)
    const statusInput = yield* decodeBody(PackageStatusUpdateInput, req)
    const packageService = yield* PackageService
    return ok(PackageResponse.fromPackage(yield* packageService.updateStatus(id, statusInput)))
  }).pipe(Effect.catchTag("order/PackageNotFoundError", (error) => Effect.succeed(notFound(error.message))))

  runEffect(req, res, next, program)
})
