import { Delivery as PrismaDelivery } from "@prisma/client"
import { Schema } from "effect"
import { DeliveryId, DriverId, RouteId } from "@/ids"

export class Delivery extends Schema.Class<Delivery>("delivery/Delivery")({
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
  static fromDelivery(delivery: PrismaDelivery): Delivery {
    return {
      id: Schema.decodeSync(DeliveryId)(delivery.id),
      driverId: Schema.decodeSync(DriverId)(delivery.driverId),
      routeId: Schema.decodeSync(RouteId)(delivery.routeId),
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

export default Delivery
