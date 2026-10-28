import { Check, CircleAlert } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { NotYetAvailable } from "@/components/page"
import { StatusBadge } from "@/components/StatusBadge"
import { formatDate, humanize } from "@/lib/format"
import type { PackageStatus, TrackingResult } from "@/lib/api/types"
import { cn } from "@/lib/utils"

const steps: PackageStatus[] = ["AWAITING_PICKUP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"]

function ProgressStepper({ status }: { status: PackageStatus }) {
  if (status === "LOST") {
    return (
      <div className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
        <CircleAlert className="mt-0.5 size-4 shrink-0" />
        <p>This package has been reported lost. Please contact support.</p>
      </div>
    )
  }
  const currentIndex = steps.indexOf(status)
  return (
    <ol className="flex flex-col gap-3 sm:flex-row sm:gap-0" aria-label="Delivery progress">
      {steps.map((step, index) => {
        const done = index < currentIndex || status === "DELIVERED"
        const active = index === currentIndex && status !== "DELIVERED"
        return (
          <li
            key={step}
            className="flex items-center gap-3 sm:flex-1 sm:flex-col sm:gap-2 sm:text-center"
            aria-current={active ? "step" : undefined}
          >
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium",
                done && "border-emerald-600 bg-emerald-600 text-white",
                active && "border-primary bg-primary text-primary-foreground",
                !done && !active && "text-muted-foreground"
              )}
            >
              {done ? <Check className="size-4" /> : index + 1}
            </span>
            <span className={cn("text-sm", active ? "font-medium" : "text-muted-foreground")}>{humanize(step)}</span>
          </li>
        )
      })}
    </ol>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  )
}

export function TrackingResultCard({ result }: { result: TrackingResult }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="break-all font-mono text-base">{result.trackingNumber}</CardTitle>
        <StatusBadge status={result.status} />
      </CardHeader>
      <CardContent className="space-y-6">
        <ProgressStepper status={result.status} />
        <dl className="grid gap-4 sm:grid-cols-2">
          <Field label="Sender">{result.senderName}</Field>
          <Field label="Pickup date">{formatDate(result.pickupDate)}</Field>
          <Field label="Pickup address">{result.pickupAddress}</Field>
          <Field label="Delivery address">{result.recipientAddress}</Field>
        </dl>
        <div className="grid gap-2">
          <NotYetAvailable>Estimated delivery date isn't available yet.</NotYetAvailable>
          <NotYetAvailable>Detailed status history isn't available yet.</NotYetAvailable>
        </div>
      </CardContent>
    </Card>
  )
}
