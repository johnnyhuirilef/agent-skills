# Fishery Factory Pattern

Declarative data factories using Fishery + Faker. Factories produce **primitives/DTOs** (not domain objects) to keep tests focused on behaviour, not construction.

## Factory Definition

```typescript
import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';
import { type OrderPrimitives } from './order';

faker.seed(123); // reproducible data

export const OrderFactory = Factory.define<OrderPrimitives>(({ sequence }) => ({
  id: faker.string.uuid(),
  orderNumber: sequence, // ordered ids come from Fishery's sequence
  amount: faker.number.int({ min: 1000, max: 100000 }),
  currency: 'USD', // domain constant from the SUT's Currency type
  status: 'CREATED', // domain constant from the SUT's OrderStatus type
  billing: {
    id: faker.string.uuid(),
    date: '2025-01-15T10:00:00.000Z',
    transactionNumber: faker.number.int({ min: 1, max: 999999 }),
  },
  items: [],
  customer: {
    documentNumber: faker.number.int({ min: 1000000, max: 999999999 }).toString(),
    email: faker.internet.email(),
  },
  user: {
    email: faker.internet.email(),
    fullName: faker.person.fullName(),
  },
  createdAt: new Date('2025-01-15T10:00:00Z'), // fixed, never new Date()
  updatedAt: new Date('2025-01-15T10:00:00Z'), // separate instance per field
}));
```

## Usage in Tests — `.build()` with Overrides

Override **only** the fields relevant to the test scenario. Everything else gets realistic defaults from Faker.

```typescript
// Default — all fields auto-generated
const order = OrderFactory.build();

// Override specific fields for the scenario under test
const cancelledOrder = OrderFactory.build({
  status: 'CANCELLED',
  amount: 5000,
});

// Override nested fields
const orderWithCustomer = OrderFactory.build({
  customer: {
    documentNumber: '123456789',
    email: 'specific@test.com',
  },
});
```

## Rules

1. **Primitives only**: Factories produce plain objects (DTOs), not domain entities. Use `Entity.fromPrimitives(factory.build())` to create domain objects when needed.
2. **Dynamic data**: No arbitrary hardcoded strings; use `faker` for every field without a specific business value. Domain constants from the SUT's own enums or literal types (`'USD'`, `'CREATED'`) are fine.
3. **Deterministic IDs**: Use seeded `faker.string.uuid()`, or Fishery's `sequence` for ordered ids. Never `ulid`, `crypto.randomUUID`, or other unseeded generators.
4. **Minimal overrides**: In tests, only override what the scenario requires. The reader should see at a glance what makes this test case unique.
5. **Seeded and fixed time**: Call `faker.seed(...)` once and use fixed dates, one `Date` instance per field, never `new Date()` without an argument (DET-1, DET-3).
6. **One factory per aggregate**: Create one factory per aggregate's primitives type. Compose when needed.
