Load when: creating or reviewing a Module, its folder layout, DI wiring, layer dependencies or Module naming.

# Module Structure

Rules: `MOD-1` to `MOD-10` in `hard-rules.md`.

## Canonical folder layout (NestJS example)

```
src/
├── kernel/                                    ← shared kernel: base classes, Clock, DomainError (no business concepts)
│   └── domain/
│       ├── value-object.ts, entity.ts, aggregate-root.ts, domain-event.ts
│       ├── clock.ts
│       └── domain-error.ts                    ← DomainError + generic errors
├── customer/
│   ├── infrastructure/
│   │   ├── provider/
│   │   │   └── customer.provider.ts           ← DI binding: real adapter only
│   │   └── adapter/
│   │       └── database/
│   │           ├── customer.repository.ts     ← implements the port
│   │           └── customer.dao.ts            ← TypeORM @Entity() lives here
│   ├── presentation/
│   │   └── controller/
│   │       └── customer.controller.ts
│   ├── application/
│   │   ├── query/
│   │   │   ├── customer.byId.handler.ts
│   │   │   └── customer.byId.query.ts
│   │   ├── command/
│   │   │   ├── customer.create.handler.ts
│   │   │   └── customer.create.command.ts
│   │   └── testing/
│   │       └── in-memory-customer.repository.ts   ← fake, extends the port
│   ├── domain/
│   │   ├── model/customer.entity.ts           ← DDD Entity, no ORM decorators
│   │   ├── port/customer.repository.ts        ← abstract class port
│   │   ├── service/customer.factory.ts
│   │   ├── events/customer-created.ts
│   │   └── errors/customer.errors.ts          ← module errors
│   └── customer.module.ts
```

Where things go: module errors in `domain/errors/`, module events in `domain/events/`, fakes in `application/testing/`, `DomainError` and generic errors in `kernel/domain/`.

## Provider

The provider binds the real adapter. Tests build their own testing module with the fake from `application/testing/`; there is no mock adapter and no `process.env` switch.

```typescript
// infrastructure/provider/customer.provider.ts
export const customerProvider = {
  provide: CustomerRepositoryPort,           // abstract class used as the DI token
  useClass: TypeORMCustomerRepository,
};
```

## Module file (NestJS)

```typescript
// customer.module.ts
@Module({
  imports: [CqrsModule],
  controllers: [CustomerController],
  providers: [customerProvider, CustomerByIdHandler],
})
export class CustomerModule {}
```

## Module dependency rules

```
access ← customer ← shopping       (arrows point to the dependency; no cycles)
```

- `domain` layer: depends on NOTHING (no imports from other layers or Modules)
- `application` layer: depends on `domain` only
- `presentation` layer: depends on `application` and `domain`
- `infrastructure` layer: depends on all layers; it wires them together

## Ports

Port declaration style (abstract class by default, interface only when the codebase already uses them), the adapter example and InMemory fakes: `domain-service-and-testing.md`.

## Naming rules

| Name | Severity | Reason |
|---|---|---|
| `customer`, `shopping`, `access` | OK | Business vocabulary |
| `utils`, `helpers`, `shared`, `common` | BLOCKER | No semantic meaning; gravity well for everything that does not fit |
| `events` | BLOCKER | Events belong inside their own Module |
| `shoppingAndCustomer` | WARNING | "and" means two responsibilities |
| `strategy`, `factory` | WARNING | Pattern name, not a business name |

The kernel folder is the only shared place, is not a Module, and holds only base classes (`MOD-10`).
