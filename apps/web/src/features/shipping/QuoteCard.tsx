import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { estimateApi } from "@/lib/api/endpoints"
import type { EstimateInput, ServiceLevel } from "@/lib/api/types"
import { formatDate, formatMoney, humanize } from "@/lib/format"
import { errorMessage, queryKeys } from "@/lib/query"
import { NativeSelect } from "./NativeSelect"

const levels: ServiceLevel[] = ["STANDARD", "EXPRESS", "OVERNIGHT"]

export function QuoteCard({
  input,
  serviceLevel,
  onServiceLevelChange,
}: {
  input: Omit<EstimateInput, "serviceLevel"> | null
  serviceLevel: ServiceLevel
  onServiceLevelChange: (level: ServiceLevel) => void
}) {
  const query = useQuery({
    queryKey: queryKeys.estimate(input, serviceLevel),
    queryFn: () => estimateApi.calculate({ ...input!, serviceLevel }),
    enabled: input !== null,
    placeholderData: (previous) => previous,
  })

  return (
    <Card className="lg:sticky lg:top-6">
      <CardHeader>
        <CardTitle>Price quote</CardTitle>
        <p className="text-xs text-muted-foreground">
          An estimate based on total weight and options. Final pricing may differ.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="service-level">Service level (quote only)</Label>
          <NativeSelect
            id="service-level"
            value={serviceLevel}
            onChange={(e) => onServiceLevelChange(e.target.value as ServiceLevel)}
          >
            {levels.map((l) => (
              <option key={l} value={l}>
                {humanize(l)}
              </option>
            ))}
          </NativeSelect>
        </div>
        {input === null && <p className="text-sm text-muted-foreground">Enter a package weight to see a quote.</p>}
        {input !== null && query.isPending && <Skeleton className="h-16 w-full" />}
        {input !== null && query.isError && (
          <p className="text-sm text-destructive">Couldn't get a quote: {errorMessage(query.error)}</p>
        )}
        {input !== null && query.data && (
          <dl className={query.isFetching ? "space-y-2 opacity-60" : "space-y-2"}>
            <div>
              <dt className="text-xs text-muted-foreground">Estimated cost</dt>
              <dd className="text-2xl font-semibold">{formatMoney(query.data.estimatedCost, query.data.currency)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Estimated delivery</dt>
              <dd className="text-sm">{formatDate(query.data.estimatedDeliveryTime)}</dd>
            </div>
          </dl>
        )}
      </CardContent>
    </Card>
  )
}
