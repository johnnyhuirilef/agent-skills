Load when: creating or reviewing a Module, its folder layout, DI wiring, layer dependencies or Module naming.

# Module Structure

Rules: `MOD-1` to `MOD-10` in `hard-rules.md`.

## Canonical folder layout (NestJS example)

```
src/
├── kernel/                                    ← technical kernel (building blocks): base classes, Clock, DomainError
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

Module errors: `domain/errors/`; events: `domain/events/`; fakes: `application/testing/`; `DomainError` and generic errors: `kernel/domain/`.

Queries (read models) MAY read the database directly and skip domain/repository, but never mutate state.

## Provider

The provider binds the real adapter. Tests build their own testing module with the fake from `application/testing/`; no mock adapter, no `process.env` switch.

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

Layer imports follow `MOD-5`: `domain` imports nothing; `infrastructure` wires all layers.

## Ports

Port style, adapter example and InMemory fakes: `domain-service-and-testing.md`.

## Naming rules

| Name | Severity | Reason |
|---|---|---|
| `customer`, `shopping`, `access` | OK | Business vocabulary |
| `utils`, `helpers`, `shared`, `common` | CRITICAL | No semantic meaning; gravity well for everything that does not fit |
| `events` | CRITICAL | Events belong inside their own Module |
| `shoppingAndCustomer` | WARNING | "and" means two responsibilities |
| `strategy`, `factory` | WARNING | Pattern name, not a business name |

The kernel folder is the only shared place, is not a Module, and holds only technical building blocks (`MOD-10`).

## Strategic scope

A Module groups cohesive concepts under a Ubiquitous Language name. A top-level module folder is a pragmatic stand-in for a Bounded Context in a modular monolith, but a Bounded Context is a language/model boundary. Create a new one when the same term means different things (Order in Shipping vs Billing), another team or model owns it, or two parts need different models of one entity. Between contexts choose an explicit relationship (Customer/Supplier, Conformist, Anti-Corruption Layer, Open Host Service + Published Language, Shared Kernel, Separate Ways). Cross-context calls go through a port, never the other context's domain classes.
