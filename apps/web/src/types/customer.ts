export interface CustomerResponse {
  id: string
  name: string
  email: string
  phone: string
  address: string
}

export interface CustomerCreateInput {
  name: string
  email: string
  phone: string
  address: string
}
