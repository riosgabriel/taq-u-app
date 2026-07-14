const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api"

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
      throw new Error(errorData.message || `API Error: ${response.statusText}`)
    }

    return response.json()
  }

  // Orders
  async getOrders() {
    return this.request("/orders")
  }

  async getOrder(id: string) {
    return this.request(`/orders/${id}`)
  }

  async createOrder(data: any) {
    return this.request("/orders", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async updateOrder(id: string, data: any) {
    return this.request(`/orders/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  async cancelOrder(id: string) {
    return this.request(`/orders/${id}`, {
      method: "DELETE",
    })
  }

  // Customers
  async getCustomers() {
    return this.request("/customers")
  }

  async getCustomer(id: string) {
    return this.request(`/customers/${id}`)
  }

  async createCustomer(data: any) {
    return this.request("/customers", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  // Drivers
  async getDrivers() {
    return this.request("/drivers")
  }

  async getDriver(id: string) {
    return this.request(`/drivers/${id}`)
  }

  async createDriver(data: any) {
    return this.request("/drivers", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async updateDriver(id: string, data: any) {
    return this.request(`/drivers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    })
  }

  async deleteDriver(id: string) {
    return this.request(`/drivers/${id}`, {
      method: "DELETE",
    })
  }
}

export const api = new ApiClient(API_BASE_URL)
