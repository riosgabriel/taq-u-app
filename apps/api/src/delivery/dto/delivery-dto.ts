import { DeliveryStatus } from "@prisma/client"
import { Schema } from "effect"
import Delivery from "delivery/domain/delivery"
import { DeliveryId, DriverId, OrderId, RouteId } from "@/ids"

export class CreateDeliveryInput extends Schema.Class<CreateDeliveryInput>("delivery/CreateDeliveryInput")({
  driverId: DriverId.annotations({
    required: true,
    identifier: "driverId",
  }),
  routeId: RouteId.annotations({
    required: true,
    identifier: "routeId",
  }),
  orderIds: Schema.optional(Schema.Array(OrderId)).annotations({
    required: false,
    identifier: "orderIds",
  }),
  estimatedPickupTime: Schema.optional(Schema.Date).annotations({
    required: false,
    identifier: "estimatedPickupTime",
  }),
  estimatedDeliveryTime: Schema.optional(Schema.Date).annotations({
    required: false,
    identifier: "estimatedDeliveryTime",
  }),
}) {}

export class UpdateDeliveryStatusInput extends Schema.Class<UpdateDeliveryStatusInput>(
  "delivery/UpdateDeliveryStatusInput"
)({
  status: Schema.Literal(
    DeliveryStatus.PICKUP_IN_PROGRESS,
    DeliveryStatus.PICKED_UP,
    DeliveryStatus.IN_TRANSIT,
    DeliveryStatus.OUT_FOR_DELIVERY,
    DeliveryStatus.DELIVERED,
    DeliveryStatus.FAILED,
    DeliveryStatus.CANCELLED
  ).annotations({
    required: true,
    identifier: "status",
  }),
}) {}

export class AssignDeliveryDriverInput extends Schema.Class<AssignDeliveryDriverInput>(
  "delivery/AssignDeliveryDriverInput"
)({
  driverId: DriverId.annotations({
    required: true,
    identifier: "driverId",
  }),
}) {}

export class DeliveryResponse extends Schema.Class<DeliveryResponse>("delivery/DeliveryResponse")({
  id: DeliveryId,
  driverId: DriverId,
  routeId: RouteId,
  estimatedPickupTime: Schema.NullishOr(Schema.Date),
  estimatedDeliveryTime: Schema.NullishOr(Schema.Date),
  actualPickupTime: Schema.NullishOr(Schema.Date),
  actualDeliveryTime: Schema.NullishOr(Schema.Date),
  status: Schema.String,
  createdAt: Schema.Date,
  updatedAt: Schema.Date,
}) {
  static fromDelivery(delivery: Delivery): DeliveryResponse {
    return {
      id: delivery.id,
      driverId: delivery.driverId,
      routeId: delivery.routeId,
      estimatedPickupTime: delivery.estimatedPickupTime ?? null,
      estimatedDeliveryTime: delivery.estimatedDeliveryTime ?? null,
      actualPickupTime: delivery.actualPickupTime ?? null,
      actualDeliveryTime: delivery.actualDeliveryTime ?? null,
      status: delivery.status,
      createdAt: delivery.createdAt,
      updatedAt: delivery.updatedAt,
    }
  }
}
