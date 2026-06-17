# Domain Event Patterns

## Naming convention

```
<bounded-context>.<event-name-kebab-case>.<version>

Examples:
  agreements.agreement-version-activated.v1
  auth.client-app-secret-rotated.v1
  products.product-published.v1
  payments.payment-failed.v1
```

Rules:
- Context is the module name in singular (not plural)
- Event name is past tense, kebab-case
- Version starts at `v1`, increments on breaking payload changes
- Breaking = removing a field, renaming a field, changing a field type
- Non-breaking = adding an optional field (keep same version or bump minor if you track that)

## Canonical abstract base

```typescript
// domain/events/domain-event.base.ts
abstract class DomainEvent<Payload = unknown> {
  static readonly EVENT_NAME: string; // overridden in subclass

  abstract readonly payload: Payload;
  abstract readonly eventName: string;
  abstract readonly occurredAt: Date;

  // Required for deserialization from message broker / event store
  abstract fromPrimitives(data: unknown): DomainEvent<Payload>;
}
```

## Concrete event example

```typescript
// domain/events/agreement-activated.event.ts
type AgreementActivatedPayload = {
  agreementId: string;
  version: number;
  activatedAt: string; // ISO string — primitives only in event payload
};

class AgreementActivatedEvent extends DomainEvent<AgreementActivatedPayload> {
  static readonly EVENT_NAME = 'agreements.agreement-version-activated.v1';

  readonly eventName = AgreementActivatedEvent.EVENT_NAME;
  readonly occurredAt: Date;

  constructor(readonly payload: AgreementActivatedPayload) {
    super();
    this.occurredAt = new Date();
  }

  fromPrimitives(data: unknown): AgreementActivatedEvent {
    return new AgreementActivatedEvent(data as AgreementActivatedPayload);
  }
}
```

## EventBus port (generic — not tied to any library)

```typescript
// domain/port/event-bus.port.ts
abstract class EventBusPort<Event extends DomainEvent = DomainEvent> {
  abstract publish(events: Event[]): Promise<void>;
}
```

Inject EventBusPort via DI in the Application layer — never in the domain layer.

## Full Application Service flow

```typescript
// application/handlers/activate-agreement.handler.ts
class ActivateAgreementHandler {
  constructor(
    private readonly repo: AgreementRepositoryPort,
    private readonly eventBus: EventBusPort<AgreementDomainEvent>,
  ) {}

  async execute(command: ActivateAgreementCommand): Promise<void> {
    const agreement = await this.repo.findById(command.id);

    agreement.activate(); // ← Aggregate adds event to internal list

    await this.repo.save(agreement); // ← persist first

    const events = agreement.pullDomainEvents(); // ← drain (destructive)
    await this.eventBus.publish(events); // ← publish after persist
  }
}
```

> Persist THEN publish. If you publish before persist and the save fails, you've emitted a lie. If you persist and publish fails, the event is re-publishable (idempotency is the consumer's job).

## Typed event registry

When a module has multiple domain events, group them with a union type:

```typescript
// domain/events/index.ts
type AgreementDomainEvent =
  | AgreementCreatedEvent
  | AgreementActivatedEvent
  | AgreementArchivedEvent;
```

Use this union as the generic parameter for `EventBusPort<AgreementDomainEvent>` — narrows what can be published from this context.

## Event versioning migration

When a payload change is breaking:

1. Create a new event class: `AgreementActivatedV2Event` with `EVENT_NAME = '...v2'`
2. Keep the old event handler alive until all consumers are migrated
3. The Aggregate produces v2 going forward — old consumers handle v1 until deprecated
4. Never mutate an existing versioned event class

## Anti-patterns

| Anti-pattern | Severity | Why |
|---|---|---|
| Missing `fromPrimitives()` | WARNING | Breaks deserialization from message broker |
| Event name without version suffix | WARNING | Breaks backward compatibility on payload change |
| Publishing from inside Aggregate | CRITICAL | Domain has side effects — violates purity |
| Injecting EventBus into Aggregate | CRITICAL | Domain depending on infrastructure |
| Mutable event payload fields | BLOCKER | Events must be immutable records of the past |
| `new Date()` inside event without Clock port | WARNING | Not deterministic in tests |
