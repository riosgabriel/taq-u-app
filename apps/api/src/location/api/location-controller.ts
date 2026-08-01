import { runEffect } from "@/middleware/effect-runner"
import { notFound, ok } from "@/middleware/http"
import { decodeBody, decodeParams, IdParams } from "@/middleware/validate"
import { LocationCreateInput, LocationResponse, LocationUpdateInput } from "location/dto/location-dto"
import { LocationService } from "location/services/location-service"
import { Effect } from "effect"
import { NextFunction, Request, Response, Router } from "express"

export const LocationController = Router()

LocationController.post("/", async (req: Request, res: Response, next: NextFunction) => {
  const program = Effect.gen(function* (_) {
    const locationInput = yield* decodeBody(LocationCreateInput, req)
    const locationService = yield* LocationService
    return ok(LocationResponse.fromLocation(yield* locationService.create(locationInput)))
  })

  runEffect(req, res, next, program)
})

LocationController.get("/", async (req: Request, res: Response, next: NextFunction) => {
  const program = Effect.gen(function* (_) {
    const locationService = yield* LocationService
    const locations = yield* locationService.listAll()
    return ok(locations.map(LocationResponse.fromLocation))
  })

  runEffect(req, res, next, program)
})

LocationController.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  const program = Effect.gen(function* (_) {
    const { id } = yield* decodeParams(IdParams, req)
    const locationService = yield* LocationService
    return ok(LocationResponse.fromLocation(yield* locationService.getById(id)))
  }).pipe(Effect.catchTag("location/LocationNotFoundError", (error) => Effect.succeed(notFound(error.message))))

  runEffect(req, res, next, program)
})

LocationController.patch("/:id", async (req: Request, res: Response, next: NextFunction) => {
  const program = Effect.gen(function* (_) {
    const { id } = yield* decodeParams(IdParams, req)
    const locationInput = yield* decodeBody(LocationUpdateInput, req)
    const locationService = yield* LocationService
    return ok(LocationResponse.fromLocation(yield* locationService.update(id, locationInput)))
  }).pipe(Effect.catchTag("location/LocationNotFoundError", (error) => Effect.succeed(notFound(error.message))))

  runEffect(req, res, next, program)
})

LocationController.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  const program = Effect.gen(function* (_) {
    const { id } = yield* decodeParams(IdParams, req)
    const locationService = yield* LocationService
    yield* locationService.delete(id)
    return ok({ message: "Location deleted successfully" })
  }).pipe(Effect.catchTag("location/LocationNotFoundError", (error) => Effect.succeed(notFound(error.message))))

  runEffect(req, res, next, program)
})
