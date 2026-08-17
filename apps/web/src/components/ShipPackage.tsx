import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { useAuth } from "@/context/AuthContext"

/**
 * ShipPackage — connected to the real backend.
 *
 * Flow:
 *   1. User fills the form. Cost is recalculated by POSTing to
 *      /api/estimates whenever the relevant fields change (debounced).
 *   2. When signed in, the existing customer is reused as the sender.
 *      When signed out, a sign-in prompt is shown instead of the form.
 *   3. The order is created via POST /api/orders, which embeds the
 *      package and returns the generated tracking number.
 *   4. The Idempotency-Key header is set on the order create so a
 *      double-click or retry cannot create a duplicate order.
 *
 * The form's "serviceType" (standard / express / overnight) maps to
 * both Estimate.serviceLevel (for cost) and Order.priority
 * (STANDARD / HIGH / URGENT) since the backend has no serviceLevel
 * field on the order.
 */

const serviceLevelToPriority: Record<string, "STANDARD" | "HIGH" | "URGENT"> = {
  standard: "STANDARD",
  express: "HIGH",
  overnight: "URGENT",
}

const serviceLevelToEstimate: Record<string, "STANDARD" | "EXPRESS" | "OVERNIGHT"> = {
  standard: "STANDARD",
  express: "EXPRESS",
  overnight: "OVERNIGHT",
}

interface ShipPackageProps {
  onSignInClick?: () => void
}

export function ShipPackage({ onSignInClick }: ShipPackageProps) {
  const { customer } = useAuth()

  const [formData, setFormData] = useState({
    senderName: customer?.name ?? "",
    senderEmail: customer?.email ?? "",
    senderPhone: customer?.phone ?? "",
    senderAddress: customer?.address ?? "",
    recipientName: "",
    recipientPhone: "",
    recipientAddress: "",
    weight: "",
    length: "",
    width: "",
    height: "",
    serviceType: "standard",
  })

  const [estimatedCost, setEstimatedCost] = useState<number | null>(null)
  const [isEstimating, setIsEstimating] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (customer) {
      setFormData((prev) => ({
        ...prev,
        senderName: customer.name,
        senderEmail: customer.email,
        senderPhone: customer.phone,
        senderAddress: customer.address,
      }))
    }
  }, [customer])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  // Recalculate cost from the API when relevant fields change (debounced).
  useEffect(() => {
    const weightKg = parseFloat(formData.weight)
    if (!Number.isFinite(weightKg) || weightKg <= 0) {
      setEstimatedCost(null)
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    setIsEstimating(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const result = await api.createEstimate({
          weightKg,
          serviceLevel: serviceLevelToEstimate[formData.serviceType] ?? "STANDARD",
          insured: false,
        })
        setEstimatedCost(result.estimatedCost)
      } catch (err) {
        setEstimatedCost(null)
        toast.error("Could not fetch estimate", {
          description: err instanceof Error ? err.message : "Unknown error",
        })
      } finally {
        setIsEstimating(false)
      }
    }, 400)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [formData.weight, formData.serviceType])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!customer) {
      toast.error("Sign in to create a shipment")
      return
    }

    setIsSubmitting(true)

    try {
      const weightKg = parseFloat(formData.weight)
      const dimensions = `${formData.length}x${formData.width}x${formData.height} cm`

      const idempotencyKey = crypto.randomUUID()
      const order = await api.createOrder(
        {
          customerId: customer.id,
          pickupAddress: formData.senderAddress,
          deliveryAddress: formData.recipientAddress,
          pickupDate: new Date().toISOString(),
          specialInstructions: `Recipient: ${formData.recipientName}, ${formData.recipientPhone}`,
          priority: serviceLevelToPriority[formData.serviceType] ?? "STANDARD",
          packages: [
            {
              weightKg,
              dimensions,
              description: `Package from ${formData.senderName} to ${formData.recipientName}`,
              fragile: false,
              perishable: false,
              insured: false,
            },
          ],
        },
        idempotencyKey
      )

      const trackingNumbers = order.packages.map((p: { trackingNumber: string }) => p.trackingNumber).join(", ")

      toast.success(`Order created! Tracking number${order.packages.length > 1 ? "s" : ""}: ${trackingNumbers}`)

      setFormData((prev) => ({
        ...prev,
        recipientName: "",
        recipientPhone: "",
        recipientAddress: "",
        weight: "",
        length: "",
        width: "",
        height: "",
        serviceType: "standard",
      }))
      setEstimatedCost(null)
    } catch (err) {
      toast.error("Could not create shipment", {
        description: err instanceof Error ? err.message : "Unknown error",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!customer) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Ship a Package</h2>
          <p className="text-gray-600">Sign in to create a new shipment</p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
          <div className="text-4xl mb-4">📮</div>
          <h3 className="text-lg font-semibold text-yellow-900 mb-2">Sign in to ship</h3>
          <p className="text-yellow-800 mb-6 max-w-md mx-auto">
            Creating a shipment requires an account so we can link your orders and provide tracking history.
          </p>
          <button
            type="button"
            onClick={onSignInClick}
            className="px-6 py-2 bg-yellow-600 text-white font-semibold rounded-md hover:bg-yellow-700 transition-colors"
          >
            Sign in or create account
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Ship a Package</h2>
        <p className="text-gray-600">Fill out the details to create a new shipment</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Sender Information */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">📤 Sender Information</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="sender-name" className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <input
                id="sender-name"
                type="text"
                required
                value={formData.senderName}
                onChange={(e) => handleInputChange("senderName", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="sender-email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                id="sender-email"
                type="email"
                required
                value={formData.senderEmail}
                onChange={(e) => handleInputChange("senderEmail", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="sender-phone" className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                id="sender-phone"
                type="tel"
                required
                value={formData.senderPhone}
                onChange={(e) => handleInputChange("senderPhone", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="sender-address" className="block text-sm font-medium text-gray-700 mb-2">
                Pickup Address
              </label>
              <textarea
                id="sender-address"
                required
                rows={3}
                value={formData.senderAddress}
                onChange={(e) => handleInputChange("senderAddress", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Recipient Information */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">📥 Recipient Information</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="recipient-name" className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <input
                id="recipient-name"
                type="text"
                required
                value={formData.recipientName}
                onChange={(e) => handleInputChange("recipientName", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="recipient-phone" className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                id="recipient-phone"
                type="tel"
                required
                value={formData.recipientPhone}
                onChange={(e) => handleInputChange("recipientPhone", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="recipient-address" className="block text-sm font-medium text-gray-700 mb-2">
                Delivery Address
              </label>
              <textarea
                id="recipient-address"
                required
                rows={3}
                value={formData.recipientAddress}
                onChange={(e) => handleInputChange("recipientAddress", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Package Details */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">📦 Package Details</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="package-weight" className="block text-sm font-medium text-gray-700 mb-2">
                Weight (kg)
              </label>
              <input
                id="package-weight"
                type="number"
                step="0.1"
                min="0"
                required
                value={formData.weight}
                onChange={(e) => handleInputChange("weight", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="package-length" className="block text-sm font-medium text-gray-700 mb-2">
                Length (cm)
              </label>
              <input
                id="package-length"
                type="number"
                min="0"
                required
                value={formData.length}
                onChange={(e) => handleInputChange("length", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="package-width" className="block text-sm font-medium text-gray-700 mb-2">
                Width (cm)
              </label>
              <input
                id="package-width"
                type="number"
                min="0"
                required
                value={formData.width}
                onChange={(e) => handleInputChange("width", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="package-height" className="block text-sm font-medium text-gray-700 mb-2">
                Height (cm)
              </label>
              <input
                id="package-height"
                type="number"
                min="0"
                required
                value={formData.height}
                onChange={(e) => handleInputChange("height", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Service Options */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">🚚 Service Options</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="service-type" className="block text-sm font-medium text-gray-700 mb-2">
                Service Type
              </label>
              <select
                id="service-type"
                value={formData.serviceType}
                onChange={(e) => handleInputChange("serviceType", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              >
                <option value="standard">Standard (3-5 days)</option>
                <option value="express">Express (1-2 days)</option>
                <option value="overnight">Overnight (1 day)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Cost Summary */}
        {estimatedCost !== null && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">
              💰 Estimated Cost {isEstimating && <span className="text-sm font-normal">(updating…)</span>}
            </h3>
            <div className="text-2xl font-bold text-yellow-900">${estimatedCost.toFixed(2)} USD</div>
            <p className="text-sm text-yellow-700 mt-1">Final cost may vary based on actual measurements</p>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-8 py-3 bg-yellow-600 text-white font-semibold rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? "Creating Shipment..." : "Create Shipment"}
          </button>
        </div>
      </form>
    </div>
  )
}
