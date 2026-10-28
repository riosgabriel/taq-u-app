# TAQ-U web

Customer app and ops console for the TAQ-U delivery API (`apps/api`).

## Run it

```bash
pnpm dev            # from the repo root: API on :3000 + Vite
pnpm dev:web        # web only
```

Vite proxies `/api` to `http://localhost:3000`. Override the target with `VITE_API_PROXY_TARGET`, or skip the proxy
entirely by setting `VITE_API_URL` (e.g. `https://api.example.com/api`).

`pnpm --filter @taq-u-app/web lint` runs `tsc` — the only static check for this package.

## Routes

| Path                      | Access   | What it is                                                |
| ------------------------- | -------- | --------------------------------------------------------- |
| `/track/:trackingNumber?` | public   | Package tracking                                          |
| `/login`, `/register`     | public   | Auth; honours `?redirect=`                                |
| `/ship`                   | customer | Create an order (`POST /orders/mine`) with a live quote   |
| `/orders`, `/orders/:id`  | customer | Order history, details, edit, cancel                      |
| `/account`                | customer | Profile and saved addresses                               |
| `/ops/orders`             | **open** | Dispatch: confirm, assign driver, pickup, deliver, cancel |
| `/ops/deliveries`         | **open** | Deliveries by status, reassign driver                     |
| `/ops/drivers`            | **open** | Driver CRUD and availability                              |

`/ops/*` is unauthenticated because the API has no staff roles yet.

## Layout

```
src/
  lib/api/        client.ts (fetch + ApiError), endpoints.ts, types.ts
  lib/            session.ts, query.ts (QueryClient + keys), format.ts
  components/ui/  shadcn components
  components/     layout/, page.tsx (PageHeader/EmptyState/ErrorState/NotYetAvailable), StatusBadge.tsx
  features/       auth, tracking, shipping, orders, account, ops
  router.tsx
```

Where the API doesn't provide something yet (tracking history, real ETA, payments, profile editing), the UI says so
with `NotYetAvailable` instead of showing made-up data.
