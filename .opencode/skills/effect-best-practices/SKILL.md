---
name: effect-best-practices
description: Comprehensive Effect TypeScript library best practices for service layers, error handling, testing, and resource management
---

## Overview

This project uses the [Effect](https://effect.website/docs) TypeScript library for functional programming. Follow these patterns for consistent, type-safe code.

---

## Service Layer Pattern

### Define Services with Context.Tag

```typescript
import { Context, Effect, Layer } from "effect"

// Define a service tag with an interface
class OrderRepository extends Context.Tag("OrderRepository")<OrderRepository, {
  readonly findById: (id: string) => Effect.Effect<Order, OrderNotFoundError>
  readonly create: (order: CreateOrderInput) => Effect.Effect<Order, OrderAlreadyExistsError>
}>() {}
```

### Use Layer for Implementations

```typescript
// Production implementation
const OrderRepositoryLive = Layer.effect(
  OrderRepository,
  Effect.gen(function* () {
    // ... implementation
  })
)

// Test implementation
const OrderRepositoryTest = Layer.succeed(
  OrderRepository,
  OrderRepository.of({
    findById: (id) => Effect.succeed(mockOrder),
    create: (input) => Effect.succeed(mockOrder)
  })
)
```

### Layer Naming Convention

- **Live layer**: `ServiceNameLive` - Production implementation
- **Test layer**: `ServiceNameTest` - Mock/fake for tests
- **Combined layer**: `Layer.provide(liveLayer, testLayer)` or `Layer.flatMap`

### Avoid Requirement Leakage

Service methods should have `Effect<A, E, never>` - no dependencies in the R slot. Dependencies belong to the Layer, not the service interface.

```typescript
// BAD - leaking dependencies into service
interface BadService {
  query: (sql: string) => Effect.Result<unknown, never, Config | Logger>
}

// GOOD - service has no requirements
interface GoodService {
  query: (sql: string) => Effect.Effect<Result, DbError>
}
```

---

## Error Handling

### Use Data.TaggedError for Typed Errors

```typescript
import { Data, Effect } from "effect"

// Define error types with discriminant _tag
class OrderNotFoundError extends Data.TaggedError("OrderNotFoundError")<{
  readonly orderId: string
}> {}

class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly field: string
  readonly message: string
}> {}

// Usage in Effect.gen
const program = Effect.gen(function* () {
  const order = yield* Effect.findOrFail(
    findOrder(id),
    new OrderNotFoundError({ orderId: id })
  )
  // ...
})
```

### Catch Specific Errors

```typescript
// Handle specific error types
const result = yield* Effect.catchTag(
  someEffect,
  "OrderNotFoundError",
  (error) => Effect.succeed(fallbackOrder)
)

// Handle multiple error types
yield* Effect.catchTags(
  effect,
  [
    ["OrderNotFoundError", (e) => handleNotFound(e)],
    ["ValidationError", (e) => handleValidation(e)]
  ]
)

// Catch all errors
yield* Effect.catchAll(effect, (error) => Effect.succeed(defaultValue))
```

### Use Effect.either for Optional Recovery

```typescript
const failureOrSuccess = yield* Effect.either(riskyEffect)

if (Either.isLeft(failureOrSuccess)) {
  // Handle error
} else {
  // Use success value
}
```

---

## Effect.gen vs Pipe Chains

### Prefer Effect.gen for Sequential Logic

```typescript
// RECOMMENDED - easy to read
const program = Effect.gen(function* () {
  const order = yield* findOrder(id)
  const customer = yield* findCustomer(order.customerId)
  const updatedOrder = yield* updateOrderStatus(order, "confirmed")
  return formatOrderResponse(updatedOrder, customer)
})

// AVOID - hard to follow
const program = pipe(
  findOrder(id),
  Effect.flatMap((order) => findCustomer(order.customerId)),
  Effect.flatMap((customer) => updateOrderStatus(order, "confirmed")),
  Effect.map((order) => formatOrderResponse(order, customer))
)
```

### Use Pipe for Simple Transformations

```typescript
// Good for simple map/filter chains
const transformed = pipe(
  orders,
  Effect.forEach((order) => transformOrder(order)),
  Effect.map((orders) => orders.filter((o) => o.status === "pending"))
)
```

---

## Running Effects

### Use NodeRuntime.runMain for Applications

```typescript
import { Effect } from "effect"
import { NodeRuntime } from "@effect/platform-node"

const program = Effect.gen(function* () {
  yield* Console.log("Application started")
  // ...
})

NodeRuntime.runMain(program)
```

This ensures graceful shutdown on SIGINT (Ctrl+C).

### Running Effects in Tests

```typescript
import { Effect, Layer, testRuntime } from "effect"

it("should create order", () => {
  const testLayer = Layer.provide(
    OrderRepositoryTest,
    OrderRepositoryLive
  )
  
  const result = Effect.runSync(Effect.provide(program, testLayer))
  expect(result).toEqual(expected)
})
```

---

## Testing Patterns

### Mock Services with Layer Test

```typescript
const OrderRepositoryTest = Layer.succeed(
  OrderRepository,
  OrderRepository.of({
    findById: (id) => Effect.succeed({ id, status: "pending" }),
    create: (input) => Effect.succeed({ id: "test-123", ...input })
  })
)

const testProgram = Effect.provide(program, OrderRepositoryTest)
const result = Effect.runPromise(testProgram)
```

### Use TestClock for Time-Based Effects

```typescript
import { TestClock } from "effect"

Effect.testWith(TestClock)((clock) =>
  Effect.gen(function* () {
    yield* Effect.sleep("1 second")
    const now = clock.currentTime
    expect(now).toBe(1000)
  })
)
```

---

## Resource Management

### Use Effect.scoped for Resource Acquisition

```typescript
import { Effect, Scope } from "effect"

// Database connection example
const acquireDbConnection = Effect.acquireRelease(
  Effect.sync(() => createConnection()),
  (conn) => Effect.sync(() => conn.close())
)

const withDatabase = Effect.useScope(Scope.extend(acquireDbConnection))

const program = Effect.gen(function* (scope) {
  const conn = yield* Effect.acquireRelease(
    Effect.sync(() => createConnection()),
    (conn) => Effect.sync(() => conn.close())
  )
  // use conn...
})
```

### Avoid Leaking Resources

Always use `acquireRelease` or `Effect.ensuring` for cleanup:

```typescript
// GOOD
yield* Effect.ensuring(cleanupEffect, finalEffect)

// BAD - resource might not be cleaned up
yield* sideEffect
```

---

## Code Style Guidelines

### Avoid Tacit (Point-Free) Usage

```typescript
// AVOID
Effect.map(effect, fn)

// PREFERRED
Effect.map(effect, (x) => fn(x))
```

Tacit usage can cause type inference issues with overloaded functions.

### Use Effect.fn for Spans

```typescript
import { Effect } from "effect"

const trackedFunction = Effect.fn((n: number) => Effect.succeed(n * 2))
```

This creates spans for observability/tracing.

### Branded Types for Domain IDs

```typescript
import { Brand, Effect } from "effect"

type OrderId = string & Brand.Brand<"OrderId">
const OrderId = Brand.nominal<OrderId>()

const parseOrderId = (id: string): Effect.Effect<OrderId, InvalidIdError> =>
  Effect.succeed(id as OrderId)
```

---

## Layer Composition Patterns

### Simple Composition

```typescript
const ConfigLive = Layer.succeed(Config, { logLevel: "info" })

const LoggerLive = Layer.effect(
  Logger,
  Effect.gen(function* () {
    const config = yield* Config
    return { log: (msg) => console.log(`[${config.logLevel}] ${msg}`) }
  })
)
```

### FlatMap for Dependencies

```typescript
const DatabaseLive = Layer.flatMap(
  Database,
  Effect.gen(function* () {
    const config = yield* Config
    const logger = yield* Logger
    const connection = yield* createConnection(config, logger)
    return Layer.succeed(Database, { query: connection.query })
  })
)
```

### Combining Multiple Layers

```typescript
const AppLayer = Layer.mergeAll(ConfigLive, LoggerLive, DatabaseLive)

// Or using provide
const runnable = Effect.provide(program, AppLayer)
```

---

## Quick Reference

| Pattern | Use Case |
|---------|----------|
| `Context.Tag` | Define service interface |
| `Layer.succeed` | Simple static service |
| `Layer.effect` | Service requiring other services |
| `Layer.flatMap` | Complex service creation |
| `Effect.gen` | Sequential async logic |
| `Data.TaggedError` | Typed errors with discriminant |
| `catchTag` | Handle specific error |
| `Effect.provide` | Supply services to effect |
| `NodeRuntime.runMain` | Main entry point |