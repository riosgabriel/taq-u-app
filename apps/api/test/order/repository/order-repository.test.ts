import { describe, expect, it } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { OrderRepository, OrderRepositoryLive } from "ordering/repository/order-repository"
import { TrackingNumberService, TrackingNumberServiceShape } from "ordering/services/tracking-number-service"
import { EventPublisher } from "events/event-publisher"
import { CustomerId, DriverId, OrderId } from "@/ids"
import { OrderStatus, Prisma } from "@prisma/client"
import { OrderCreateInput } from "ordering/dto/order-dto"
import { PrismaService } from "prisma-service"
import { mockPrismaServiceWith } from "../../helpers/mock-prisma-service"

describe("OrderRepository.markAssigned", () => {
  const prismaWith = mockPrismaServiceWith

  const mockEventPublisher = EventPublisher.of({
    writeInTransaction: async (_tx: any, events: any) => events,
    notify: () => Effect.void,
  })

  const mockTrackingNumberService = TrackingNumberService.of({ generate: () => "TAQ-TEST" })

  const fixedAssignedAt = new Date("2026-01-01T10:00:00.000Z")

  const makeTx = (overrides: { order?: Record<string, any>; package?: Record<string, any> }) => ({
    order: {
      updateMany: async () => ({ count: 0 }),
      findUnique: async () => null,
      findUniqueOrThrow: async () => ({
        id: "order-1",
        status: OrderStatus.ASSIGNED,
        driverId: "driver-1",
        packages: [],
      }),
      ...overrides.order,
    },
    package: { create: async () => ({ id: "pkg-1" }), ...overrides.package },
  })

  const layerWithTracking = (tx: unknown, trackingService: TrackingNumberServiceShape) =>
    OrderRepositoryLive.pipe(
      Layer.provide(Layer.succeed(PrismaService, prismaWith(tx))),
      Layer.provide(Layer.succeed(TrackingNumberService, trackingService)),
      Layer.provide(Layer.succeed(EventPublisher, mockEventPublisher))
    )

  const layerWith = (tx: unknown) => layerWithTracking(tx, mockTrackingNumberService)

  it.effect("fails with RecordNotFoundError when the order does not exist", () =>
    Effect.gen(function* () {
      const repo = yield* OrderRepository
      const failure = yield* repo
        .markAssigned("order-1" as OrderId, "driver-1" as DriverId, fixedAssignedAt)
        .pipe(Effect.flip)
      expect(failure._tag).toBe("persistence/RecordNotFoundError")
    }).pipe(Effect.provide(layerWith(makeTx({}))))
  )

  it.effect("fails with InvalidOrderStatusTransitionError when the order is not PENDING", () =>
    Effect.gen(function* () {
      const repo = yield* OrderRepository
      const failure = yield* repo
        .markAssigned("order-1" as OrderId, "driver-1" as DriverId, fixedAssignedAt)
        .pipe(Effect.flip)
      expect(failure._tag).toBe("order/InvalidOrderStatusTransitionError")
    }).pipe(
      Effect.provide(
        layerWith(
          makeTx({
            order: {
              findUnique: async () => ({
                id: "order-1",
                status: OrderStatus.IN_PROGRESS,
                driverId: null,
                packages: [],
              }),
            },
          })
        )
      )
    )
  )

  it.effect("succeeds idempotently when the order is already assigned to the same driver", () =>
    Effect.gen(function* () {
      const repo = yield* OrderRepository
      const order = yield* repo.markAssigned("order-1" as OrderId, "driver-1" as DriverId, fixedAssignedAt)
      expect(order.status).toBe(OrderStatus.ASSIGNED)
      expect(order.driverId).toBe("driver-1")
    }).pipe(
      Effect.provide(
        layerWith(
          makeTx({
            order: {
              findUnique: async () => ({
                id: "order-1",
                status: OrderStatus.ASSIGNED,
                driverId: "driver-1",
                packages: [],
              }),
            },
          })
        )
      )
    )
  )

  it.effect("marks a PENDING order as ASSIGNED and returns it", () =>
    Effect.gen(function* () {
      const repo = yield* OrderRepository
      const order = yield* repo.markAssigned("order-1" as OrderId, "driver-1" as DriverId, fixedAssignedAt)
      expect(order.status).toBe(OrderStatus.ASSIGNED)
    }).pipe(
      Effect.provide(
        layerWith(
          makeTx({
            order: {
              updateMany: async () => ({ count: 1 }),
              findUniqueOrThrow: async () => ({
                id: "order-1",
                status: OrderStatus.ASSIGNED,
                driverId: "driver-1",
                packages: [],
              }),
            },
          })
        )
      )
    )
  )
})

describe("OrderRepository.addPackageToOrder", () => {
  const prismaWith = mockPrismaServiceWith

  const mockEventPublisher = EventPublisher.of({
    writeInTransaction: async (_tx: any, events: any) => events,
    notify: () => Effect.void,
  })

  const mockTrackingNumberService = TrackingNumberService.of({ generate: () => "TAQ-TEST" })

  const sequenceTrackingNumberService = TrackingNumberService.of({
    generate: (() => {
      let i = 0
      return () => `TAQ-SEQ-${i++}`
    })(),
  })

  const makeTx = (overrides: { order?: Record<string, any>; package?: Record<string, any> }) => ({
    order: {
      updateMany: async () => ({ count: 0 }),
      findUnique: async () => null,
      findUniqueOrThrow: async () => ({
        id: "order-1",
        status: OrderStatus.ASSIGNED,
        driverId: "driver-1",
        packages: [],
      }),
      ...overrides.order,
    },
    package: { create: async () => ({ id: "pkg-1" }), ...overrides.package },
  })

  const layerWithTracking = (tx: unknown, trackingService: TrackingNumberServiceShape) =>
    OrderRepositoryLive.pipe(
      Layer.provide(Layer.succeed(PrismaService, prismaWith(tx))),
      Layer.provide(Layer.succeed(TrackingNumberService, trackingService)),
      Layer.provide(Layer.succeed(EventPublisher, mockEventPublisher))
    )

  const packageInput = {
    weightKg: 5,
    dimensions: "10x10x10",
    description: "fragile vase",
    fragile: true,
    perishable: false,
    insured: true,
  }

  it.effect("creates a package using the generated tracking number", () => {
    let createData: Record<string, any> | undefined
    const tx = makeTx({
      package: {
        create: async (args: any) => {
          createData = args
          return { id: "pkg-1" }
        },
      },
    })
    return Effect.gen(function* () {
      const repo = yield* OrderRepository
      const order = yield* repo.addPackageToOrder("order-1" as OrderId, packageInput)
      expect(order.status).toBe(OrderStatus.ASSIGNED)
      expect(createData?.data.trackingNumber).toBe("TAQ-TEST")
      expect(createData?.data.weightKg).toBe(5)
    }).pipe(Effect.provide(layerWithTracking(tx, mockTrackingNumberService)))
  })

  it.effect("retries with a fresh tracking number when the insert hits a unique violation", () => {
    const created: string[] = []
    const tx = makeTx({
      package: {
        create: async (args: any) => {
          created.push(args.data.trackingNumber)
          if (created.length === 1) {
            throw new Prisma.PrismaClientKnownRequestError("Unique constraint failed on trackingNumber", {
              code: "P2002",
              clientVersion: "test",
              meta: { target: ["trackingNumber"] },
            })
          }
          return { id: "pkg-1" }
        },
      },
    })
    return Effect.gen(function* () {
      const repo = yield* OrderRepository
      const order = yield* repo.addPackageToOrder("order-1" as OrderId, packageInput)
      expect(order.status).toBe(OrderStatus.ASSIGNED)
      expect(created).toHaveLength(2)
      expect(created[0]).not.toBe(created[1])
    }).pipe(Effect.provide(layerWithTracking(tx, sequenceTrackingNumberService)))
  })

  it.effect("fails with UniqueConstraintViolation after exhausting retries", () => {
    let calls = 0
    const tx = makeTx({
      package: {
        create: async () => {
          calls++
          throw new Prisma.PrismaClientKnownRequestError("Unique constraint failed on trackingNumber", {
            code: "P2002",
            clientVersion: "test",
            meta: { target: ["trackingNumber"] },
          })
        },
      },
    })
    return Effect.gen(function* () {
      const repo = yield* OrderRepository
      const failure = yield* repo.addPackageToOrder("order-1" as OrderId, packageInput).pipe(Effect.flip)
      expect(failure._tag).toBe("persistence/UniqueConstraintViolation")
      expect(calls).toBe(3)
    }).pipe(Effect.provide(layerWithTracking(tx, mockTrackingNumberService)))
  })

  it.effect("does not retry on non-unique-violation errors", () => {
    let calls = 0
    const tx = makeTx({
      package: {
        create: async () => {
          calls++
          throw new Prisma.PrismaClientKnownRequestError("Record not found", {
            code: "P2025",
            clientVersion: "test",
            meta: { modelName: "Package" },
          })
        },
      },
    })
    return Effect.gen(function* () {
      const repo = yield* OrderRepository
      const failure = yield* repo.addPackageToOrder("order-1" as OrderId, packageInput).pipe(Effect.flip)
      expect(failure._tag).toBe("persistence/RecordNotFoundError")
      expect(calls).toBe(1)
    }).pipe(Effect.provide(layerWithTracking(tx, mockTrackingNumberService)))
  })

  it.effect("does not retry on a unique violation for a non-trackingNumber field", () => {
    let calls = 0
    const tx = makeTx({
      package: {
        create: async () => {
          calls++
          throw new Prisma.PrismaClientKnownRequestError("Unique constraint failed on email", {
            code: "P2002",
            clientVersion: "test",
            meta: { target: ["email"] },
          })
        },
      },
    })
    return Effect.gen(function* () {
      const repo = yield* OrderRepository
      const failure = yield* repo.addPackageToOrder("order-1" as OrderId, packageInput).pipe(Effect.flip)
      expect(failure._tag).toBe("persistence/UniqueConstraintViolation")
      expect(calls).toBe(1)
    }).pipe(Effect.provide(layerWithTracking(tx, mockTrackingNumberService)))
  })
})

describe("OrderRepository.createOrder", () => {
  const prismaWith = mockPrismaServiceWith

  const mockEventPublisher = EventPublisher.of({
    writeInTransaction: async (_tx: any, events: any) => events,
    notify: () => Effect.void,
  })

  const mockTrackingNumberService = TrackingNumberService.of({ generate: () => "TAQ-TEST" })

  const sequenceTrackingNumberService = TrackingNumberService.of({
    generate: (() => {
      let i = 0
      return () => `TAQ-SEQ-${i++}`
    })(),
  })

  const layerWithTracking = (tx: unknown, trackingService: TrackingNumberServiceShape) =>
    OrderRepositoryLive.pipe(
      Layer.provide(Layer.succeed(PrismaService, prismaWith(tx))),
      Layer.provide(Layer.succeed(TrackingNumberService, trackingService)),
      Layer.provide(Layer.succeed(EventPublisher, mockEventPublisher))
    )

  const layerWith = (tx: unknown) => layerWithTracking(tx, mockTrackingNumberService)

  const orderInput: OrderCreateInput = {
    customerId: "customer-1" as CustomerId,
    pickupAddress: "123 Main St",
    deliveryAddress: "456 Oak Ave",
    pickupDate: "2026-01-05",
    deliveryDate: "2026-01-06",
    specialInstructions: "leave at door",
    priority: "STANDARD",
    packages: [
      {
        weightKg: 5,
        dimensions: "10x10x10",
        description: "test package",
        fragile: false,
        perishable: false,
        insured: false,
      },
    ],
  }

  const makeTx = (overrides: { order?: Record<string, any> } = {}) => ({
    order: {
      updateMany: async () => ({ count: 0 }),
      findUnique: async () => null,
      findUniqueOrThrow: async () => ({
        id: "order-1",
        status: OrderStatus.ASSIGNED,
        driverId: "driver-1",
        packages: [],
      }),
      ...overrides.order,
    },
    package: { create: async () => ({ id: "pkg-1" }) },
  })

  it.effect("retries with fresh tracking numbers when createMany hits a unique violation", () => {
    let calls = 0
    const trackingNumbers: string[] = []
    const tx = makeTx({
      order: {
        create: async (args: any) => {
          calls++
          trackingNumbers.push(args.data.packages.createMany.data[0].trackingNumber)
          if (calls === 1) {
            throw new Prisma.PrismaClientKnownRequestError("Unique constraint failed on trackingNumber", {
              code: "P2002",
              clientVersion: "test",
              meta: { target: ["trackingNumber"] },
            })
          }
          return { id: "order-1", customerId: "customer-1", status: OrderStatus.PENDING, packages: [] }
        },
      },
    })
    return Effect.gen(function* () {
      const repo = yield* OrderRepository
      const result = yield* repo.createOrder(orderInput)
      expect(result.order.id).toBe("order-1")
      expect(calls).toBe(2)
      expect(trackingNumbers).toHaveLength(2)
      expect(trackingNumbers[0]).not.toBe(trackingNumbers[1])
    }).pipe(Effect.provide(layerWithTracking(tx, sequenceTrackingNumberService)))
  })

  it.effect("fails with UniqueConstraintViolation after exhausting retries", () => {
    let calls = 0
    const tx = makeTx({
      order: {
        create: async () => {
          calls++
          throw new Prisma.PrismaClientKnownRequestError("Unique constraint failed on trackingNumber", {
            code: "P2002",
            clientVersion: "test",
            meta: { target: ["trackingNumber"] },
          })
        },
      },
    })
    return Effect.gen(function* () {
      const repo = yield* OrderRepository
      const failure = yield* repo.createOrder(orderInput).pipe(Effect.flip)
      expect(failure._tag).toBe("persistence/UniqueConstraintViolation")
      expect(calls).toBe(3)
    }).pipe(Effect.provide(layerWith(tx)))
  })
})
