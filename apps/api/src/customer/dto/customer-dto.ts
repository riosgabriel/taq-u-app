import { Schema } from "effect"
import { CustomerId } from "@/ids"
import Customer from "customer/domain/customer"

export class CustomerResponse extends Schema.Class<CustomerResponse>("CustomerResponse")({
  id: CustomerId,
  name: Schema.NonEmptyString,
  email: Schema.NonEmptyString,
  phone: Schema.String,
  address: Schema.NullishOr(Schema.String),
}) {
  static fromCustomer(customer: Customer): CustomerResponse {
    return {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone || "",
      address: customer.address || "",
    }
  }
}
