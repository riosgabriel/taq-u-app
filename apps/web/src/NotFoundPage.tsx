import { Link } from "react-router"
import { Button } from "@/components/ui/button"

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <h1 className="text-2xl font-semibold">This page doesn't exist</h1>
      <Button asChild variant="outline">
        <Link to="/">Back home</Link>
      </Button>
    </div>
  )
}
