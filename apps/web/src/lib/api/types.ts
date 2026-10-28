// Mirrors the response/input DTOs in apps/api/src/*/dto. Dates arrive as ISO strings.

export type OrderPriority = "LOW" | "STANDARD" | "HIGH" | "URGENT"
export type OrderStatus = "PENDING" | "CONFIRMED" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
export type PackageStatus = "AWAITING_PICKUP" | "IN_TRANSIT" | "OUT_FOR_DELIVERY" | "DELIVERED" | "LOST"
export type DeliveryStatus =
  | "ASSIGNED"
  | "PICKUP_IN_PROGRESS"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "FAILED"
  | "CANCELLED"
export type UpdatableDeliveryStatus = Exclude<DeliveryStatus, "ASSIGNED">
export type VehicleType = "CAR" | "VAN" | "TRUCK" | "MOTORCYCLE" | "BICYCLE" | "ON_FOOT"
export type ServiceLevel = "STANDARD" | "EXPRESS" | "OVERNIGHT"

export interface Customer {
  id: string
  name: string
  email: string
  phone: string
  address: string | null
}

export interface LoginInput {
  email: string
  password: string
}

export interface RegisterInput {
  name: string
  email: string
  password: string
  phone?: string
}

export interface AuthResponse {
  token: string
  customer: Customer
}

export interface CustomerAddress {
  id: string
  label: string
  address: string
  isDefault: boolean
}

export interface CreateAddressInput {
  label: string
  address: string
  isDefault?: boolean
}

export type UpdateAddressInput = Partial<CreateAddressInput>

export interface Package {
  id: string
  weightKg: number
  dimensions: string
  description: string
  fragile: boolean
  perishable: boolean
  insured: boolean
  trackingNumber: string
  status: PackageStatus
}

export interface Order {
  id: string
  pickupAddress: string
  deliveryAddress: string
  pickupDate: string
  deliveryDate?: string
  specialInstructions?: string
  priority: OrderPriority
  status: OrderStatus
  driverId?: string
  assignedAt?: string
  packages: Package[]
}

export interface PackageInput {
  weightKg: number
  dimensions: string
  description: string
  fragile: boolean
  perishable: boolean
  insured: boolean
}

export interface MyOrderCreateInput {
  pickupAddress: string
  deliveryAddress: string
  pickupDate: string
  deliveryDate?: string
  specialInstructions?: string
  priority: OrderPriority
  packages: PackageInput[]
}

export type OrderUpdateInput = Partial<
  Pick<
    MyOrderCreateInput,
    "pickupAddress" | "deliveryAddress" | "pickupDate" | "deliveryDate" | "specialInstructions" | "priority"
  >
>

export interface TrackingResult {
  trackingNumber: string
  status: PackageStatus
  senderName: string
  recipientAddress: string
  pickupAddress: string
  pickupDate: string
  /** Backend currently echoes pickupDate here; not a real ETA yet. */
  estimatedDelivery: string
  /** Always empty until the backend records package status history. */
  updates: unknown[]
}

export interface EstimateInput {
  weightKg: number
  serviceLevel: ServiceLevel
  insured: boolean
  distanceKm?: number
  orderId?: string
}

export interface Estimate {
  id: string | null
  estimatedCost: number
  currency: string
  estimatedDeliveryTime: string
  orderId: string | null
}

export interface Driver {
  id: string
  name: string
  email: string
  phone: string
  licenseNumber: string
  vehicleType: VehicleType
  isAvailable: boolean
}

export type DriverInput = Omit<Driver, "id">

export interface DeliveryRoute {
  id: string
  status: DeliveryStatus
  driverId: string
  driver: { id: string; name: string; vehicleType: string; licenseNumber: string | null }
  routeId: string | null
  route: {
    id: string
    pickup: { id: string; name: string }
    dropoff: { id: string; name: string }
  } | null
  estimatedPickupTime: string | null
  estimatedDeliveryTime: string | null
  actualPickupTime: string | null
  actualDeliveryTime: string | null
  createdAt: string
  updatedAt: string
  packages: {
    id: string
    orderId: string
    trackingNumber: string
    description: string
    status: PackageStatus
    address: string
  }[]
}
