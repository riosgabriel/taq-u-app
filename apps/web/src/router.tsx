import { createBrowserRouter, Navigate } from "react-router"
import { AppShell } from "@/components/layout/AppShell"
import { OpsLayout } from "@/components/layout/OpsLayout"
import { AccountPage } from "@/features/account/AccountPage"
import { LoginPage } from "@/features/auth/LoginPage"
import { RegisterPage } from "@/features/auth/RegisterPage"
import { RedirectIfAuthenticated, RequireAuth } from "@/features/auth/RequireAuth"
import { OpsDeliveriesPage } from "@/features/ops/OpsDeliveriesPage"
import { OpsDriversPage } from "@/features/ops/OpsDriversPage"
import { OpsOrdersPage } from "@/features/ops/OpsOrdersPage"
import { OrderDetailPage } from "@/features/orders/OrderDetailPage"
import { OrdersPage } from "@/features/orders/OrdersPage"
import { ShipPage } from "@/features/shipping/ShipPage"
import { TrackPage } from "@/features/tracking/TrackPage"
import { NotFoundPage } from "@/NotFoundPage"

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/track" replace /> },
      { path: "track/:trackingNumber?", element: <TrackPage /> },
      {
        element: <RedirectIfAuthenticated />,
        children: [
          { path: "login", element: <LoginPage /> },
          { path: "register", element: <RegisterPage /> },
        ],
      },
      {
        element: <RequireAuth />,
        children: [
          { path: "ship", element: <ShipPage /> },
          { path: "orders", element: <OrdersPage /> },
          { path: "orders/:orderId", element: <OrderDetailPage /> },
          { path: "account", element: <AccountPage /> },
        ],
      },
      {
        path: "ops",
        element: <OpsLayout />,
        children: [
          { index: true, element: <Navigate to="/ops/orders" replace /> },
          { path: "orders", element: <OpsOrdersPage /> },
          { path: "deliveries", element: <OpsDeliveriesPage /> },
          { path: "drivers", element: <OpsDriversPage /> },
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
])
