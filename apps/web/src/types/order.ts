export interface PackageResponse {
  id: string
  weightKg: number
  dimensions: string
  description: string
  fragile: boolean
  perishable: boolean
  insured: boolean
  trackingNumber: string
  status: string
}

export interface OrderResponse {
  id: string
  pickupAddress: string
  deliveryAddress: string
  pickupDate: string
  deliveryDate?: string
  specialInstructions?: string
  priority: string
  status: string
  driverId?: string | null
  packages: PackageResponse[]
}

export interface OrderUpdateInput {
  pickupAddress?: string
  deliveryAddress?: string
  pickupDate?: string
  deliveryDate?: string
  specialInstructions?: string
  priority?: string
}

export interface PackageCreateInput {
  weightKg: number
  dimensions: string
  description: string
  fragile: boolean
  perishable: boolean
  insured: boolean
}

export interface OrderCreateInput {
  customerId: string
  pickupAddress: string
  deliveryAddress: string
  pickupDate: string
  deliveryDate?: string
  specialInstructions?: string
  priority: "LOW" | "STANDARD" | "HIGH" | "URGENT"
  packages: PackageCreateInput[]
}
