const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api"

import type { CustomerAddressResponse, CustomerResponse } from "../types/customer"
import type { AuthResponse, LoginInput, RegisterInput } from "../types/auth"
import type { Driver, DriverCreateInput, DriverUpdateInput } from "../types/driver"
import type { EstimateResponse } from "../types/estimate"
import type { OrderCreateInput, OrderResponse, OrderUpdateInput } from "../types/order"

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

let tokenGetter: (() => string | null) | null = null
let unauthorizedHandler: (() => void) | null = null

export function setAuthTokenGetter(getter: () => string | null) {
  tokenGetter = getter
}

export function setUnauthorizedHandler(handler: () => void) {
  unauthorizedHandler = handler
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const token = tokenGetter?.()

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
    })

    if (!response.ok) {
      if (response.status === 401) {
        unauthorizedHandler?.()
      }
      const errorData = await response.json().catch(() => ({}))
      throw new ApiError(response.status, errorData.error || errorData.message || `API Error: ${response.statusText}`)
    }

    return response.json()
  }

  // Auth
  async register(data: RegisterInput): Promise<AuthResponse> {
    return this.request("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async login(data: LoginInput): Promise<AuthResponse> {
    return this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async getMe(): Promise<CustomerResponse> {
    return this.request("/auth/me")
  }

  // Orders
  async getOrders(): Promise<OrderResponse[]> {
    return this.request("/orders")
  }

  async getMyOrders(): Promise<OrderResponse[]> {
    return this.request("/orders/mine")
  }

  async getOrder(id: string): Promise<OrderResponse> {
    return this.request(`/orders/${id}`)
  }

  /**
   * Create an order. When `idempotencyKey` is provided, the backend
   * caches the response so retries with the same key return the
   * cached result instead of creating a duplicate.
   */
  async createOrder(data: OrderCreateInput, idempotencyKey?: string): Promise<OrderResponse> {
    return this.request("/orders", {
      method: "POST",
      headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {},
      body: JSON.stringify(data),
    })
  }

  async updateOrder(id: string, data: OrderUpdateInput): Promise<OrderResponse> {
    return this.request(`/orders/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  async assignOrderToDriver(orderId: string, driverId: string): Promise<OrderResponse> {
    return this.request(`/orders/${orderId}/assign`, {
      method: "POST",
      body: JSON.stringify({ driverId }),
    })
  }

  async cancelOrder(id: string): Promise<OrderResponse> {
    return this.request(`/orders/${id}`, {
      method: "DELETE",
    })
  }

  // Customers
  async getCustomers(): Promise<CustomerResponse[]> {
    return this.request("/customers")
  }

  async getCustomer(id: string): Promise<CustomerResponse> {
    return this.request(`/customers/${id}`)
  }

  // Customer addresses
  async getMyAddresses(): Promise<CustomerAddressResponse[]> {
    return this.request("/customers/me/addresses")
  }

  async createAddress(data: { label: string; address: string; isDefault?: boolean }): Promise<CustomerAddressResponse> {
    return this.request("/customers/me/addresses", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async updateAddress(
    id: string,
    data: { label?: string; address?: string; isDefault?: boolean }
  ): Promise<CustomerAddressResponse> {
    return this.request(`/customers/me/addresses/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  async deleteAddress(id: string): Promise<void> {
    return this.request(`/customers/me/addresses/${id}`, {
      method: "DELETE",
    })
  }

  // Drivers
  async getDrivers(): Promise<Driver[]> {
    return this.request("/drivers")
  }

  async getDriver(id: string): Promise<Driver> {
    return this.request(`/drivers/${id}`)
  }

  async createDriver(data: DriverCreateInput): Promise<Driver> {
    return this.request("/drivers", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async updateDriver(id: string, data: DriverUpdateInput): Promise<Driver> {
    return this.request(`/drivers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    })
  }

  async deleteDriver(id: string): Promise<Driver> {
    return this.request(`/drivers/${id}`, {
      method: "DELETE",
    })
  }

  // Estimates
  async createEstimate(data: {
    weightKg: number
    serviceLevel: "STANDARD" | "EXPRESS" | "OVERNIGHT"
    insured: boolean
    orderId?: string
  }): Promise<EstimateResponse> {
    return this.request("/estimates", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  // Deliveries (routes)
  async getDeliveries() {
    return this.request("/deliveries")
  }

  async assignDriverToDelivery(deliveryId: string, driverId: string) {
    return this.request(`/deliveries/${deliveryId}/assign`, {
      method: "PATCH",
      body: JSON.stringify({ driverId }),
    })
  }

  // Packages (tracking)
  async getPackageByTrackingNumber(trackingNumber: string) {
    return this.request(`/packages/track/${encodeURIComponent(trackingNumber)}`)
  }
}

export const api = new ApiClient(API_BASE_URL)
