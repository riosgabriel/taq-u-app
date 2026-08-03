import { EstimateId, OrderId } from "@/ids"
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
/**
 * Distance cost: dollars per kilometer, applied after the service
 * multiplier. A 0-kg, 0-km package still costs the BASE_FEE; a 1-kg,
 * 0-km package costs BASE_FEE + BASE_RATE_PER_KG; a 1-kg, 100-km
 * package costs BASE_FEE + BASE_RATE_PER_KG + 100 * DISTANCE_RATE_PER_KM.
 *
 * The value is a placeholder tuned for a small regional carrier. A
 * real production tuning would derive this from a distance matrix
 * (e.g. per-lane fuel + driver-time + tolls) rather than a flat
 * per-km rate.
 */
const DISTANCE_RATE_PER_KM = 0.5
/**
 * Average km per day for a regional carrier. Used to convert the
 * distance into an additional day count added to the service-level
 * base days. Rough heuristic; a real operation would vary this by
 * transportMode (TRUCK vs AIRPLANE vs ON_FOOT) and by region.
 */
const AVERAGE_KM_PER_DAY = 500
const INSURANCE_RATE = 0.01
const DEFAULT_CURRENCY = "USD"

export interface CalculateEstimateParams {
  readonly weightKg: number
  readonly serviceLevel: ServiceLevel
  readonly insured: boolean
  /**
   * Distance in kilometers between pickup and delivery. Optional:
   * when omitted the estimate is weight-based only (backwards
   * compatible with callers that pre-date the distance field). The
   * DTO accepts it; the frontend may or may not provide it depending
   * on whether it has coordinates for the addresses.
   */
  readonly distanceKm?: number
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
 *   baseCost = BASE_FEE + weightKg * BASE_RATE_PER_KG + (distanceKm ?? 0) * DISTANCE_RATE_PER_KM
 *   subtotal = baseCost * serviceMultiplier
 *   surcharge = subtotal * INSURANCE_RATE  (only when insured)
 *   total = round((subtotal + surcharge) * 100) / 100
 *
 * Delivery time = baseDays + Math.ceil((distanceKm ?? 0) / AVERAGE_KM_PER_DAY).
 */
export const calculateEstimate = (params: CalculateEstimateParams, now: Date): CalculatedEstimate => {
  const baseCost =
    BASE_FEE + params.weightKg * BASE_RATE_PER_KG + (params.distanceKm ?? 0) * DISTANCE_RATE_PER_KM
  const multiplier = SERVICE_MULTIPLIERS[params.serviceLevel]
  const subtotal = baseCost * multiplier
  const insuranceSurcharge = params.insured ? subtotal * INSURANCE_RATE : 0
  const totalCost = Math.round((subtotal + insuranceSurcharge) * 100) / 100

  const baseDays = DELIVERY_DAYS[params.serviceLevel]
  const distanceDays = Math.ceil((params.distanceKm ?? 0) / AVERAGE_KM_PER_DAY)
  const totalDays = baseDays + distanceDays

  const estimatedDeliveryTime = new Date(now)
  estimatedDeliveryTime.setDate(estimatedDeliveryTime.getDate() + totalDays)

  return {
    estimatedCost: totalCost,
    currency: DEFAULT_CURRENCY,
    estimatedDeliveryTime,
  }
}

export class Estimate extends Schema.Class<Estimate>("estimate/Estimate")({
  id: Schema.NullishOr(EstimateId),
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
  orderId: Schema.NullishOr(OrderId).annotations({
    identifier: "orderId",
  }),
}) {
  static fromPrisma(estimate: PrismaEstimate): Estimate {
    return {
      id: estimate.id ? Schema.decodeSync(EstimateId)(estimate.id) : null,
      estimatedCost: estimate.estimatedCost,
      currency: estimate.currency,
      estimatedDeliveryTime: estimate.estimatedDeliveryTime,
      orderId: estimate.orderId ? Schema.decodeSync(OrderId)(estimate.orderId) : null,
    }
  }
}

export default Estimate
