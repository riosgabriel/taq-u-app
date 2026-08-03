import { useEffect, useMemo, useState } from "react"
import { api } from "@/lib/api"

/**
 * PackageList — connected to the real backend.
 *
 * The backend's "package" aggregate lives inside an order. The
 * "list packages" use case maps to "list orders, flatten their
 * packages, show as a flat list." We do that here.
 *
 * Cost and paymentStatus are not on the order model. Showing "—" for
 * both is honest about the current data model; a follow-up could add
 * either a `cost` field on the order, or a join with /api/payments
 * and /api/estimates to populate them.
 *
 * The backend's PackageStatus enum:
 *   AWAITING_PICKUP | IN_TRANSIT | OUT_FOR_DELIVERY | DELIVERED | LOST
 * maps to the UI's status buckets via statusBucket.
 */

type RawOrder = {
  id: string
  status: string
  priority: string
  pickupAddress: string
  deliveryAddress: string
  pickupDate: string
  deliveryDate?: string | null
  packages: RawPackage[]
}

type RawPackage = {
  id: string
  trackingNumber: string
  status: string
  weightKg: number
  dimensions: string
  description: string
}

type PackageListItem = {
  id: string
  trackingNumber: string
  status: string
  recipientAddress: string
  pickupAddress: string
  createdAt: string
  estimatedDelivery: string
  cost: string
  paymentStatus: string
}

const statusBucket = (status: string): "pending" | "in_transit" | "out_for_delivery" | "delivered" => {
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
      return "text-green-600 bg-green-50 border-green-200"
    case "out_for_delivery":
      return "text-blue-600 bg-blue-50 border-blue-200"
    case "in_transit":
      return "text-yellow-600 bg-yellow-50 border-yellow-200"
    default:
      return "text-gray-600 bg-gray-50 border-gray-200"
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

const flattenOrders = (orders: RawOrder[]): PackageListItem[] => {
  const items: PackageListItem[] = []
  for (const order of orders) {
    for (const pkg of order.packages) {
      items.push({
        id: pkg.id,
        trackingNumber: pkg.trackingNumber,
        status: pkg.status,
        recipientAddress: order.deliveryAddress,
        pickupAddress: order.pickupAddress,
        createdAt: order.pickupDate,
        estimatedDelivery: order.deliveryDate ?? order.pickupDate,
        cost: "—",
        paymentStatus: "—",
      })
    }
  }
  return items
}

export function PackageList() {
  const [filter, setFilter] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [items, setItems] = useState<PackageListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)
    api
      .getOrders()
      .then((orders) => {
        if (cancelled) return
        setItems(flattenOrders(orders as RawOrder[]))
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "Unknown error")
      })
      .finally(() => {
        if (cancelled) return
        setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const filteredPackages = useMemo(() => {
    return items.filter((pkg) => {
      const bucket = statusBucket(pkg.status)
      const matchesFilter = filter === "all" || bucket === filter
      const matchesSearch =
        searchTerm === "" ||
        pkg.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pkg.recipientAddress.toLowerCase().includes(searchTerm.toLowerCase())
      return matchesFilter && matchesSearch
    })
  }, [items, filter, searchTerm])

  const statusCounts = useMemo(() => {
    const counts = { all: items.length, pending: 0, in_transit: 0, out_for_delivery: 0, delivered: 0 }
    for (const pkg of items) {
      counts[statusBucket(pkg.status)]++
    }
    return counts
  }, [items])

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">My Packages</h2>
        <p className="text-gray-600">Track and manage all your shipments</p>
      </div>

      {/* Filters and Search */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-wrap gap-2">
          {[
            { key: "all", label: "All", count: statusCounts.all },
            { key: "pending", label: "Pending", count: statusCounts.pending },
            { key: "in_transit", label: "In Transit", count: statusCounts.in_transit },
            { key: "out_for_delivery", label: "Out for Delivery", count: statusCounts.out_for_delivery },
            { key: "delivered", label: "Delivered", count: statusCounts.delivered },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === tab.key
                  ? "bg-yellow-100 text-yellow-800 border border-yellow-200"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        <div className="max-w-md">
          <input
            type="text"
            placeholder="Search by tracking number or address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Package List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading packages…</p>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">❌</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Could not load packages</h3>
          <p className="text-gray-600">{error}</p>
        </div>
      ) : filteredPackages.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📦</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No packages found</h3>
          <p className="text-gray-600">
            {searchTerm ? "Try adjusting your search terms" : "You haven't shipped any packages yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPackages.map((pkg) => (
            <div
              key={pkg.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-mono font-semibold text-lg">{pkg.trackingNumber}</h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(pkg.status)}`}>
                      {getStatusIcon(pkg.status)} {pkg.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">From</p>
                      <p className="text-gray-500">{pkg.pickupAddress}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">To</p>
                      <p className="text-gray-500">{pkg.recipientAddress}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Pickup Date</p>
                      <p className="font-semibold">{new Date(pkg.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Estimated Delivery</p>
                      <p className="font-semibold">
                        {statusBucket(pkg.status) === "delivered"
                          ? `Delivered ${new Date(pkg.estimatedDelivery).toLocaleDateString()}`
                          : new Date(pkg.estimatedDelivery).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900 mb-1">{pkg.cost}</div>
                  <span className="px-2 py-1 rounded text-xs font-medium text-gray-600 bg-gray-50">
                    {pkg.paymentStatus}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors text-sm font-medium"
                >
                  Track Package
                </button>
                <button
                  type="button"
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      <div className="mt-8 grid md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">{statusCounts.all}</div>
          <div className="text-sm text-blue-700">Total Packages</div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-600">
            {statusCounts.in_transit + statusCounts.out_for_delivery}
          </div>
          <div className="text-sm text-yellow-700">In Transit</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">{statusCounts.delivered}</div>
          <div className="text-sm text-green-700">Delivered</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-600">—</div>
          <div className="text-sm text-purple-700">Total Spent</div>
        </div>
      </div>
    </div>
  )
}
