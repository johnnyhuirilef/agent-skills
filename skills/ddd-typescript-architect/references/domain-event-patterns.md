Load when: defining, emitting, versioning or publishing Domain Events, or writing the Application Service that persists and publishes them.

# Domain Event Patterns

Rules: `EV-1` to `EV-11` in `hard-rules.md`. The `DomainEvent` base class and the `fromPrimitives` convention are in `base-classes.md`.

## Naming convention

```
<context>.<event-name>.v<N>

agreement.agreement-activated.v1
auth.client-app-secret-rotated.v1
product.product-published.v1
payment.payment-failed.v1
```

- Context is the Module name (singular, lowercase); event name is past tense, kebab-case
- Class name is PascalCase without `Event` suffix: `AgreementActivated`
- Adding an optional field is non-breaking only for tolerant readers
- Never rename a field or change its meaning; any other change bumps `vN`

## Concrete event

```typescript
// domain/events/agreement-activated.ts
type AgreementActivatedPayload = {
  agreementId: string;
  version: number;
  activatedAt: string; // ISO string: primitives only in event payloads
};

class AgreementActivated extends DomainEvent<AgreementActivatedPayload> {
  static readonly EVENT_NAME = 'agreement.agreement-activated.v1';
  readonly eventName = AgreementActivated.EVENT_NAME;

  static fromPrimitives(data: EventPrimitives<AgreementActivatedPayload>): AgreementActivated {
    return new AgreementActivated(data.payload, new Date(data.occurredAt));
  }
}
```

The aggregate passes `occurredAt` from its clock.

## Emitting from the aggregate

```typescript
activate(deps: DomainDeps = systemDeps): void {
  if (this.status !== AgreementStatus.DRAFT) {
    throw new InvalidStateTransitionError(this.status, AgreementStatus.ACTIVE);
  }
  const now = deps.clock.now();
  this.status = AgreementStatus.ACTIVE;
  this.addDomainEvent(
    new AgreementActivated(
      { agreementId: this.id.value, version: this.version.value, activatedAt: now.toISOString() },
      now,
    ),
  );
}
```

Every event class you define must be emitted by some aggregate method (`EV-10`).

## EventBus port

```typescript
// domain/port/event-bus.port.ts
abstract class EventBusPort<Event extends DomainEvent = DomainEvent> {
  abstract publish(events: Event[]): Promise<void>;
}
```

Inject `EventBusPort` in the Application layer only.

## Application Service: load, act, persist, drain, publish

```typescript
// application/command/activate-agreement.handler.ts
class ActivateAgreementHandler {
  constructor(
    private readonly repo: AgreementRepositoryPort,
    private readonly eventBus: EventBusPort<AgreementEvent>,
  ) {}

  async execute(command: ActivateAgreementCommand): Promise<void> {
    const agreement = await this.repo.findById(new AgreementId(command.id));

    agreement.activate(); // the aggregate adds the event internally

    await this.repo.save(agreement); // persist FIRST

    const events = agreement.pullDomainEvents(); // ONE call, drained after save
    await this.eventBus.publish(events);          // publish after persist
  }
}
```

Persist THEN publish integration events: publishing first and failing to save emits an event for state that does not exist. In-process domain-event handlers MAY run before commit when their side effects must share the transaction; record that choice in the Decision Log. `pullDomainEvents()` is destructive; a second call returns `[]`.

**Delivery guarantee.** A crash between `save` and `publish` loses the drained events. Outbox: write the event to an outbox table in the SAME transaction as the aggregate save and relay it from there. Delivery is then at-least-once, so consumers must be idempotent. Without an outbox, delivery is at-most-once.

## Typed event registry

```typescript
// domain/events/index.ts
type AgreementEvent = AgreementCreated | AgreementActivated | AgreementArchived;
```

Use the union as the aggregate's event generic and the `EventBusPort` parameter.

## Domain vs integration events

Same semantics, different implementation. Domain events are in-process, raised by the aggregate, handled in the application layer, sync or async. Integration events cross context or service boundaries, are always async, are published only after commit, and are built by an application handler from a domain event.

## Versioning a breaking change

1. New class, for example `AgreementActivatedV2`, with `EVENT_NAME = 'agreement.agreement-activated.v2'`
2. Keep the old handler until every consumer has migrated
3. The aggregate emits v2 from now on

Upcasting old events on read is an alternative to bumping `vN`.

Violations and severities: `anti-patterns.md` (AP-12, AP-15, AP-16, AP-21, AP-26, AP-27, AP-29, AP-41).
