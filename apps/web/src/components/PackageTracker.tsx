import { useState } from "react";

// Example tracking data - in a real app, this would come from Convex
const examplePackages = {
  "TAQ12345678ABCD": {
    trackingNumber: "TAQ12345678ABCD",
    status: "in_transit",
    senderName: "Tokyo Electronics Store",
    recipientName: "Yamada Taro",
    recipientAddress: "Shibuya, Tokyo",
    estimatedDelivery: Date.now() + 24 * 60 * 60 * 1000,
    updates: [
      {
        status: "Package picked up",
        location: "Tokyo Distribution Center",
        timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000,
        notes: "Package collected from sender"
      },
      {
        status: "In transit",
        location: "Osaka Hub",
        timestamp: Date.now() - 1 * 24 * 60 * 60 * 1000,
        notes: "Package sorted and loaded for delivery"
      },
      {
        status: "Out for delivery",
        location: "Shibuya Delivery Center",
        timestamp: Date.now() - 2 * 60 * 60 * 1000,
        notes: "Package loaded on delivery vehicle"
      }
    ]
  },
  "TAQ87654321EFGH": {
    trackingNumber: "TAQ87654321EFGH",
    status: "delivered",
    senderName: "Amazon Japan",
    recipientName: "Sato Hanako",
    recipientAddress: "Harajuku, Tokyo",
    estimatedDelivery: Date.now() - 1 * 24 * 60 * 60 * 1000,
    updates: [
      {
        status: "Package picked up",
        location: "Amazon Fulfillment Center",
        timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000,
        notes: "Package collected from sender"
      },
      {
        status: "Delivered",
        location: "Harajuku, Tokyo",
        timestamp: Date.now() - 1 * 24 * 60 * 60 * 1000,
        notes: "Package delivered to recipient"
      }
    ]
  }
};

export function PackageTracker() {
  const [trackingNumber, setTrackingNumber] = useState("");
  const [searchResult, setSearchResult] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    setIsSearching(true);
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const result = examplePackages[trackingNumber as keyof typeof examplePackages];
    setSearchResult(result || null);
    setIsSearching(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
        return "text-green-600 bg-green-50";
      case "out_for_delivery":
        return "text-blue-600 bg-blue-50";
      case "in_transit":
        return "text-yellow-600 bg-yellow-50";
      default:
        return "text-gray-600 bg-gray-50";
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
      default:
        return "⏳";
    }
  };

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
              placeholder="Enter tracking number (e.g., TAQ12345678ABCD)"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            />
          </div>
          <button
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
                {getStatusIcon(searchResult.status)} {searchResult.status.replace('_', ' ').toUpperCase()}
              </span>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Tracking Number</p>
                <p className="font-mono font-semibold">{searchResult.trackingNumber}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Estimated Delivery</p>
                <p className="font-semibold">{new Date(searchResult.estimatedDelivery).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">From</p>
                <p className="font-semibold">{searchResult.senderName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">To</p>
                <p className="font-semibold">{searchResult.recipientName}</p>
                <p className="text-sm text-gray-500">{searchResult.recipientAddress}</p>
              </div>
            </div>
          </div>

          {/* Tracking Timeline */}
          <div>
            <h3 className="text-xl font-semibold mb-4">Tracking History</h3>
            <div className="space-y-4">
              {searchResult.updates.map((update: any, index: number) => (
                <div key={index} className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                    <span className="text-yellow-600 font-semibold">{index + 1}</span>
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold text-gray-900">{update.status}</h4>
                      <span className="text-sm text-gray-500">
                        {new Date(update.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-1">{update.location}</p>
                    {update.notes && (
                      <p className="text-sm text-gray-500">{update.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {searchResult === null && trackingNumber && !isSearching && (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">❌</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Package Not Found</h3>
          <p className="text-gray-600">Please check your tracking number and try again.</p>
        </div>
      )}

      {/* Quick Access */}
      <div className="mt-8 p-4 bg-yellow-50 rounded-lg">
        <h4 className="font-semibold text-yellow-800 mb-2">Try these example tracking numbers:</h4>
        <div className="flex flex-wrap gap-2">
          {Object.keys(examplePackages).map((trackingNum) => (
            <button
              key={trackingNum}
              onClick={() => setTrackingNumber(trackingNum)}
              className="px-3 py-1 bg-white text-yellow-700 rounded border border-yellow-200 hover:bg-yellow-100 transition-colors text-sm font-mono"
            >
              {trackingNum}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
