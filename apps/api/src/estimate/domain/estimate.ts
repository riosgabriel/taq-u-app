import { Estimate as PrismaEstimate } from "@prisma/client"
import { Schema } from "effect"

/**
 * The three service levels a customer can pick when getting a quote.
 * Each level has a price multiplier and a delivery time (in business
 * days, here modeled as calendar days for simplicity). The
 * `Schema.Literal` union matches the team's TAQ-23 boundary-validation
 * hardening: invalid values are rejected at the DTO layer.
 */
export const SERVICE_LEVELS = ["STANDARD", "EXPRESS", "OVERNIGHT"] as const
export type ServiceLevel = (typeof SERVICE_LEVELS)[number]

const SERVICE_MULTIPLIERS: Record<ServiceLevel, number> = {
  STANDARD: 1.0,
  EXPRESS: 1.5,
  OVERNIGHT: 2.5,
}

const DELIVERY_DAYS: Record<ServiceLevel, number> = {
  STANDARD: 5,
  EXPRESS: 2,
  OVERNIGHT: 1,
}

const BASE_FEE = 5.0
const BASE_RATE_PER_KG = 2.0
const INSURANCE_RATE = 0.01
const DEFAULT_CURRENCY = "USD"

export interface CalculateEstimateParams {
  readonly weightKg: number
  readonly serviceLevel: ServiceLevel
  readonly insured: boolean
}

export interface CalculatedEstimate {
  readonly estimatedCost: number
  readonly currency: string
  readonly estimatedDeliveryTime: Date
}

/**
 * Pure cost-estimation function. Deterministic: takes `now` as a
 * parameter so tests can pin the clock (per TESTING.md Rule 1).
 *
 * Formula:
 *   subtotal  = (BASE_FEE + weightKg * BASE_RATE_PER_KG) * serviceMultiplier
 *   surcharge = subtotal * INSURANCE_RATE  (only when insured)
 *   total     = round((subtotal + surcharge) * 100) / 100   (cents precision)
 *
 * Delivery time is a calendar-day offset from `now`, not a business-day
 * computation. The order-side flow already accounts for pickup scheduling
 * separately; the estimate gives the customer a realistic ballpark.
 */
export const calculateEstimate = (params: CalculateEstimateParams, now: Date): CalculatedEstimate => {
  const baseCost = BASE_FEE + params.weightKg * BASE_RATE_PER_KG
  const multiplier = SERVICE_MULTIPLIERS[params.serviceLevel]
  const subtotal = baseCost * multiplier
  const insuranceSurcharge = params.insured ? subtotal * INSURANCE_RATE : 0
  const totalCost = Math.round((subtotal + insuranceSurcharge) * 100) / 100

  const daysFromNow = DELIVERY_DAYS[params.serviceLevel]
  const estimatedDeliveryTime = new Date(now)
  estimatedDeliveryTime.setDate(estimatedDeliveryTime.getDate() + daysFromNow)

  return {
    estimatedCost: totalCost,
    currency: DEFAULT_CURRENCY,
    estimatedDeliveryTime,
  }
}

export class Estimate extends Schema.Class<Estimate>("estimate/Estimate")({
  id: Schema.NonEmptyString.annotations({
    required: true,
    identifier: "id",
  }),
  estimatedCost: Schema.Number.annotations({
    required: true,
    identifier: "estimatedCost",
  }),
  currency: Schema.NonEmptyString.annotations({
    required: true,
    identifier: "currency",
  }),
  estimatedDeliveryTime: Schema.Date.annotations({
    required: true,
    identifier: "estimatedDeliveryTime",
  }),
  orderId: Schema.NullishOr(Schema.String).annotations({
    identifier: "orderId",
  }),
}) {
  static fromPrisma(estimate: PrismaEstimate): Estimate {
    return {
      id: estimate.id,
      estimatedCost: estimate.estimatedCost,
      currency: estimate.currency,
      estimatedDeliveryTime: estimate.estimatedDeliveryTime,
      orderId: estimate.orderId,
    }
  }
}

export default Estimate
