import { DriverId, OrderId } from "@/ids"
import { PersistenceError } from "@/persistence-errors"
import { OrderStatus } from "@prisma/client"
import { DriverRepository } from "delivery/repository/driver-repository"
import { Context, Effect, Layer } from "effect"
import { InvalidOrderStatusTransitionError, transition } from "ordering/domain/order-status"
import { OrderRepository, OrderWithPackages } from "ordering/repository/order-repository"
import { DriverNotAvailableError } from "delivery/services/driver-service"
import { EventPublisher } from "events/event-publisher"

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
      OrderWithPackages,
      PersistenceError | InvalidOrderStatusTransitionError | DriverNotAvailableError
    >
  }
>() {}

export const DriverAssignmentServiceLive = Layer.effect(
  DriverAssignmentService,
  Effect.gen(function* () {
    const driverRepo = yield* DriverRepository
    const orderRepo = yield* OrderRepository
    const eventPublisher = yield* EventPublisher

    return DriverAssignmentService.of({
      findAvailableDriver: () => driverRepo.findAvailable(),

      assignDriverToOrder: (orderId: OrderId, driverId: DriverId) =>
        Effect.gen(function* () {
          const assignedAt = new Date()
          const validatedStatus = yield* transition(OrderStatus.PENDING, OrderStatus.ASSIGNED)
          const { order, events } = yield* orderRepo.assignDriver(orderId, driverId, assignedAt, validatedStatus)

          // Publish domain events after successful assignment
          if (events.length > 0) {
            yield* eventPublisher.notify(events)
          }

          return order
        }),
    })
  })
)
