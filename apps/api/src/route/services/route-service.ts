import { PersistenceError } from "@/persistence-errors"
import { RouteId } from "@/ids"
import { Context, Data, Effect, Layer } from "effect"
import Route from "route/domain/route"
import { AddRouteLegInput, RouteCreateInput, RouteUpdateInput } from "route/dto/route-dto"
import { RouteRepository } from "route/repository/route-repository"

export class RouteNotFoundError extends Data.TaggedError("route/RouteNotFoundError")<{
  readonly id: string
  readonly message: string
}> {}

export class RouteService extends Context.Tag("route/RouteService")<
  RouteService,
  {
    readonly create: (input: RouteCreateInput) => Effect.Effect<Route, PersistenceError>
    readonly listAll: () => Effect.Effect<Array<Route>, PersistenceError>
    readonly getById: (id: RouteId) => Effect.Effect<Route, RouteNotFoundError | PersistenceError>
    readonly update: (
      id: RouteId,
      input: RouteUpdateInput
    ) => Effect.Effect<Route, RouteNotFoundError | PersistenceError>
    readonly delete: (id: RouteId) => Effect.Effect<Route, RouteNotFoundError | PersistenceError>
    readonly addLeg: (
      routeId: RouteId,
      input: AddRouteLegInput
    ) => Effect.Effect<Route, RouteNotFoundError | PersistenceError>
  }
>() {}

export const RouteServiceLive = Layer.effect(
  RouteService,
  Effect.gen(function* () {
    const repository = yield* RouteRepository

    return RouteService.of({
      create: (input: RouteCreateInput) => {
        return Effect.gen(function* () {
          return yield* repository.create(input).pipe(Effect.map((route) => Route.fromRoute(route)))
        })
      },

      listAll: () => {
        return Effect.gen(function* () {
          return yield* repository.listAll().pipe(Effect.map((routes) => routes.map((route) => Route.fromRoute(route))))
        })
      },

      getById: (id: RouteId) => {
        return repository.getById(id).pipe(
          Effect.map((route) => Route.fromRoute(route)),
          Effect.catchTag("persistence/RecordNotFoundError", (error) =>
            Effect.fail(new RouteNotFoundError({ id, message: error.message }))
          )
        )
      },

      update: (id: RouteId, input: RouteUpdateInput) => {
        return repository.update(id, input).pipe(
          Effect.map((route) => Route.fromRoute(route)),
          Effect.catchTag("persistence/RecordNotFoundError", (error) =>
            Effect.fail(new RouteNotFoundError({ id, message: error.message }))
          )
        )
      },

      delete: (id: RouteId) => {
        return repository.delete(id).pipe(
          Effect.map((route) => Route.fromRoute(route)),
          Effect.catchTag("persistence/RecordNotFoundError", (error) =>
            Effect.fail(new RouteNotFoundError({ id, message: error.message }))
          )
        )
      },

      addLeg: (routeId: RouteId, input: AddRouteLegInput) => {
        return repository.addLeg(routeId, input).pipe(
          Effect.map((route) => Route.fromRoute(route)),
          Effect.catchTag("persistence/RecordNotFoundError", (error) =>
            Effect.fail(new RouteNotFoundError({ id: routeId, message: error.message }))
          )
        )
      },
    })
  })
)
