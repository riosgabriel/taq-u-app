import { useState } from "react";

// Example package data - in a real app, this would come from Convex
const examplePackages = [
  {
    id: "1",
    trackingNumber: "TAQ12345678ABCD",
    recipientName: "Yamada Taro",
    recipientAddress: "Shibuya, Tokyo",
    status: "in_transit",
    createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
    estimatedDelivery: Date.now() + 24 * 60 * 60 * 1000,
    cost: 1200,
    paymentStatus: "paid"
  },
  {
    id: "2",
    trackingNumber: "TAQ87654321EFGH",
    recipientName: "Sato Hanako",
    recipientAddress: "Harajuku, Tokyo",
    status: "delivered",
    createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
    estimatedDelivery: Date.now() - 1 * 24 * 60 * 60 * 1000,
    cost: 800,
    paymentStatus: "paid"
  },
  {
    id: "3",
    trackingNumber: "TAQ11223344IJKL",
    recipientName: "Tanaka Ichiro",
    recipientAddress: "Shinjuku, Tokyo",
    status: "pending",
    createdAt: Date.now() - 1 * 60 * 60 * 1000,
    estimatedDelivery: Date.now() + 3 * 24 * 60 * 60 * 1000,
    cost: 2000,
    paymentStatus: "pending"
  },
  {
    id: "4",
    trackingNumber: "TAQ99887766MNOP",
    recipientName: "Suzuki Yuki",
    recipientAddress: "Akihabara, Tokyo",
    status: "out_for_delivery",
    createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
    estimatedDelivery: Date.now() + 4 * 60 * 60 * 1000,
    cost: 1500,
    paymentStatus: "cod"
  }
];

export function PackageList() {
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
        return "text-green-600 bg-green-50 border-green-200";
      case "out_for_delivery":
        return "text-blue-600 bg-blue-50 border-blue-200";
      case "in_transit":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "pending":
        return "text-gray-600 bg-gray-50 border-gray-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "delivered":
        return "✅";
      case "out_for_delivery":
        return "🚛";
      case "in_transit":
        return "📦";
      case "pending":
        return "⏳";
      default:
        return "❓";
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "text-green-600 bg-green-50";
      case "cod":
        return "text-blue-600 bg-blue-50";
      case "pending":
        return "text-orange-600 bg-orange-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const filteredPackages = examplePackages.filter(pkg => {
    const matchesFilter = filter === "all" || pkg.status === filter;
    const matchesSearch = pkg.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pkg.recipientName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const statusCounts = {
    all: examplePackages.length,
    pending: examplePackages.filter(p => p.status === "pending").length,
    in_transit: examplePackages.filter(p => p.status === "in_transit").length,
    out_for_delivery: examplePackages.filter(p => p.status === "out_for_delivery").length,
    delivered: examplePackages.filter(p => p.status === "delivered").length,
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">My Packages</h2>
        <p className="text-gray-600">Track and manage all your shipments</p>
      </div>

      {/* Filters and Search */}
      <div className="mb-6 space-y-4">
        {/* Status Filter Tabs */}
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

        {/* Search */}
        <div className="max-w-md">
          <input
            type="text"
            placeholder="Search by tracking number or recipient..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Package List */}
      <div className="space-y-4">
        {filteredPackages.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📦</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No packages found</h3>
            <p className="text-gray-600">
              {searchTerm ? "Try adjusting your search terms" : "You haven't shipped any packages yet"}
            </p>
          </div>
        ) : (
          filteredPackages.map((pkg) => (
            <div key={pkg.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-mono font-semibold text-lg">{pkg.trackingNumber}</h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(pkg.status)}`}>
                      {getStatusIcon(pkg.status)} {pkg.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Recipient</p>
                      <p className="font-semibold">{pkg.recipientName}</p>
                      <p className="text-gray-500">{pkg.recipientAddress}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Estimated Delivery</p>
                      <p className="font-semibold">
                        {pkg.status === "delivered" 
                          ? `Delivered ${new Date(pkg.estimatedDelivery).toLocaleDateString()}`
                          : new Date(pkg.estimatedDelivery).toLocaleDateString()
                        }
                      </p>
                      <p className="text-gray-500">
                        Created {new Date(pkg.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900 mb-1">
                    ¥{pkg.cost.toLocaleString()}
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getPaymentStatusColor(pkg.paymentStatus)}`}>
                    {pkg.paymentStatus.toUpperCase()}
                  </span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors text-sm font-medium">
                  Track Package
                </button>
                <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium">
                  View Details
                </button>
                {pkg.paymentStatus === "pending" && (
                  <button className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium">
                    Pay Now
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Summary Stats */}
      <div className="mt-8 grid md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">{examplePackages.length}</div>
          <div className="text-sm text-blue-700">Total Packages</div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-600">
            {examplePackages.filter(p => p.status === "in_transit" || p.status === "out_for_delivery").length}
          </div>
          <div className="text-sm text-yellow-700">In Transit</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">
            {examplePackages.filter(p => p.status === "delivered").length}
          </div>
          <div className="text-sm text-green-700">Delivered</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-600">
            ¥{examplePackages.reduce((sum, pkg) => sum + pkg.cost, 0).toLocaleString()}
          </div>
          <div className="text-sm text-purple-700">Total Spent</div>
        </div>
      </div>
    </div>
  );
}
