# In-Memory Repository Pattern (Fakes)

Manual Fakes for persistence that implement the real repository interface. Use Fakes instead of library mocks for repositories to enable **state verification** — assert what was persisted, not just that `save` was called.

## Structure

```typescript
import { type Order } from './order';
import { type OrderId } from './order-id';
import { type OrderRepository } from './order.repository';
import { ResourceNotFoundError } from './errors';

export class InMemoryOrderRepository implements OrderRepository {
  private readonly items = new Map<string, Order>();

  async save(entity: Order): Promise<void> {
    this.items.set(entity.id.value, entity);
  }

  async update(entity: Order): Promise<void> {
    this.items.set(entity.id.value, entity);
  }

  async delete(id: OrderId): Promise<void> {
    this.items.delete(id.value);
  }

  async findById(id: OrderId): Promise<Order | null> {
    return this.items.get(id.value) ?? null;
  }

  async findAll(): Promise<Order[]> {
    return Array.from(this.items.values());
  }

  async findByCustomerId(customerId: string): Promise<Order[]> {
    return Array.from(this.items.values()).filter(
      (order) => order.customerId.value === customerId,
    );
  }

  async findByStatus(status: string): Promise<Order[]> {
    return Array.from(this.items.values()).filter(
      (order) => order.status.value === status,
    );
  }

  clear(): void {
    this.items.clear();
  }
}
```

## State Verification in Tests

The primary advantage of Fakes: assert **actual persisted state** rather than mock call counts.

```typescript
// ❌ Mock verification — fragile, tests implementation
expect(mockRepository.save).toHaveBeenCalledWith(expect.anything());

// ✅ State verification — tests behaviour
const saved = await repository.findById(order.id);
expect(saved).toBeDefined();
expect(saved?.status.value).toBe('COMPLETED');
```

## Rules

1. **Map-based storage**: Use `Map<string, Entity>` for O(1) lookups and deterministic behaviour.
2. **Implement the real interface**: The Fake must implement the same `Repository` interface used in production code.
3. **All methods async**: Keep the same `Promise` signatures as the real implementation for drop-in compatibility.
4. **Query methods**: Implement domain-specific queries (`findByCustomerId`, `findByStatus`) using `Array.filter` over Map values.
5. **No external dependencies**: Fakes must be pure in-memory with zero setup cost.
6. **State verification over call verification**: In the Assert block, query the Fake to check what was persisted. This tests behaviour, not implementation.
