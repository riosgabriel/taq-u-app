import { Link, NavLink, Outlet } from "react-router"
import { LogOut, Package, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Toaster } from "@/components/ui/sonner"
import { useCurrentCustomer, useLogout } from "@/features/auth/use-auth"
import { cn } from "@/lib/utils"

const customerNav = [
  { to: "/track", label: "Track" },
  { to: "/ship", label: "Ship" },
  { to: "/orders", label: "My orders" },
]

export function AppShell() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
          <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground">
              <Package className="size-4" />
            </span>
            <span className="hidden sm:inline">TAQ-U</span>
          </Link>
          <nav className="-mx-1 flex flex-1 items-center gap-1 overflow-x-auto">
            {customerNav.map((item) => (
              <NavItem key={item.to} to={item.to} label={item.label} />
            ))}
            <NavItem to="/ops" label="Ops" className="ml-auto" />
          </nav>
          <AccountMenu />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>
      <Toaster richColors />
    </div>
  )
}

function NavItem({ to, label, className }: { to: string; label: string; className?: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground",
          isActive && "bg-accent text-accent-foreground",
          className
        )
      }
    >
      {label}
    </NavLink>
  )
}

function AccountMenu() {
  const { customer, status } = useCurrentCustomer()
  const logout = useLogout()

  if (status !== "authenticated") {
    return (
      <Button asChild size="sm">
        <Link to="/login">Sign in</Link>
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <User />
          <span className="hidden max-w-32 truncate sm:inline">{customer?.name ?? "Account"}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {customer && (
          <DropdownMenuLabel className="font-normal">
            <p className="truncate font-medium">{customer.name}</p>
            <p className="truncate text-xs text-muted-foreground">{customer.email}</p>
          </DropdownMenuLabel>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/account">Account &amp; addresses</Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={logout}>
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
