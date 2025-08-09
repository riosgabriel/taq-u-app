import { Schema } from "effect/index"
import Customer from "order/domain/customer"

export class CustomerCreateInput extends Schema.Class<CustomerCreateInput>("CustomerCreateInput")({
  name: Schema.NonEmptyString,
  email: Schema.NonEmptyString,
  phone: Schema.String,
  address: Schema.NonEmptyString,
}) {}

export class CustomerResponse extends Schema.Class<CustomerResponse>("CustomerResponse")({
  id: Schema.NonEmptyString,
  name: Schema.NonEmptyString,
  email: Schema.NonEmptyString,
  phone: Schema.String,
  address: Schema.NonEmptyString,
}) {
  static fromCustomer(customer: Customer): CustomerResponse {
    return {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone || "",
      address: customer.address,
    }
  }
}
