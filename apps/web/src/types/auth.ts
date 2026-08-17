import type { CustomerResponse } from "./customer"

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
  customer: CustomerResponse
}
