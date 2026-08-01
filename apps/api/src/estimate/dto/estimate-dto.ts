import { Schema } from "effect"
import { CalculateEstimateParams, Estimate, SERVICE_LEVELS } from "estimate/domain/estimate"

export class CalculateEstimateInput extends Schema.Class<CalculateEstimateInput>("estimate/CalculateEstimateInput")({
  weightKg: Schema.Number.pipe(Schema.between(0.01, 1000)).annotations({
    required: true,
    identifier: "weightKg",
  }),
  serviceLevel: Schema.Literal(...SERVICE_LEVELS).annotations({
    required: true,
    identifier: "serviceLevel",
  }),
  insured: Schema.Boolean.annotations({
    required: true,
    identifier: "insured",
  }),
  distanceKm: Schema.optional(
    Schema.Number.pipe(Schema.between(0, 50_000))
  ),
  orderId: Schema.optional(Schema.NonEmptyString),
}) {}

export class EstimateResponse extends Schema.Class<EstimateResponse>("estimate/EstimateResponse")({
  id: Schema.NullishOr(Schema.NonEmptyString),
  estimatedCost: Schema.Number,
  currency: Schema.NonEmptyString,
  estimatedDeliveryTime: Schema.Date,
  orderId: Schema.NullishOr(Schema.NonEmptyString),
}) {
  static fromEstimate(estimate: Estimate): EstimateResponse {
    return {
      id: estimate.id,
      estimatedCost: estimate.estimatedCost,
      currency: estimate.currency,
      estimatedDeliveryTime: estimate.estimatedDeliveryTime,
      orderId: estimate.orderId ?? null,
    }
  }

  /**
   * Map a pure calculation result (no persisted ID) to the response
   * shape. Used when the caller only wanted a quote and did not
   * supply an orderId to persist against.
   */
  static fromCalculation(
    calculation: { estimatedCost: number; currency: string; estimatedDeliveryTime: Date },
    orderId: string | null
  ): EstimateResponse {
    return {
      id: null,
      estimatedCost: calculation.estimatedCost,
      currency: calculation.currency,
      estimatedDeliveryTime: calculation.estimatedDeliveryTime,
      orderId,
    }
  }
}

export type CalculateEstimateInputShape = CalculateEstimateParams
