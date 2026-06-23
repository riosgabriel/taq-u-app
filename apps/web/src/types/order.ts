export interface PackageResponse {
  id: string;
  weightKg: number;
  dimensions: string;
  description: string;
  fragile: boolean;
  perishable: boolean;
  insured: boolean;
}

export interface OrderResponse {
  id: string;
  pickupAddress: string;
  deliveryAddress: string;
  pickupDate: string;
  deliveryDate?: string;
  specialInstructions?: string;
  priority: string;
  status: string;
  packages: PackageResponse[];
}

export interface OrderUpdateInput {
  pickupAddress?: string;
  deliveryAddress?: string;
  pickupDate?: string;
  deliveryDate?: string;
  specialInstructions?: string;
  priority?: string;
}
