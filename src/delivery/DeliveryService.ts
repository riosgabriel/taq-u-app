import { Customer, DeliveryOrder, Package, Payment } from "@prisma/client"

class DeliveryService {
  constructor() {}

  async createDelivery(
    customer: Customer,
    packages: Package[],
    payment: Payment,
    pickupLocation: string,
    dropoffLocation: string
  ): Promise<DeliveryOrder> {
    return Promise.resolve({} as DeliveryOrder)
  }
}

export default DeliveryService
