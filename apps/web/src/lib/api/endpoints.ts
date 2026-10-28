import { http } from "./client"
import type {
  AuthResponse,
  CreateAddressInput,
  Customer,
  CustomerAddress,
  DeliveryRoute,
  Driver,
  DriverInput,
  Estimate,
  EstimateInput,
  LoginInput,
  MyOrderCreateInput,
  Order,
  OrderUpdateInput,
  RegisterInput,
  TrackingResult,
  UpdatableDeliveryStatus,
  UpdateAddressInput,
} from "./types"

export const authApi = {
  login: (input: LoginInput) => http.post<AuthResponse>("/auth/login", input),
  register: (input: RegisterInput) => http.post<AuthResponse>("/auth/register", input),
  me: () => http.get<Customer>("/auth/me"),
}

export const addressApi = {
  list: () => http.get<CustomerAddress[]>("/customers/me/addresses"),
  create: (input: CreateAddressInput) => http.post<CustomerAddress>("/customers/me/addresses", input),
  update: (id: string, input: UpdateAddressInput) => http.put<CustomerAddress>(`/customers/me/addresses/${id}`, input),
  remove: (id: string) => http.delete<{ message: string }>(`/customers/me/addresses/${id}`),
}

export const orderApi = {
  listMine: () => http.get<Order[]>("/orders/mine"),
  createMine: (input: MyOrderCreateInput) => http.post<Order>("/orders/mine", input),
  listAll: () => http.get<Order[]>("/orders"),
  get: (id: string) => http.get<Order>(`/orders/${id}`),
  update: (id: string, input: OrderUpdateInput) => http.patch<Order>(`/orders/${id}`, input),
  cancel: (id: string) => http.delete<Order>(`/orders/${id}`),
  confirm: (id: string) => http.post<Order>(`/orders/${id}/confirm`),
  pickup: (id: string) => http.post<Order>(`/orders/${id}/pickup`),
  deliver: (id: string) => http.post<Order>(`/orders/${id}/deliver`),
  assignDriver: (id: string, driverId: string) => http.post<Order>(`/orders/${id}/assign`, { driverId }),
}

export const trackingApi = {
  track: (trackingNumber: string) => http.get<TrackingResult>(`/packages/track/${encodeURIComponent(trackingNumber)}`),
}

export const estimateApi = {
  calculate: (input: EstimateInput) => http.post<Estimate>("/estimates", input),
}

export const driverApi = {
  list: () => http.get<Driver[]>("/drivers"),
  get: (id: string) => http.get<Driver>(`/drivers/${id}`),
  create: (input: DriverInput) => http.post<Driver>("/drivers", input),
  update: (id: string, input: Partial<DriverInput>) => http.patch<Driver>(`/drivers/${id}`, input),
  remove: (id: string) => http.delete<unknown>(`/drivers/${id}`),
}

export const deliveryApi = {
  list: () => http.get<DeliveryRoute[]>("/deliveries"),
  assignDriver: (id: string, driverId: string) => http.patch<unknown>(`/deliveries/${id}/assign`, { driverId }),
  updateStatus: (id: string, status: UpdatableDeliveryStatus) =>
    http.patch<unknown>(`/deliveries/${id}/status`, { status }),
}
