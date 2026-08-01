import { useState } from "react"
import { toast } from "sonner"
import { api } from "@/lib/api"

/**
 * PackageTracker — connected to the real backend.
 *
 * Flow:
 *   1. User enters a tracking number and clicks Track.
 *   2. We call GET /api/packages/track/:trackingNumber.
 *   3. The backend returns the package's status, the customer (sender)
 *      name, the order's pickup/delivery addresses and dates.
 *   4. The tracking timeline (updates[]) is currently empty — a
 *      proper history requires a PackageUpdate model that the
 *      backend does not have yet. We render the empty state.
 *
 * Status mapping from the backend's PackageStatus enum
 * (AWAITING_PICKUP | IN_TRANSIT | OUT_FOR_DELIVERY | DELIVERED | LOST)
 * to the UI's status buckets.
 */

type TrackedPackage = {
  trackingNumber: string
  status: string
  senderName: string
  recipientAddress: string
  pickupAddress: string
  pickupDate: string
  estimatedDelivery: string
  updates: Array<{ status: string; location?: string; timestamp?: string; notes?: string }>
}

const statusBucket = (status: string): "delivered" | "out_for_delivery" | "in_transit" | "pending" => {
  switch (status) {
    case "DELIVERED":
      return "delivered"
    case "OUT_FOR_DELIVERY":
      return "out_for_delivery"
    case "IN_TRANSIT":
    case "LOST":
      return "in_transit"
    case "AWAITING_PICKUP":
    default:
      return "pending"
  }
}

const getStatusColor = (status: string) => {
  const bucket = statusBucket(status)
  switch (bucket) {
    case "delivered":
      return "text-green-600 bg-green-50"
    case "out_for_delivery":
      return "text-blue-600 bg-blue-50"
    case "in_transit":
      return "text-yellow-600 bg-yellow-50"
    default:
      return "text-gray-600 bg-gray-50"
  }
}

const getStatusIcon = (status: string) => {
  const bucket = statusBucket(status)
  switch (bucket) {
    case "delivered":
      return "✅"
    case "out_for_delivery":
      return "🚛"
    case "in_transit":
      return "📦"
    default:
      return "⏳"
  }
}

export function PackageTracker() {
  const [trackingNumber, setTrackingNumber] = useState("")
  const [searchResult, setSearchResult] = useState<TrackedPackage | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = async () => {
    setIsSearching(true)
    setHasSearched(false)
    try {
      const result = await api.getPackageByTrackingNumber(trackingNumber)
      setSearchResult(result as TrackedPackage)
    } catch (err) {
      setSearchResult(null)
      toast.error("Package not found", {
        description: err instanceof Error ? err.message : "Unknown error",
      })
    } finally {
      setIsSearching(false)
      setHasSearched(true)
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Track Your Package</h2>
        <p className="text-gray-600">Enter your tracking number to see the latest status</p>
      </div>

      {/* Search Form */}
      <div className="mb-8">
        <div className="flex gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Enter tracking number"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            />
          </div>
          <button
            type="button"
            onClick={handleSearch}
            disabled={!trackingNumber || isSearching}
            className="px-6 py-3 bg-yellow-600 text-white font-semibold rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSearching ? "Searching..." : "Track"}
          </button>
        </div>
      </div>

      {/* Search Results */}
      {searchResult && (
        <div className="space-y-6">
          {/* Package Info */}
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Package Details</h3>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(searchResult.status)}`}>
                {getStatusIcon(searchResult.status)} {searchResult.status.replace(/_/g, " ")}
              </span>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Tracking Number</p>
                <p className="font-mono font-semibold">{searchResult.trackingNumber}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className="font-semibold">{searchResult.status}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">From</p>
                <p className="font-semibold">{searchResult.senderName}</p>
                <p className="text-sm text-gray-500">{searchResult.pickupAddress}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">To</p>
                <p className="text-sm text-gray-500">{searchResult.recipientAddress}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Pickup Date</p>
                <p className="font-semibold">{new Date(searchResult.pickupDate).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Tracking Timeline */}
          <div>
            <h3 className="text-xl font-semibold mb-4">Tracking History</h3>
            {searchResult.updates.length === 0 ? (
              <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-500">
                No tracking updates yet. The package status is{" "}
                <span className="font-mono">{searchResult.status}</span>.
              </div>
            ) : (
              <div className="space-y-4">
                {searchResult.updates.map((update) => (
                  <div key={`${update.status}-${update.timestamp ?? ""}`} className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                      <span className="text-yellow-600 font-semibold">•</span>
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold text-gray-900">{update.status}</h4>
                        {update.timestamp && (
                          <span className="text-sm text-gray-500">
                            {new Date(update.timestamp).toLocaleString()}
                          </span>
                        )}
                      </div>
                      {update.location && <p className="text-gray-600 mb-1">{update.location}</p>}
                      {update.notes && <p className="text-sm text-gray-500">{update.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {searchResult === null && hasSearched && !isSearching && (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">❌</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Package Not Found</h3>
          <p className="text-gray-600">Please check your tracking number and try again.</p>
        </div>
      )}
    </div>
  )
}
