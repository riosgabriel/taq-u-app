import { cn } from "@/lib/utils"
import { humanize } from "@/lib/format"
import type { DeliveryStatus, OrderStatus, PackageStatus } from "@/lib/api/types"

type Tone = "neutral" | "info" | "progress" | "success" | "danger"

const tones: Record<OrderStatus | PackageStatus | DeliveryStatus, Tone> = {
  PENDING: "neutral",
  CONFIRMED: "info",
  ASSIGNED: "info",
  IN_PROGRESS: "progress",
  COMPLETED: "success",
  CANCELLED: "danger",
  AWAITING_PICKUP: "neutral",
  IN_TRANSIT: "progress",
  OUT_FOR_DELIVERY: "progress",
  DELIVERED: "success",
  LOST: "danger",
  PICKUP_IN_PROGRESS: "progress",
  PICKED_UP: "progress",
  FAILED: "danger",
}

const toneClasses: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  info: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  progress: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  success: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  danger: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const tone = tones[status as keyof typeof tones] ?? "neutral"
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        toneClasses[tone],
        className
      )}
    >
      {humanize(status)}
    </span>
  )
}
