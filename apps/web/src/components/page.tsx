import type { ReactNode } from "react"
import { AlertCircle, Inbox, RotateCw } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { errorMessage } from "@/lib/query"

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-14 text-center">
      <Inbox className="mb-3 size-8 text-muted-foreground" />
      <p className="font-medium">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <Alert variant="destructive">
      <AlertCircle />
      <AlertTitle>Couldn't load this</AlertTitle>
      <AlertDescription>
        <p>{errorMessage(error)}</p>
        {onRetry && (
          <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
            <RotateCw /> Try again
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}

/** Marks UI whose data the backend doesn't provide yet, so the gap is visible instead of faked. */
export function NotYetAvailable({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-md border border-dashed bg-muted/40 px-3 py-2 text-xs text-muted-foreground">{children}</p>
  )
}
