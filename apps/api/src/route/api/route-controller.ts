import { runEffect } from "@/middleware/effect-runner"
import { notFound, ok } from "@/middleware/http"
import { decodeBody, decodeParams } from "@/middleware/validate"
import { AddRouteLegInput, RouteCreateInput, RouteResponse, RouteUpdateInput } from "route/dto/route-dto"
import { RouteService } from "route/services/route-service"
import { RouteId } from "@/ids"
import { Effect, Schema } from "effect"
import { NextFunction, Request, Response, Router } from "express"

export const RouteController = Router()

const RouteIdPathParams = Schema.Struct({ id: RouteId })

RouteController.post("/", async (req: Request, res: Response, next: NextFunction) => {
  const program = Effect.gen(function* (_) {
    const input = yield* decodeBody(RouteCreateInput, req)
    const routeService = yield* RouteService
    return ok(RouteResponse.fromRoute(yield* routeService.create(input)))
  })

  runEffect(req, res, next, program)
})

RouteController.get("/", async (req: Request, res: Response, next: NextFunction) => {
  const program = Effect.gen(function* (_) {
    const routeService = yield* RouteService
    const routes = yield* routeService.listAll()
    return ok(routes.map(RouteResponse.fromRoute))
  })

  runEffect(req, res, next, program)
})

RouteController.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  const program = Effect.gen(function* (_) {
    const { id } = yield* decodeParams(RouteIdPathParams, req)
    const routeService = yield* RouteService
    return ok(RouteResponse.fromRoute(yield* routeService.getById(id)))
  }).pipe(Effect.catchTag("route/RouteNotFoundError", (error) => Effect.succeed(notFound(error.message))))

  runEffect(req, res, next, program)
})

RouteController.patch("/:id", async (req: Request, res: Response, next: NextFunction) => {
  const program = Effect.gen(function* (_) {
    const { id } = yield* decodeParams(RouteIdPathParams, req)
    const input = yield* decodeBody(RouteUpdateInput, req)
    const routeService = yield* RouteService
    return ok(RouteResponse.fromRoute(yield* routeService.update(id, input)))
  }).pipe(Effect.catchTag("route/RouteNotFoundError", (error) => Effect.succeed(notFound(error.message))))

  runEffect(req, res, next, program)
})

RouteController.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  const program = Effect.gen(function* (_) {
    const { id } = yield* decodeParams(RouteIdPathParams, req)
    const routeService = yield* RouteService
    yield* routeService.delete(id)
    return ok({ message: "Route deleted successfully" })
  }).pipe(Effect.catchTag("route/RouteNotFoundError", (error) => Effect.succeed(notFound(error.message))))

  runEffect(req, res, next, program)
})

RouteController.post("/:id/legs", async (req: Request, res: Response, next: NextFunction) => {
  class RouteIdParams extends Schema.Class<RouteIdParams>("route/RouteIdParams")({
    id: RouteId,
  }) {}

  const program = Effect.gen(function* (_) {
    const { id: routeId } = yield* decodeParams(RouteIdParams, req)
    const input = yield* decodeBody(AddRouteLegInput, req)
    const routeService = yield* RouteService
    return ok(RouteResponse.fromRoute(yield* routeService.addLeg(routeId, input)))
  }).pipe(Effect.catchTag("route/RouteNotFoundError", (error) => Effect.succeed(notFound(error.message))))

  runEffect(req, res, next, program)
})
