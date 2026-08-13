import { Schema } from "effect"
import { Email } from "@/middleware/validate"
import Customer from "customer/domain/customer"
import { CustomerResponse } from "customer/dto/customer-dto"

const NormalizedEmail = Schema.transform(Email, Email, {
  decode: (email) => email.toLowerCase(),
  encode: (email) => email,
})

export class RegisterInput extends Schema.Class<RegisterInput>("auth/RegisterInput")({
  name: Schema.NonEmptyString.annotations({
    required: true,
    identifier: "name",
  }),
  email: NormalizedEmail.annotations({
    required: true,
    identifier: "email",
  }),
  password: Schema.String.pipe(Schema.minLength(8, { message: () => "must be at least 8 characters" })).annotations({
    required: true,
    identifier: "password",
  }),
  phone: Schema.optional(Schema.String).annotations({
    required: false,
    identifier: "phone",
  }),
}) {}

export class LoginInput extends Schema.Class<LoginInput>("auth/LoginInput")({
  email: NormalizedEmail.annotations({
    required: true,
    identifier: "email",
  }),
  password: Schema.String.annotations({
    required: true,
    identifier: "password",
  }),
}) {}

export class AuthResponse extends Schema.Class<AuthResponse>("auth/AuthResponse")({
  token: Schema.NonEmptyString,
  customer: CustomerResponse,
}) {
  static fromAuthResult(authResult: { token: string; customer: Customer }): AuthResponse {
    return {
      token: authResult.token,
      customer: CustomerResponse.fromCustomer(authResult.customer),
    }
  }
}
