import { RecordNotFoundError } from "@/persistence-errors"
import { describe, expect, it } from "@effect/vitest"
import { assertLeft } from "@effect/vitest/utils"
import { Effect, Layer } from "effect"
import { RouteRepository } from "route/repository/route-repository"
import { RouteNotFoundError, RouteService, RouteServiceLive } from "route/services/route-service"

const leg = {
  id: "leg-1",
  routeId: "route-1",
  transportMode: "TRUCK" as const,
  pickupLocationId: "loc-leg-pickup",
  dropoffLocationId: "loc-leg-dropoff",
  carrierId: null,
  startTime: new Date("2026-09-01T08:00:00Z"),
  endTime: new Date("2026-09-01T18:00:00Z"),
}

const route = {
  id: "route-1",
  pickupId: "loc-pickup",
  dropoffId: "loc-dropoff",
  carrierId: null,
  legs: [leg],
}

const emptyRoute = {
  id: "route-2",
  pickupId: "loc-pickup-2",
  dropoffId: "loc-dropoff-2",
  carrierId: "carrier-1",
  legs: [],
}

const buildTestLayer = (mockRepo: typeof RouteRepository.Service) =>
  RouteServiceLive.pipe(Layer.provide(Layer.succeed(RouteRepository, mockRepo)))

describe("RouteService", () => {
  describe("listAll", () => {
    it.effect("returns all routes with their legs", () =>
      Effect.gen(function* () {
        const service = yield* RouteService
        const result = yield* service.listAll()
        expect(result).toHaveLength(2)
        expect(result[0].id).toBe("route-1")
        expect(result[0].legs).toHaveLength(1)
        expect(result[0].legs[0].transportMode).toBe("TRUCK")
        expect(result[1].legs).toHaveLength(0)
        expect(result[1].carrierId).toBe("carrier-1")
      }).pipe(
        Effect.provide(
          buildTestLayer(
            RouteRepository.of({
              create: () => Effect.die("unexpected"),
              listAll: () => Effect.succeed([route, emptyRoute]),
              getById: () => Effect.die("unexpected"),
              update: () => Effect.die("unexpected"),
              delete: () => Effect.die("unexpected"),
              addLeg: () => Effect.die("unexpected"),
            })
          )
        )
      )
    )

    it.effect("returns empty list when no routes exist", () =>
      Effect.gen(function* () {
        const service = yield* RouteService
        const result = yield* service.listAll()
        expect(result).toEqual([])
      }).pipe(
        Effect.provide(
          buildTestLayer(
            RouteRepository.of({
              create: () => Effect.die("unexpected"),
              listAll: () => Effect.succeed([]),
              getById: () => Effect.die("unexpected"),
              update: () => Effect.die("unexpected"),
              delete: () => Effect.die("unexpected"),
              addLeg: () => Effect.die("unexpected"),
            })
          )
        )
      )
    )
  })

  describe("getById", () => {
    it.effect("returns the route with legs when found", () =>
      Effect.gen(function* () {
        const service = yield* RouteService
        const result = yield* service.getById("route-1")
        expect(result.id).toBe("route-1")
        expect(result.pickupId).toBe("loc-pickup")
        expect(result.dropoffId).toBe("loc-dropoff")
        expect(result.legs).toHaveLength(1)
        expect(result.legs[0].id).toBe("leg-1")
      }).pipe(
        Effect.provide(
          buildTestLayer(
            RouteRepository.of({
              create: () => Effect.die("unexpected"),
              listAll: () => Effect.die("unexpected"),
              getById: () => Effect.succeed(route),
              update: () => Effect.die("unexpected"),
              delete: () => Effect.die("unexpected"),
              addLeg: () => Effect.die("unexpected"),
            })
          )
        )
      )
    )

    it.effect("fails with RouteNotFoundError when route does not exist", () =>
      Effect.gen(function* () {
        const program = Effect.gen(function* () {
          const service = yield* RouteService
          return yield* service.getById("missing-id")
        }).pipe(Effect.either)

        const result = yield* program
        assertLeft(result, new RouteNotFoundError({ id: "missing-id", message: "Not found" }))
      }).pipe(
        Effect.provide(
          buildTestLayer(
            RouteRepository.of({
              create: () => Effect.die("unexpected"),
              listAll: () => Effect.die("unexpected"),
              getById: (id) =>
                Effect.fail(new RecordNotFoundError({ model: "Route", id, message: "Not found" })),
              update: () => Effect.die("unexpected"),
              delete: () => Effect.die("unexpected"),
              addLeg: () => Effect.die("unexpected"),
            })
          )
        )
      )
    )
  })

  describe("create", () => {
    const input = {
      pickupId: "loc-new-pickup",
      dropoffId: "loc-new-dropoff",
    }

    it.effect("creates a route without legs and returns it", () =>
      Effect.gen(function* () {
        const service = yield* RouteService
        const result = yield* service.create(input)
        expect(result.id).toBe("route-2")
        expect(result.pickupId).toBe("loc-pickup-2")
        expect(result.dropoffId).toBe("loc-dropoff-2")
        expect(result.legs).toEqual([])
        expect(result.carrierId).toBe("carrier-1")
      }).pipe(
        Effect.provide(
          buildTestLayer(
            RouteRepository.of({
              create: () => Effect.succeed(emptyRoute),
              listAll: () => Effect.die("unexpected"),
              getById: () => Effect.die("unexpected"),
              update: () => Effect.die("unexpected"),
              delete: () => Effect.die("unexpected"),
              addLeg: () => Effect.die("unexpected"),
            })
          )
        )
      )
    )

    it.effect("creates a route with nested legs and returns them", () =>
      Effect.gen(function* () {
        const service = yield* RouteService
        const result = yield* service.create({
          pickupId: "loc-new-pickup",
          dropoffId: "loc-new-dropoff",
          legs: [
            {
              transportMode: "TRUCK",
              pickupLocationId: "loc-leg-1-pickup",
              dropoffLocationId: "loc-leg-1-dropoff",
            },
          ],
        })
        expect(result.legs).toHaveLength(1)
        expect(result.legs[0].transportMode).toBe("TRUCK")
        expect(result.legs[0].pickupLocationId).toBe("loc-leg-pickup")
      }).pipe(
        Effect.provide(
          buildTestLayer(
            RouteRepository.of({
              create: () => Effect.succeed(route),
              listAll: () => Effect.die("unexpected"),
              getById: () => Effect.die("unexpected"),
              update: () => Effect.die("unexpected"),
              delete: () => Effect.die("unexpected"),
              addLeg: () => Effect.die("unexpected"),
            })
          )
        )
      )
    )
  })

  describe("update", () => {
    const input = { carrierId: "carrier-2" }

    it.effect("updates and returns the route", () =>
      Effect.gen(function* () {
        const service = yield* RouteService
        const result = yield* service.update("route-1", input)
        expect(result.id).toBe("route-1")
        expect(result.carrierId).toBeNull()
      }).pipe(
        Effect.provide(
          buildTestLayer(
            RouteRepository.of({
              create: () => Effect.die("unexpected"),
              listAll: () => Effect.die("unexpected"),
              getById: () => Effect.die("unexpected"),
              update: () => Effect.succeed(route),
              delete: () => Effect.die("unexpected"),
              addLeg: () => Effect.die("unexpected"),
            })
          )
        )
      )
    )

    it.effect("fails with RouteNotFoundError when route does not exist", () =>
      Effect.gen(function* () {
        const program = Effect.gen(function* () {
          const service = yield* RouteService
          return yield* service.update("missing-id", input)
        }).pipe(Effect.either)

        const result = yield* program
        assertLeft(result, new RouteNotFoundError({ id: "missing-id", message: "Not found" }))
      }).pipe(
        Effect.provide(
          buildTestLayer(
            RouteRepository.of({
              create: () => Effect.die("unexpected"),
              listAll: () => Effect.die("unexpected"),
              getById: () => Effect.die("unexpected"),
              update: (id) =>
                Effect.fail(new RecordNotFoundError({ model: "Route", id, message: "Not found" })),
              delete: () => Effect.die("unexpected"),
              addLeg: () => Effect.die("unexpected"),
            })
          )
        )
      )
    )
  })

  describe("delete", () => {
    it.effect("deletes and returns the route", () =>
      Effect.gen(function* () {
        const service = yield* RouteService
        const result = yield* service.delete("route-1")
        expect(result.id).toBe("route-1")
        expect(result.legs).toHaveLength(1)
      }).pipe(
        Effect.provide(
          buildTestLayer(
            RouteRepository.of({
              create: () => Effect.die("unexpected"),
              listAll: () => Effect.die("unexpected"),
              getById: () => Effect.die("unexpected"),
              update: () => Effect.die("unexpected"),
              delete: () => Effect.succeed(route),
              addLeg: () => Effect.die("unexpected"),
            })
          )
        )
      )
    )

    it.effect("fails with RouteNotFoundError when route does not exist", () =>
      Effect.gen(function* () {
        const program = Effect.gen(function* () {
          const service = yield* RouteService
          return yield* service.delete("missing-id")
        }).pipe(Effect.either)

        const result = yield* program
        assertLeft(result, new RouteNotFoundError({ id: "missing-id", message: "Not found" }))
      }).pipe(
        Effect.provide(
          buildTestLayer(
            RouteRepository.of({
              create: () => Effect.die("unexpected"),
              listAll: () => Effect.die("unexpected"),
              getById: () => Effect.die("unexpected"),
              update: () => Effect.die("unexpected"),
              delete: (id) =>
                Effect.fail(new RecordNotFoundError({ model: "Route", id, message: "Not found" })),
              addLeg: () => Effect.die("unexpected"),
            })
          )
        )
      )
    )
  })

  describe("addLeg", () => {
    const input = {
      transportMode: "AIRPLANE" as const,
      pickupLocationId: "loc-new-leg-pickup",
      dropoffLocationId: "loc-new-leg-dropoff",
    }

    const routeWithNewLeg = {
      ...route,
      legs: [
        leg,
        {
          id: "leg-2",
          routeId: "route-1",
          transportMode: "AIRPLANE" as const,
          pickupLocationId: "loc-new-leg-pickup",
          dropoffLocationId: "loc-new-leg-dropoff",
          carrierId: null,
          startTime: null,
          endTime: null,
        },
      ],
    }

    it.effect("adds a leg and returns the route with the new leg", () =>
      Effect.gen(function* () {
        const service = yield* RouteService
        const result = yield* service.addLeg("route-1", input)
        expect(result.legs).toHaveLength(2)
        expect(result.legs[1].transportMode).toBe("AIRPLANE")
        expect(result.legs[1].pickupLocationId).toBe("loc-new-leg-pickup")
      }).pipe(
        Effect.provide(
          buildTestLayer(
            RouteRepository.of({
              create: () => Effect.die("unexpected"),
              listAll: () => Effect.die("unexpected"),
              getById: () => Effect.die("unexpected"),
              update: () => Effect.die("unexpected"),
              delete: () => Effect.die("unexpected"),
              addLeg: () => Effect.succeed(routeWithNewLeg),
            })
          )
        )
      )
    )

    it.effect("fails with RouteNotFoundError when route does not exist", () =>
      Effect.gen(function* () {
        const program = Effect.gen(function* () {
          const service = yield* RouteService
          return yield* service.addLeg("missing-id", input)
        }).pipe(Effect.either)

        const result = yield* program
        assertLeft(result, new RouteNotFoundError({ id: "missing-id", message: "Not found" }))
      }).pipe(
        Effect.provide(
          buildTestLayer(
            RouteRepository.of({
              create: () => Effect.die("unexpected"),
              listAll: () => Effect.die("unexpected"),
              getById: () => Effect.die("unexpected"),
              update: () => Effect.die("unexpected"),
              delete: () => Effect.die("unexpected"),
              addLeg: (id) =>
                Effect.fail(new RecordNotFoundError({ model: "Route", id, message: "Not found" })),
            })
          )
        )
      )
    )
  })
})
