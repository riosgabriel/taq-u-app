import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import type { Driver } from "@/types/driver"
import type {
  DeliveryRoute,
  DeliveryStatus,
  PackageStatus,
  RouteBucket,
} from "@/types/delivery"

const statusToBucket = (status: DeliveryStatus): RouteBucket => {
  switch (status) {
    case "ASSIGNED":
      return "planned"
    case "PICKUP_IN_PROGRESS":
    case "PICKED_UP":
    case "IN_TRANSIT":
    case "OUT_FOR_DELIVERY":
      return "in_progress"
    case "DELIVERED":
      return "completed"
    case "FAILED":
    case "CANCELLED":
      return "failed"
    default:
      return "planned"
  }
}

const packageStatusToBucket = (
  status: PackageStatus
): "pending" | "in_transit" | "delivered" | "lost" => {
  switch (status) {
    case "DELIVERED":
      return "delivered"
    case "IN_TRANSIT":
    case "OUT_FOR_DELIVERY":
      return "in_transit"
    case "LOST":
      return "lost"
    case "AWAITING_PICKUP":
    default:
      return "pending"
  }
}

const getStatusColor = (bucket: RouteBucket) => {
  switch (bucket) {
    case "completed":
      return "text-green-600 bg-green-50 border-green-200"
    case "in_progress":
      return "text-blue-600 bg-blue-50 border-blue-200"
    case "planned":
      return "text-yellow-600 bg-yellow-50 border-yellow-200"
    case "failed":
      return "text-red-600 bg-red-50 border-red-200"
    default:
      return "text-gray-600 bg-gray-50 border-gray-200"
  }
}

const getStatusIcon = (bucket: RouteBucket) => {
  switch (bucket) {
    case "completed":
      return "✅"
    case "in_progress":
      return "🚛"
    case "planned":
      return "📋"
    case "failed":
      return "❌"
    default:
      return "❓"
  }
}

const getPackageStatusColor = (pkgStatus: PackageStatus) => {
  const bucket = packageStatusToBucket(pkgStatus)
  switch (bucket) {
    case "delivered":
      return "text-green-600 bg-green-50"
    case "in_transit":
      return "text-blue-600 bg-blue-50"
    case "lost":
      return "text-red-600 bg-red-50"
    default:
      return "text-gray-600 bg-gray-50"
  }
}

const getPackageStatusLabel = (pkgStatus: PackageStatus) => {
  const bucket = packageStatusToBucket(pkgStatus)
  switch (bucket) {
    case "delivered":
      return "DELIVERED"
    case "in_transit":
      return "IN TRANSIT"
    case "lost":
      return "LOST"
    default:
      return "PENDING"
  }
}

const titleCase = (s: string) =>
  s
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())

const routeName = (route: DeliveryRoute) =>
  `${route.route.pickup.name} → ${route.route.dropoff.name}`

const getProgress = (route: DeliveryRoute) => {
  const bucket = statusToBucket(route.status)
  if (bucket === "completed") return 100
  if (bucket === "planned" || bucket === "failed") return 0

  const total = route.packages.length
  if (total === 0) return 0
  const delivered = route.packages.filter(
    (p) => p.status === "DELIVERED"
  ).length
  return Math.round((delivered / total) * 100)
}

const ASSIGNABLE_STATUSES: DeliveryStatus[] = ["ASSIGNED", "PICKUP_IN_PROGRESS"]

export function DeliveryRoutes() {
  const [routes, setRoutes] = useState<DeliveryRoute[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>("all")
  const [selectedDriverByRoute, setSelectedDriverByRoute] = useState<
    Record<string, string>
  >({})
  const [assigningRouteId, setAssigningRouteId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [deliveries, driverList] = await Promise.all([
        api.getDeliveries() as Promise<DeliveryRoute[]>,
        api.getDrivers() as Promise<Driver[]>,
      ])
      setRoutes(deliveries)
      setDrivers(driverList)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load deliveries")
      toast.error("Failed to load deliveries")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const filteredRoutes = useMemo(
    () =>
      routes.filter((r) => {
        if (filter === "all") return true
        return statusToBucket(r.status) === filter
      }),
    [routes, filter]
  )

  const stats = useMemo(() => {
    const active = routes.filter(
      (r) => statusToBucket(r.status) === "in_progress"
    ).length
    const deliveredPkgs = routes.reduce(
      (sum, r) =>
        sum + r.packages.filter((p) => p.status === "DELIVERED").length,
      0
    )
    const totalPkgs = routes.reduce((sum, r) => sum + r.packages.length, 0)
    return { total: routes.length, active, deliveredPkgs, totalPkgs }
  }, [routes])

  const handleAssign = async (deliveryId: string) => {
    const driverId = selectedDriverByRoute[deliveryId]
    if (!driverId) {
      toast.error("Select a driver first")
      return
    }
    setAssigningRouteId(deliveryId)
    try {
      await api.assignDriverToDelivery(deliveryId, driverId)
      toast.success("Driver assigned")
      setSelectedDriverByRoute((prev) => {
        const next = { ...prev }
        delete next[deliveryId]
        return next
      })
      await fetchData()
    } catch {
      toast.error("Failed to assign driver")
    } finally {
      setAssigningRouteId(null)
    }
  }

  // --- Loading state ---
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600" />
        </div>
      </div>
    )
  }

  // --- Error state ---
  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Could not load deliveries
          </h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            type="button"
            onClick={fetchData}
            className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors text-sm font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Delivery Routes
          </h2>
          <p className="text-gray-600">
            Monitor and manage delivery routes and driver assignments
          </p>
        </div>
        <button
          type="button"
          onClick={fetchData}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium"
        >
          ↻ Refresh
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6">
        <div className="flex gap-2">
          {[
            { key: "all", label: "All Routes" },
            { key: "planned", label: "Planned" },
            { key: "in_progress", label: "In Progress" },
            { key: "completed", label: "Completed" },
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
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {filteredRoutes.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🚛</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No deliveries yet
          </h3>
          <p className="text-gray-600">
            {filter !== "all"
              ? "No routes match this filter."
              : "Delivery routes will appear here once orders are assigned to drivers."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRoutes.map((route) => {
            const bucket = statusToBucket(route.status)
            const progress = getProgress(route)
            const canAssign = ASSIGNABLE_STATUSES.includes(route.status)

            return (
              <div
                key={route.id}
                className="bg-white border border-gray-200 rounded-lg overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold">
                          {routeName(route)}
                        </h3>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(bucket)}`}
                        >
                          {getStatusIcon(bucket)}{" "}
                          {bucket.replace("_", " ").toUpperCase()}
                        </span>
                      </div>

                      <div className="grid md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Driver</p>
                          <p className="font-semibold">{route.driver.name}</p>
                          <p className="text-gray-500">
                            {titleCase(route.driver.vehicleType)}
                            {route.driver.licenseNumber
                              ? ` · ${route.driver.licenseNumber}`
                              : ""}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Route</p>
                          <p className="font-semibold">
                            {route.route.pickup.name}
                          </p>
                          <p className="text-gray-500">
                            → {route.route.dropoff.name}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Packages</p>
                          <p className="font-semibold">
                            {route.packages.length} package
                            {route.packages.length !== 1 ? "s" : ""}
                          </p>
                          <p className="text-gray-500">
                            {bucket === "completed"
                              ? "Delivered"
                              : bucket === "failed"
                                ? "Route failed"
                                : `Pickup → Dropoff`}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900 mb-1">
                        {progress}%
                      </div>
                      <div className="text-sm text-gray-500">Complete</div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-yellow-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Action Buttons + Driver Assignment */}
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedRoute(
                          selectedRoute === route.id ? null : route.id
                        )
                      }
                      className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors text-sm font-medium"
                    >
                      {selectedRoute === route.id
                        ? "Hide Details"
                        : "View Details"}
                    </button>

                    {canAssign && (
                      <div className="flex items-center gap-2 ml-auto">
                        <select
                          value={selectedDriverByRoute[route.id] ?? ""}
                          onChange={(e) =>
                            setSelectedDriverByRoute((prev) => ({
                              ...prev,
                              [route.id]: e.target.value,
                            }))
                          }
                          className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                        >
                          <option value="">Reassign driver…</option>
                          {drivers.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name} ({titleCase(d.vehicleType)})
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleAssign(route.id)}
                          disabled={
                            !selectedDriverByRoute[route.id] ||
                            assigningRouteId === route.id
                          }
                          className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {assigningRouteId === route.id
                            ? "Assigning…"
                            : "Assign"}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Package Details */}
                  {selectedRoute === route.id && (
                    <div className="border-t pt-4">
                      <h4 className="font-semibold mb-3">Package Details</h4>
                      <div className="space-y-2">
                        {route.packages.map((pkg, index) => (
                          <div
                            key={pkg.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 bg-yellow-100 text-yellow-800 rounded-full flex items-center justify-center text-sm font-semibold">
                                {index + 1}
                              </span>
                              <div>
                                <p className="font-mono font-semibold">
                                  {pkg.trackingNumber}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {pkg.address}
                                </p>
                              </div>
                            </div>
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${getPackageStatusColor(pkg.status)}`}
                            >
                              {getPackageStatusLabel(pkg.status)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Summary Stats */}
      <div className="mt-8 grid md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">
            {stats.total}
          </div>
          <div className="text-sm text-blue-700">Total Routes</div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-600">
            {stats.active}
          </div>
          <div className="text-sm text-yellow-700">Active Routes</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">
            {stats.deliveredPkgs}
          </div>
          <div className="text-sm text-green-700">Delivered Packages</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-600">
            {stats.totalPkgs}
          </div>
          <div className="text-sm text-purple-700">Total Packages</div>
        </div>
      </div>
    </div>
  )
}
