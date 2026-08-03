import { Customer as PrismaCustomer } from "@prisma/client"
import { Schema } from "effect"
import { CustomerId } from "@/ids"

class Customer extends Schema.Class<Customer>("Customer")({
  id: CustomerId,
  name: Schema.NonEmptyString,
  email: Schema.NonEmptyString,
  phone: Schema.NullishOr(Schema.String),
  address: Schema.NonEmptyString,
}) {
  static fromPrisma(customer: PrismaCustomer): Customer {
    return {
      id: Schema.decodeSync(CustomerId)(customer.id),
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
    }
  }
}

export default Customer
