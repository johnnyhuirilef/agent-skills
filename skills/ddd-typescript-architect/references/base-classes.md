Load when: writing or reviewing code that extends ValueObject, Entity, AggregateRoot or DomainEvent, or that needs Clock, IdGenerator, DomainDeps or ToPrimitives.

# Shared Domain Kernel

**If the user's project already has its own kernel** (their `ValueObject`, `Entity`, `Clock`, `DomainDeps`), follow it and do not redefine it. Where it differs from this file (for example `value` is `protected`), read through the accessors it offers (getters, `toPrimitives()`) and list each difference under Assumptions. The definitions below are the default when no kernel exists.

The kernel is the one place these base types are defined. It lives in `src/kernel/domain/` (not a business Module: no layers, no business concepts, only the types below plus `DomainError`, see `domain-errors.md`). Never name it `shared` or `common`.

## Time and ids

Domain code never reads the system clock or generates ids directly. It receives them through `DomainDeps`.

```typescript
// kernel/domain/clock.ts
interface Clock {
  now(): Date;
}

// The only place that touches the system clock.
const systemClock: Clock = { now: () => new Date(Date.now()) };

interface IdGenerator {
  generate(): string; // UUID or ULID, application-generated
}

interface DomainDeps {
  clock: Clock;
  idGenerator: IdGenerator;
}

// Default deps for production. Tests pass fakes (see domain-service-and-testing.md).
// `systemIdGenerator` is the kernel's UUID/ULID implementation of IdGenerator.
const systemDeps: DomainDeps = { clock: systemClock, idGenerator: systemIdGenerator };
```

Aggregates take `deps: DomainDeps = systemDeps` on every method that needs time or a new id.

## ValueObject, Entity, AggregateRoot

`ValueObject.value` and `Entity.id` are `public readonly`: callers read `sku.value` and `agreement.id.value` from outside the class. Do not declare them `protected`.

```typescript
abstract class ValueObject<T> {
  constructor(public readonly value: T) {}

  isEqual(other: ValueObject<T>): boolean {
    return this.constructor === other.constructor && deepEqual(this.value, other.value);
  }
}

abstract class Entity<Id extends ValueObject<unknown>> {
  constructor(public readonly id: Id) {}

  isEqual(other: Entity<Id>): boolean {
    return this.id.isEqual(other.id);
  }
}

abstract class AggregateRoot<Id extends ValueObject<unknown>, Event extends DomainEvent> extends Entity<Id> {
  private domainEvents: Event[] = [];

  protected addDomainEvent(event: Event): void {
    this.domainEvents.push(event);
  }

  // One-shot and destructive: the second call returns [].
  pullDomainEvents(): Event[] {
    const events = [...this.domainEvents];
    this.domainEvents = [];
    return events;
  }
}
```

`deepEqual` is a kernel function (any deep-equality implementation). The domain layer imports nothing from outside the kernel.

Concrete aggregates declare a private constructor and expose `create` and `restore` (rules `AGG-5`, `AGG-6` in `hard-rules.md`).

## DomainEvent

```typescript
abstract class DomainEvent<Payload extends object = object> {
  abstract readonly eventName: string;

  constructor(
    readonly payload: Readonly<Payload>,
    readonly occurredAt: Date, // supplied by the aggregate's clock, never created here
  ) {}

  toPrimitives(): EventPrimitives<Payload> {
    return { eventName: this.eventName, occurredAt: this.occurredAt.toISOString(), payload: this.payload };
  }
}

type EventPrimitives<Payload> = { eventName: string; occurredAt: string; payload: Payload };
```

**`fromPrimitives` convention.** TypeScript cannot declare an abstract static member, so the contract is a convention checked in review (`EV-5`): every concrete event class declares

```typescript
static readonly EVENT_NAME = '<context>.<event-name>.v<N>';
static fromPrimitives(data: EventPrimitives<Payload>): ThisEvent
```

A full concrete event is in `domain-event-patterns.md`.

## ToPrimitives and `toPrimitives()`

`ToPrimitives<T>` recursively unwraps `ValueObject<T>.value` into plain data for DTOs, snapshots, event payloads and persistence mappers.

```typescript
type ToPrimitives<T> = T extends ValueObject<infer V>
  ? ToPrimitives<V>
  : T extends Date
  ? string
  : T extends object
  ? { [K in keyof T]: ToPrimitives<T[K]> }
  : T;
```

**Naming convention.** The instance method that produces primitives is always called `toPrimitives()`. The inverse is `static restore(snapshot)` on aggregates and entities, and the constructor on value objects. Apply `ToPrimitives<T>` to value objects and plain snapshot types, not to whole entities (their methods are not data).

```typescript
type AgreementSnapshot = { id: string; status: string; version: number };

class Agreement extends AggregateRoot<AgreementId, AgreementEvent> {
  toPrimitives(): AgreementSnapshot {
    return { id: this.id.value, status: this.status, version: this.version.value };
  }
}
```
