import { Context, Effect, Layer } from "effect"
import { DriverRepository } from "delivery/repository/driver-repository"
import { OrderRepository } from "ordering/repository/order-repository"
import { DriverId, OrderId } from "@/ids"
import { PersistenceError } from "@/persistence-errors"
import { OrderStatus } from "@prisma/client"
import { transition, InvalidOrderStatusTransitionError } from "ordering/domain/order-status"

export class DriverAssignmentService extends Context.Tag("delivery/DriverAssignmentService")<
  DriverAssignmentService,
  {
    readonly findAvailableDriver: () => Effect.Effect<
      { id: DriverId; name: string; email: string; phone: string; isAvailable: boolean; vehicleType: string } | null,
      PersistenceError
    >
    readonly assignDriverToOrder: (
      orderId: OrderId,
      driverId: DriverId
    ) => Effect.Effect<
      { id: OrderId; driverId: DriverId; status: string },
      PersistenceError | InvalidOrderStatusTransitionError
    >
  }
>() {}

export const DriverAssignmentServiceLive = Layer.effect(
  DriverAssignmentService,
  Effect.gen(function* () {
    const driverRepo = yield* DriverRepository
    const orderRepo = yield* OrderRepository

    return DriverAssignmentService.of({
      findAvailableDriver: () => driverRepo.findAvailable(),

      assignDriverToOrder: (orderId: OrderId, driverId: DriverId) =>
        Effect.gen(function* () {
          const assignedAt = new Date()
          const validatedStatus = yield* transition(OrderStatus.PENDING, OrderStatus.ASSIGNED)
          const { order } = yield* orderRepo.assignDriver(orderId, driverId, assignedAt, validatedStatus)
          return { id: order.id as OrderId, driverId: order.driverId! as DriverId, status: order.status }
        }),
    })
  })
)
