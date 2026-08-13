import { DriverId, OrderId } from "@/ids"
import { PersistenceError } from "@/persistence-errors"
import { DriverRepository } from "delivery/repository/driver-repository"
import { DeliveryRepository } from "delivery/repository/delivery-repository"
import { Context, Effect, Layer } from "effect"
import Delivery from "delivery/domain/delivery"
import { DriverNotAvailableError, DriverNotFoundError, OrderNotAssignableError } from "delivery/domain/driver-errors"
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
      driverId: DriverId,
      assignedAt: Date
    ) => Effect.Effect<
      Delivery,
      DriverNotFoundError | DriverNotAvailableError | OrderNotAssignableError | PersistenceError
    >
  }
>() {}

export const DriverAssignmentServiceLive = Layer.effect(
  DriverAssignmentService,
  Effect.gen(function* () {
    const driverRepo = yield* DriverRepository
    const deliveryRepo = yield* DeliveryRepository
    const eventPublisher = yield* EventPublisher

    return DriverAssignmentService.of({
      findAvailableDriver: () => driverRepo.findAvailable(),

      assignDriverToOrder: (orderId: OrderId, driverId: DriverId, assignedAt: Date) =>
        Effect.gen(function* () {
          const { delivery, events } = yield* deliveryRepo.createAssignment(orderId, driverId, assignedAt)

          if (events.length > 0) {
            yield* eventPublisher.notify(events)
          }

          return Delivery.fromDelivery(delivery)
        }),
    })
  })
)
