import { DeliveryStatus } from "@prisma/client"
import { Schema } from "effect"
import Delivery from "delivery/domain/delivery"
import { DeliveryId, DriverId, OrderId, RouteId } from "@/ids"
import type { DeliveryWithDetails } from "delivery/repository/delivery-repository"

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

class DeliveryDriverView extends Schema.Class<DeliveryDriverView>("delivery/DeliveryDriverView")({
  id: Schema.NonEmptyString,
  name: Schema.String,
  vehicleType: Schema.String,
  licenseNumber: Schema.NullishOr(Schema.String),
}) {
  static fromDriver(driver: {
    id: string
    name: string
    vehicleType: string
    licenseNumber: string | null
  }): DeliveryDriverView {
    return new DeliveryDriverView({
      id: driver.id,
      name: driver.name,
      vehicleType: driver.vehicleType,
      licenseNumber: driver.licenseNumber ?? null,
    })
  }
}

class DeliveryLocationView extends Schema.Class<DeliveryLocationView>("delivery/DeliveryLocationView")({
  id: Schema.NonEmptyString,
  name: Schema.String,
}) {
  static fromLocation(location: { id: string; name: string }): DeliveryLocationView {
    return new DeliveryLocationView({ id: location.id, name: location.name })
  }
}

class DeliveryRouteView extends Schema.Class<DeliveryRouteView>("delivery/DeliveryRouteView")({
  id: Schema.NonEmptyString,
  pickup: DeliveryLocationView,
  dropoff: DeliveryLocationView,
}) {
  static fromRoute(route: {
    id: string
    pickup: { id: string; name: string }
    dropoff: { id: string; name: string }
  }): DeliveryRouteView {
    return new DeliveryRouteView({
      id: route.id,
      pickup: DeliveryLocationView.fromLocation(route.pickup),
      dropoff: DeliveryLocationView.fromLocation(route.dropoff),
    })
  }
}

class DeliveryPackageView extends Schema.Class<DeliveryPackageView>("delivery/DeliveryPackageView")({
  id: Schema.NonEmptyString,
  orderId: Schema.NonEmptyString,
  trackingNumber: Schema.NonEmptyString,
  description: Schema.String,
  status: Schema.String,
  address: Schema.String,
}) {
  static fromPackage(
    pkg: { id: string; orderId: string; trackingNumber: string; description: string; status: string },
    address: string
  ): DeliveryPackageView {
    return new DeliveryPackageView({
      id: pkg.id,
      orderId: pkg.orderId,
      trackingNumber: pkg.trackingNumber,
      description: pkg.description,
      status: pkg.status,
      address,
    })
  }
}

export class DeliveryRouteResponse extends Schema.Class<DeliveryRouteResponse>("delivery/DeliveryRouteResponse")({
  id: Schema.NonEmptyString,
  status: Schema.String,
  driverId: Schema.NonEmptyString,
  driver: DeliveryDriverView,
  routeId: Schema.NonEmptyString,
  route: DeliveryRouteView,
  estimatedPickupTime: Schema.NullishOr(Schema.Date),
  estimatedDeliveryTime: Schema.NullishOr(Schema.Date),
  actualPickupTime: Schema.NullishOr(Schema.Date),
  actualDeliveryTime: Schema.NullishOr(Schema.Date),
  createdAt: Schema.Date,
  updatedAt: Schema.Date,
  packages: Schema.Array(DeliveryPackageView),
}) {
  static fromDeliveryWithDetails(delivery: DeliveryWithDetails): DeliveryRouteResponse {
    return new DeliveryRouteResponse({
      id: delivery.id,
      status: delivery.status,
      driverId: delivery.driverId,
      driver: DeliveryDriverView.fromDriver(delivery.driver),
      routeId: delivery.routeId,
      route: DeliveryRouteView.fromRoute(delivery.route),
      estimatedPickupTime: delivery.estimatedPickupTime ?? null,
      estimatedDeliveryTime: delivery.estimatedDeliveryTime ?? null,
      actualPickupTime: delivery.actualPickupTime ?? null,
      actualDeliveryTime: delivery.actualDeliveryTime ?? null,
      createdAt: delivery.createdAt,
      updatedAt: delivery.updatedAt,
      packages: delivery.orders.flatMap((order) =>
        order.packages.map((pkg) => DeliveryPackageView.fromPackage(pkg, order.deliveryAddress))
      ),
    })
  }
}
