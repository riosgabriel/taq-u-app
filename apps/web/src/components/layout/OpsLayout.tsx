import { NavLink, Outlet } from "react-router"
import { ShieldAlert } from "lucide-react"
import { cn } from "@/lib/utils"

const opsNav = [
  { to: "/ops/orders", label: "Dispatch" },
  { to: "/ops/deliveries", label: "Deliveries" },
  { to: "/ops/drivers", label: "Drivers" },
]

export function OpsLayout() {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2 rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
        <ShieldAlert className="mt-0.5 size-4 shrink-0" />
        <p>
          Operations area. The backend has no staff roles yet, so these endpoints are unauthenticated. Don't expose this
          screen publicly.
        </p>
      </div>
      <nav className="flex gap-1 border-b">
        {opsNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "-mb-px border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground",
                isActive && "border-primary text-foreground"
              )
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  )
}
