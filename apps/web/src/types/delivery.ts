export type DeliveryStatus =
  | "ASSIGNED"
  | "PICKUP_IN_PROGRESS"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "FAILED"
  | "CANCELLED"

export type PackageStatus = "AWAITING_PICKUP" | "IN_TRANSIT" | "OUT_FOR_DELIVERY" | "DELIVERED" | "LOST"

export type RouteBucket = "planned" | "in_progress" | "completed" | "failed"

export interface DeliveryRouteDriver {
  id: string
  name: string
  vehicleType: string
  licenseNumber: string | null
}

export interface DeliveryRouteLocation {
  id: string
  name: string
}

export interface DeliveryRouteInfo {
  id: string
  pickup: DeliveryRouteLocation
  dropoff: DeliveryRouteLocation
}

export interface DeliveryPackage {
  id: string
  orderId: string
  trackingNumber: string
  description: string
  status: PackageStatus
  address: string
}

export interface DeliveryRoute {
  id: string
  status: DeliveryStatus
  driverId: string
  driver: DeliveryRouteDriver
  routeId: string
  route: DeliveryRouteInfo
  estimatedPickupTime: string | null
  estimatedDeliveryTime: string | null
  actualPickupTime: string | null
  actualDeliveryTime: string | null
  createdAt: string
  updatedAt: string
  packages: DeliveryPackage[]
}
