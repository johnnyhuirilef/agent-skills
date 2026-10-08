# In-Memory Repository Pattern (Fakes)

Manual Fakes for persistence that implement the real repository interface. Use Fakes instead of library mocks for repositories to enable **state verification**: assert what was persisted, not that `save` was called (TST-1, TST-2).

## Structure

```typescript
import { Order, type OrderId, type OrderPrimitives, type OrderStatus } from './order';
import { type OrderRepository } from './order.repository';

export class InMemoryOrderRepository implements OrderRepository {
  private readonly items = new Map<string, OrderPrimitives>();

  async save(order: Order): Promise<void> {
    this.items.set(order.id.value, structuredClone(order.toPrimitives()));
  }

  async findById(id: OrderId): Promise<Order | null> {
    const stored = this.items.get(id.value);
    return stored ? Order.fromPrimitives(structuredClone(stored)) : null;
  }

  async findByStatus(status: OrderStatus): Promise<Order[]> {
    return [...this.items.values()]
      .filter((stored) => stored.status === status)
      .map((stored) => Order.fromPrimitives(structuredClone(stored)));
  }
}
```

The Fake stores a copy and rebuilds the entity on every read. If it stored the entity reference, a SUT that mutates the entity but forgets to call `save` would still look persisted.

## State Verification in Tests

```typescript
// Don't: mock verification couples the test to the call, not the outcome
expect(mockRepository.save).toHaveBeenCalledWith(expect.anything());
```

```typescript
// Do: read the persisted state back; this fails when nothing was saved
const saved = await repository.findById(order.id);
expect(saved?.toPrimitives()).toStrictEqual({ ...primitives, status: 'COMPLETED' });
```

## Rules

1. **Map-based storage**: Use `Map<string, Primitives>` keyed by id for deterministic lookups.
2. **Implement the real interface**: Implement every method of the production `Repository` interface, with the same `Promise` signatures, and nothing more. No test-only helpers such as `clear()`: a fresh `setup()` per test replaces them (DET-8).
3. **Query methods**: Implement a query such as `findByStatus` with `Array.filter` over stored values, using the same field names as the factory.
4. **Copies, not references**: Store `structuredClone(entity.toPrimitives())` and return `Entity.fromPrimitives(...)` so later mutation cannot change persisted state.
5. **No external dependencies**: Fakes are pure in-memory with zero setup cost.
6. **State verification**: In the Assert block, query the Fake with an assertion that fails on `null` (`toStrictEqual`, or a field check through `?.`). Never `toBeDefined`: it passes for `null`.
