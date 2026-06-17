# Module Structure Reference

## Canonical folder layout (NestJS example)

```
src/
├── customer/
│   ├── infrastructure/
│   │   ├── provider/
│   │   │   └── customer.provider.ts       ← DI binding (DB vs Mock toggle)
│   │   └── adapter/
│   │       ├── database/
│   │       │   ├── customer.repository.ts ← implements ICustomerRepository
│   │       │   └── customer.dao.ts        ← TypeORM @Entity()
│   │       └── mock/
│   │           └── customer.repository.ts ← in-memory fake for tests
│   ├── presentation/
│   │   └── controller/
│   │       └── customer.controller.ts
│   ├── application/
│   │   ├── query/
│   │   │   ├── customer.byId.handler.ts
│   │   │   └── customer.byId.query.ts
│   │   └── command/
│   │       ├── customer.create.handler.ts
│   │       └── customer.create.command.ts
│   ├── domain/
│   │   ├── model/
│   │   │   └── customer.entity.ts         ← DDD Entity (no @Entity from TypeORM)
│   │   ├── port/
│   │   │   └── customer.repository.ts     ← interface ICustomerRepository
│   │   └── service/
│   │       └── customer.factory.ts
│   └── customer.module.ts
```

## Provider (DI wiring with environment toggle)

```typescript
// infrastructure/provider/customer.provider.ts
import { CustomerDBRepository } from '../adapter/database/customer.repository';
import { CustomerMockRepository } from '../adapter/mock/customer.repository';

export const CUSTOMER_REPOSITORY_TOKEN = 'customerRepository';

export const customerProvider = {
  provide: CUSTOMER_REPOSITORY_TOKEN,
  useFactory: () => {
    if (process.env.USE_MOCK === 'true') return new CustomerMockRepository();
    return new CustomerDBRepository();
  },
};
```

## Module file (NestJS)

```typescript
// customer.module.ts
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CustomerController } from './presentation/controller/customer.controller';
import { customerProvider } from './infrastructure/provider/customer.provider';
import { CustomerByIdHandler } from './application/query/customer.byId.handler';

@Module({
  imports: [CqrsModule],
  controllers: [CustomerController],
  providers: [customerProvider, CustomerByIdHandler],
})
export class CustomerModule {}
```

## Module dependency rules

```
access ← customer ← shopping
  ↑           ↑
  └── (no cyclic deps allowed) ──┘
```

- `domain` layer: depends on NOTHING (no imports from other layers or modules)
- `application` layer: depends on `domain` only
- `presentation` layer: depends on `application` and `domain`
- `infrastructure` layer: depends on all layers — it wires them together

## Port pattern — abstract class vs interface

```typescript
// domain/port/customer.repository.ts
// Use abstract class when DI injects by class reference (NestJS, Angular)
abstract class CustomerRepositoryPort {
  abstract findById(id: CustomerId): Promise<Customer>;
  abstract save(customer: Customer): Promise<void>;
}

// infrastructure/adapter/database/customer.repository.ts
class TypeORMCustomerRepository extends CustomerRepositoryPort {
  async findById(id: CustomerId): Promise<Customer> {
    const dao = await this.ormRepo.findOne({ where: { id: id.value } });
    if (!dao) throw new CustomerNotFoundError(id.value);
    return dao.toDomain();
  }
  async save(customer: Customer): Promise<void> { ... }
}

// application/testing/in-memory-customer.repository.ts — for tests
class InMemoryCustomerRepository extends CustomerRepositoryPort {
  private store = new Map<string, Customer>();

  async findById(id: CustomerId): Promise<Customer> {
    const c = this.store.get(id.value);
    if (!c) throw new CustomerNotFoundError(id.value);
    return c;
  }

  async save(customer: Customer): Promise<void> {
    this.store.set(customer.id.value, customer);
  }

  all(): Customer[] { return [...this.store.values()]; } // test helper only
}
```

Use `interface` instead of `abstract class` when you don't need class-reference injection. The contract and location rules stay the same.

## Naming rules

| Name | Status | Reason |
|------|--------|--------|
| `customer`, `shopping`, `access` | ✅ Good | Business vocabulary |
| `utils` | ❌ Blocker | No semantic meaning |
| `shared` | ❌ Blocker | Gravity well for everything that doesn't fit |
| `events` | ❌ Blocker | Events belong inside their own Module |
| `shoppingAndCustomer` | ❌ Warning | "and" = two responsibilities |
| `strategy`, `factory` | ❌ Warning | Pattern name, not business name |
