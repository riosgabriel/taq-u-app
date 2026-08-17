import { useEffect, useState } from "react"
import { Toaster } from "sonner"
import { AuthProvider, useAuth } from "./context/AuthContext"
import { AccountDashboard } from "./components/AccountDashboard"
import { DeliveryRoutes } from "./components/DeliveryRoutes"
import DriverManagement from "./components/DriverManagement"
import { LoginPage } from "./components/LoginPage"
import { OrderList } from "./components/OrderList"
import { PackageList } from "./components/PackageList"
import { PackageTracker } from "./components/PackageTracker"
import { ShipPackage } from "./components/ShipPackage"

function AppContent() {
  const [activeTab, setActiveTab] = useState("track")
  const { customer, logout } = useAuth()

  useEffect(() => {
    if (customer && activeTab === "auth") {
      setActiveTab("account")
    }
    if (!customer && activeTab === "account") {
      setActiveTab("track")
    }
  }, [customer, activeTab])

  const baseTabs = [
    { id: "track", label: "Track Package", icon: "📦" },
    { id: "ship", label: "Ship Package", icon: "📮" },
    { id: "orders", label: "My Orders", icon: "📋" },
    { id: "routes", label: "Delivery Routes", icon: "🚛" },
    { id: "drivers", label: "Driver Registration", icon: "👤" },
  ]

  const tabs = customer ? [...baseTabs, { id: "account", label: "Account", icon: "🏠" }] : baseTabs

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-yellow-600">TAQ-U-BIN</h1>
            <span className="text-sm text-gray-500">Package Delivery Service</span>
          </div>
          <div>
            {customer ? (
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700">{customer.name}</span>
                <button
                  type="button"
                  onClick={logout}
                  className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setActiveTab("auth")}
                className="px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-md hover:bg-yellow-700 transition-colors"
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Navigation Tabs */}
          <div className="flex gap-1 mb-6 bg-white rounded-lg p-1 shadow-sm">
            {tabs.map((tab) => (
              <button
                type="button"
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-yellow-100 text-yellow-800"
                    : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-lg shadow-sm">
            {activeTab === "track" && <PackageTracker />}
            {activeTab === "ship" && <ShipPackage onSignInClick={() => setActiveTab("auth")} />}
            {activeTab === "orders" && <OrderList />}
            {activeTab === "routes" && <DeliveryRoutes />}
            {activeTab === "drivers" && <DriverManagement />}
            {activeTab === "account" && customer && <AccountDashboard />}
            {activeTab === "auth" && <LoginPage />}
          </div>
        </div>
      </main>
      <Toaster />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
