import { Schema } from "effect"
import { Email } from "@/middleware/validate"
import Customer from "customer/domain/customer"

export class CustomerCreateInput extends Schema.Class<CustomerCreateInput>("CustomerCreateInput")({
  name: Schema.NonEmptyString.annotations({
    required: true,
    identifier: "name",
  }),
  email: Email.annotations({
    required: true,
    identifier: "email",
  }),
  phone: Schema.String.annotations({
    required: true,
    identifier: "phone",
  }),
  address: Schema.NonEmptyString.annotations({
    required: true,
    identifier: "address",
  }),
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
