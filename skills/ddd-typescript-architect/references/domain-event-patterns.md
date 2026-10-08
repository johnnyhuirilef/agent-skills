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

- Context is the Module name: singular, lowercase
- Event name is past tense, kebab-case
- Class name is the same name in PascalCase with no `Event` suffix: `AgreementActivated`, `ClientAppSecretRotated`
- Adding an optional field is non-breaking (same version)
- Any other payload change (remove, rename, retype, new required field) bumps `vN`

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

`occurredAt` is passed by the aggregate from its clock; the event never creates it.

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

Inject `EventBusPort` in the Application layer only, never in the domain.

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

Persist THEN publish: publishing first and failing to save emits an event for state that does not exist. `pullDomainEvents()` is destructive; calling it again returns `[]`.

**Delivery guarantee.** If the process crashes between `save` and `publish`, the drained events are lost. To prevent that, write the events to an outbox table in the same transaction as the aggregate and relay them from there. Without an outbox, delivery is at-most-once.

## Typed event registry

```typescript
// domain/events/index.ts
type AgreementEvent = AgreementCreated | AgreementActivated | AgreementArchived;
```

Use the union as the aggregate's event generic and as the `EventBusPort` parameter; it narrows what this context can publish.

## Versioning a breaking change

1. Create a new class, for example `AgreementActivatedV2`, with `EVENT_NAME = 'agreement.agreement-activated.v2'`
2. Keep the old handler alive until every consumer has migrated
3. The aggregate emits v2 from now on
4. Never mutate a published versioned class

Violations and severities: `anti-patterns.md` (AP-12, AP-15, AP-16, AP-21, AP-26, AP-27, AP-29, AP-41).
