import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { OrderResponse } from "../types/order";
import { OrderEdit } from "./OrderEdit";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  PENDING: "text-yellow-600 bg-yellow-50 border-yellow-200",
  CONFIRMED: "text-blue-600 bg-blue-50 border-blue-200",
  IN_TRANSIT: "text-indigo-600 bg-indigo-50 border-indigo-200",
  DELIVERED: "text-green-600 bg-green-50 border-green-200",
  CANCELLED: "text-red-600 bg-red-50 border-red-200",
};

const statusIcons: Record<string, string> = {
  PENDING: "⏳",
  CONFIRMED: "✅",
  IN_TRANSIT: "📦",
  DELIVERED: "📬",
  CANCELLED: "❌",
};

export function OrderList() {
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [editingOrder, setEditingOrder] = useState<OrderResponse | null>(null);

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    try {
      setLoading(true);
      const data = await api.getOrders();
      setOrders(data);
    } catch (error: any) {
      toast.error(error.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel(order: OrderResponse) {
    if (!confirm("Are you sure you want to cancel order " + order.id + "?")) return;

    try {
      await api.cancelOrder(order.id);
      toast.success("Order cancelled successfully");
      loadOrders();
    } catch (error: any) {
      toast.error(error.message || "Failed to cancel order");
    }
  }

  const filteredOrders = filter === "all"
    ? orders
    : orders.filter(o => o.status === filter);

  const statusCounts = {
    all: orders.length,
    PENDING: orders.filter(o => o.status === "PENDING").length,
    CONFIRMED: orders.filter(o => o.status === "CONFIRMED").length,
    IN_TRANSIT: orders.filter(o => o.status === "IN_TRANSIT").length,
    DELIVERED: orders.filter(o => o.status === "DELIVERED").length,
    CANCELLED: orders.filter(o => o.status === "CANCELLED").length,
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="text-4xl mb-4">⏳</div>
        <p className="text-gray-600">Loading orders...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">My Orders</h2>
        <p className="text-gray-600">View and manage your orders</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { key: "all", label: "All", count: statusCounts.all },
          { key: "PENDING", label: "Pending", count: statusCounts.PENDING },
          { key: "CONFIRMED", label: "Confirmed", count: statusCounts.CONFIRMED },
          { key: "IN_TRANSIT", label: "In Transit", count: statusCounts.IN_TRANSIT },
          { key: "DELIVERED", label: "Delivered", count: statusCounts.DELIVERED },
          { key: "CANCELLED", label: "Cancelled", count: statusCounts.CANCELLED },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={"px-4 py-2 rounded-lg font-medium transition-colors " +
              (filter === tab.key
                ? "bg-yellow-100 text-yellow-800 border border-yellow-200"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50")
            }
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Order List */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📋</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders found</h3>
            <p className="text-gray-600">You haven't placed any orders yet</p>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <div key={order.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-mono font-semibold text-lg">{order.id}</h3>
                    <span className={"px-3 py-1 rounded-full text-sm font-medium border " + (statusColors[order.status] || "text-gray-600 bg-gray-50")}>
                      {(statusIcons[order.status] || "❓")} {order.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="text-gray-600">Pickup</p>
                        <p className="font-semibold">{order.pickupAddress}</p>
                        <p className="text-gray-500">{new Date(order.pickupDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                        <p className="text-gray-600">Delivery</p>
                        <p className="font-semibold">{order.deliveryAddress}</p>
                        {order.deliveryDate && (
                          <p className="text-gray-500">{new Date(order.deliveryDate).toLocaleDateString()}</p>
                        )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-600 mb-1">
                    Priority: {order.priority}
                  </div>
                  <div className="text-sm text-gray-500">
                    {order.packages.length} package(s)
                  </div>
                </div>
              </div>

              {order.specialInstructions && (
                <div className="mb-4 p-3 bg-gray-50 rounded-md text-sm text-gray-600">
                  <strong>Instructions:</strong> {order.specialInstructions}
                </div>
              )}

              <div className="flex gap-2">
                {order.status !== "DELIVERED" && order.status !== "CANCELLED" && (
                  <button
                    onClick={() => setEditingOrder(order)}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors text-sm font-medium"
                  >
                    Edit Order
                  </button>
                )}
                {order.status === "PENDING" && (
                  <button
                    onClick={() => handleCancel(order)}
                    className="px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50 transition-colors text-sm font-medium"
                  >
                    Cancel Order
                  </button>
                )}
                <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium">
                  View Details
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Stats Summary */}
      <div className="mt-8 grid md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">{orders.length}</div>
          <div className="text-sm text-blue-700">Total Orders</div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-600">
            {orders.filter(o => o.status === "PENDING" || o.status === "CONFIRMED").length}
          </div>
          <div className="text-sm text-yellow-700">Active</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">
            {orders.filter(o => o.status === "DELIVERED").length}
          </div>
          <div className="text-sm text-green-700">Delivered</div>
        </div>
        <div className="bg-red-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-600">
            {orders.filter(o => o.status === "CANCELLED").length}
          </div>
          <div className="text-sm text-red-700">Cancelled</div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingOrder && (
        <OrderEdit
          order={editingOrder}
          onClose={() => setEditingOrder(null)}
          onSuccess={() => {
            setEditingOrder(null);
            loadOrders();
          }}
        />
      )}
    </div>
  );
}
