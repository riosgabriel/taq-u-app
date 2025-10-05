import { useState } from "react";

// Example delivery routes data - in a real app, this would come from Convex
const exampleRoutes = [
  {
    id: "1",
    routeName: "Tokyo Central Route",
    driverName: "Yamada Kenji",
    vehicleType: "Van",
    vehiclePlate: "品川 123-4567",
    status: "in_progress",
    startTime: Date.now() - 3 * 60 * 60 * 1000,
    estimatedDuration: 8 * 60 * 60 * 1000,
    packages: [
      { id: "p1", trackingNumber: "TAQ12345678ABCD", address: "Shibuya 1-2-3", status: "delivered" },
      { id: "p2", trackingNumber: "TAQ87654321EFGH", address: "Harajuku 4-5-6", status: "in_transit" },
      { id: "p3", trackingNumber: "TAQ11223344IJKL", address: "Shinjuku 7-8-9", status: "pending" },
    ],
    currentLocation: "Shibuya District"
  },
  {
    id: "2",
    routeName: "Tokyo West Route",
    driverName: "Sato Hiroshi",
    vehicleType: "Truck",
    vehiclePlate: "世田谷 567-8901",
    status: "planned",
    startTime: null,
    estimatedDuration: 6 * 60 * 60 * 1000,
    packages: [
      { id: "p4", trackingNumber: "TAQ99887766MNOP", address: "Setagaya 1-1-1", status: "pending" },
      { id: "p5", trackingNumber: "TAQ55443322QRST", address: "Suginami 2-2-2", status: "pending" },
    ],
    currentLocation: "Distribution Center"
  },
  {
    id: "3",
    routeName: "Tokyo East Route",
    driverName: "Tanaka Yuki",
    vehicleType: "Motorcycle",
    vehiclePlate: "台東 234-5678",
    status: "completed",
    startTime: Date.now() - 10 * 60 * 60 * 1000,
    endTime: Date.now() - 2 * 60 * 60 * 1000,
    estimatedDuration: 4 * 60 * 60 * 1000,
    packages: [
      { id: "p6", trackingNumber: "TAQ66778899UVWX", address: "Asakusa 3-3-3", status: "delivered" },
      { id: "p7", trackingNumber: "TAQ33445566YZAB", address: "Ueno 4-4-4", status: "delivered" },
    ],
    currentLocation: "Distribution Center"
  }
];

export function DeliveryRoutes() {
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-600 bg-green-50 border-green-200";
      case "in_progress":
        return "text-blue-600 bg-blue-50 border-blue-200";
      case "planned":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return "✅";
      case "in_progress":
        return "🚛";
      case "planned":
        return "📋";
      default:
        return "❓";
    }
  };

  const getPackageStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
        return "text-green-600 bg-green-50";
      case "in_transit":
        return "text-blue-600 bg-blue-50";
      case "pending":
        return "text-gray-600 bg-gray-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const filteredRoutes = exampleRoutes.filter(route => 
    filter === "all" || route.status === filter
  );

  const formatDuration = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const getProgress = (route: any) => {
    if (route.status === "completed") return 100;
    if (route.status === "planned") return 0;
    
    const deliveredPackages = route.packages.filter((p: any) => p.status === "delivered").length;
    return Math.round((deliveredPackages / route.packages.length) * 100);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Delivery Routes</h2>
        <p className="text-gray-600">Monitor and manage delivery routes and driver assignments</p>
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

      {/* Routes List */}
      <div className="space-y-4">
        {filteredRoutes.map((route) => (
          <div key={route.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold">{route.routeName}</h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(route.status)}`}>
                      {getStatusIcon(route.status)} {route.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Driver</p>
                      <p className="font-semibold">{route.driverName}</p>
                      <p className="text-gray-500">{route.vehicleType} • {route.vehiclePlate}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Current Location</p>
                      <p className="font-semibold">{route.currentLocation}</p>
                      <p className="text-gray-500">
                        {route.status === "in_progress" && route.startTime && 
                          `Started ${new Date(route.startTime).toLocaleTimeString()}`
                        }
                        {route.status === "completed" && route.endTime && 
                          `Completed ${new Date(route.endTime).toLocaleTimeString()}`
                        }
                        {route.status === "planned" && "Awaiting departure"}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Packages</p>
                      <p className="font-semibold">{route.packages.length} packages</p>
                      <p className="text-gray-500">Est. {formatDuration(route.estimatedDuration)}</p>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {getProgress(route)}%
                  </div>
                  <div className="text-sm text-gray-500">Complete</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-yellow-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${getProgress(route)}%` }}
                  ></div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setSelectedRoute(selectedRoute === route.id ? null : route.id)}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors text-sm font-medium"
                >
                  {selectedRoute === route.id ? "Hide Details" : "View Details"}
                </button>
                {route.status === "planned" && (
                  <button className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium">
                    Start Route
                  </button>
                )}
                {route.status === "in_progress" && (
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium">
                    Update Location
                  </button>
                )}
                <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium">
                  Edit Route
                </button>
              </div>

              {/* Package Details */}
              {selectedRoute === route.id && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">Package Details</h4>
                  <div className="space-y-2">
                    {route.packages.map((pkg: any, index: number) => (
                      <div key={pkg.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 bg-yellow-100 text-yellow-800 rounded-full flex items-center justify-center text-sm font-semibold">
                            {index + 1}
                          </span>
                          <div>
                            <p className="font-mono font-semibold">{pkg.trackingNumber}</p>
                            <p className="text-sm text-gray-600">{pkg.address}</p>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getPackageStatusColor(pkg.status)}`}>
                          {pkg.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="mt-8 grid md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">{exampleRoutes.length}</div>
          <div className="text-sm text-blue-700">Total Routes</div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-600">
            {exampleRoutes.filter(r => r.status === "in_progress").length}
          </div>
          <div className="text-sm text-yellow-700">Active Routes</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">
            {exampleRoutes.reduce((sum, route) => sum + route.packages.filter((p: any) => p.status === "delivered").length, 0)}
          </div>
          <div className="text-sm text-green-700">Delivered Today</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-600">
            {exampleRoutes.reduce((sum, route) => sum + route.packages.length, 0)}
          </div>
          <div className="text-sm text-purple-700">Total Packages</div>
        </div>
      </div>
    </div>
  );
}
