import { Schema } from "effect"

export const OrderId = Schema.NonEmptyString.pipe(Schema.brand("OrderId"))
export type OrderId = Schema.Schema.Type<typeof OrderId>

export const CustomerId = Schema.NonEmptyString.pipe(Schema.brand("CustomerId"))
export type CustomerId = Schema.Schema.Type<typeof CustomerId>

export const DriverId = Schema.NonEmptyString.pipe(Schema.brand("DriverId"))
export type DriverId = Schema.Schema.Type<typeof DriverId>

export const PackageId = Schema.NonEmptyString.pipe(Schema.brand("PackageId"))
export type PackageId = Schema.Schema.Type<typeof PackageId>

export const DeliveryId = Schema.NonEmptyString.pipe(Schema.brand("DeliveryId"))
export type DeliveryId = Schema.Schema.Type<typeof DeliveryId>

export const RouteId = Schema.NonEmptyString.pipe(Schema.brand("RouteId"))
export type RouteId = Schema.Schema.Type<typeof RouteId>

export const RouteLegId = Schema.NonEmptyString.pipe(Schema.brand("RouteLegId"))
export type RouteLegId = Schema.Schema.Type<typeof RouteLegId>

export const LocationId = Schema.NonEmptyString.pipe(Schema.brand("LocationId"))
export type LocationId = Schema.Schema.Type<typeof LocationId>

export const PaymentId = Schema.NonEmptyString.pipe(Schema.brand("PaymentId"))
export type PaymentId = Schema.Schema.Type<typeof PaymentId>

export const EstimateId = Schema.NonEmptyString.pipe(Schema.brand("EstimateId"))
export type EstimateId = Schema.Schema.Type<typeof EstimateId>

export const CarrierId = Schema.NonEmptyString.pipe(Schema.brand("CarrierId"))
export type CarrierId = Schema.Schema.Type<typeof CarrierId>
