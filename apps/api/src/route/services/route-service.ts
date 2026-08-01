import { PersistenceError } from "@/persistence-errors"
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
    readonly getById: (id: string) => Effect.Effect<Route, RouteNotFoundError | PersistenceError>
    readonly update: (
      id: string,
      input: RouteUpdateInput
    ) => Effect.Effect<Route, RouteNotFoundError | PersistenceError>
    readonly delete: (id: string) => Effect.Effect<Route, RouteNotFoundError | PersistenceError>
    readonly addLeg: (
      routeId: string,
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

      getById: (id: string) => {
        return repository.getById(id).pipe(
          Effect.map((route) => Route.fromRoute(route)),
          Effect.catchTag("order/RecordNotFoundError", (error) =>
            Effect.fail(new RouteNotFoundError({ id, message: error.message }))
          )
        )
      },

      update: (id: string, input: RouteUpdateInput) => {
        return repository.update(id, input).pipe(
          Effect.map((route) => Route.fromRoute(route)),
          Effect.catchTag("order/RecordNotFoundError", (error) =>
            Effect.fail(new RouteNotFoundError({ id, message: error.message }))
          )
        )
      },

      delete: (id: string) => {
        return repository.delete(id).pipe(
          Effect.map((route) => Route.fromRoute(route)),
          Effect.catchTag("order/RecordNotFoundError", (error) =>
            Effect.fail(new RouteNotFoundError({ id, message: error.message }))
          )
        )
      },

      addLeg: (routeId: string, input: AddRouteLegInput) => {
        return repository.addLeg(routeId, input).pipe(
          Effect.map((route) => Route.fromRoute(route)),
          Effect.catchTag("order/RecordNotFoundError", (error) =>
            Effect.fail(new RouteNotFoundError({ id: routeId, message: error.message }))
          )
        )
      },
    })
  })
)
