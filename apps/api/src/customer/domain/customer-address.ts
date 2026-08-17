import { CustomerAddress as PrismaCustomerAddress } from "@prisma/client"
import { Schema } from "effect"
import { CustomerAddressId } from "@/ids"

export class CustomerAddress extends Schema.Class<CustomerAddress>("customer/CustomerAddress")({
  id: CustomerAddressId,
  label: Schema.NonEmptyString,
  address: Schema.NonEmptyString,
  isDefault: Schema.Boolean,
}) {
  static fromPrisma(address: PrismaCustomerAddress): CustomerAddress {
    return {
      id: Schema.decodeSync(CustomerAddressId)(address.id),
      label: address.label,
      address: address.address,
      isDefault: address.isDefault,
    }
  }
}

export default CustomerAddress
