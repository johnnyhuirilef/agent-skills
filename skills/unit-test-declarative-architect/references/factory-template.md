# Fishery Factory Pattern

Declarative data factories using Fishery + Faker. Factories produce **primitives/DTOs** (not domain objects) to keep tests focused on behaviour, not construction.

## Factory Definition

```typescript
import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';
import { ulid } from 'ulid';
import { type OrderPrimitives } from './order';

export const OrderFactory = Factory.define<OrderPrimitives>(() => {
  const now = new Date();

  return {
    id: faker.string.uuid(),
    orderId: ulid(),
    amount: faker.number.int({ min: 1000, max: 100000 }),
    currency: 'USD',
    status: 'CREATED',
    billing: {
      id: faker.string.uuid(),
      date: now.toISOString(),
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
    createdAt: now,
    updatedAt: now,
  };
});
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
2. **Dynamic data**: No hardcoded strings. Use `faker` for every field that doesn't need a specific business value.
3. **Deterministic IDs**: Use `faker.string.uuid()` for general IDs, `ulid()` for sortable/ordered IDs.
4. **Minimal overrides**: In tests, only override what the scenario requires. The reader should see at a glance what makes this test case unique.
5. **One factory per aggregate**: Create one factory per aggregate's primitives type. Compose when needed.
