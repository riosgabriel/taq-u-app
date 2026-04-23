export interface Driver {
  id: string
  name: string
  email: string
  phone: string
  licenseNumber: string
  vehicleType: string
  isAvailable: boolean
}

export interface DriverCreateInput {
  name: string
  email: string
  phone: string
  licenseNumber: string
  vehicleType: string
  isAvailable: boolean
}

export interface DriverUpdateInput extends Partial<DriverCreateInput> {
  id: string
}
