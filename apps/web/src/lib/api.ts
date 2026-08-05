const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api"

import type { CustomerCreateInput, CustomerResponse } from "../types/customer"
import type { Driver, DriverCreateInput, DriverUpdateInput } from "../types/driver"
import type { EstimateResponse } from "../types/estimate"
import type { OrderCreateInput, OrderResponse, OrderUpdateInput } from "../types/order"

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || errorData.message || `API Error: ${response.statusText}`)
    }

    return response.json()
  }

  // Orders
  async getOrders(): Promise<OrderResponse[]> {
    return this.request("/orders")
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

  async createCustomer(data: CustomerCreateInput): Promise<CustomerResponse> {
    return this.request("/customers", {
      method: "POST",
      body: JSON.stringify(data),
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

  // Packages (tracking)
  async getPackageByTrackingNumber(trackingNumber: string) {
    return this.request(`/packages/track/${encodeURIComponent(trackingNumber)}`)
  }
}

export const api = new ApiClient(API_BASE_URL)
