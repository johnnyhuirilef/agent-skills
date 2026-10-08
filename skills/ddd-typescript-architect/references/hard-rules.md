Load when: about to write or change domain code (any pattern), or when a review finding needs its rule ID.

# Hard Rules

Basis tags: `[canon]` = stated by Evans/Vernon/Fowler/Microsoft guide; `[practice]` = widely used, not canon; `[convention]` = this skill's choice, follow unless the project differs.

Rules are MUST / MUST NOT unless marked SHOULD. Cite by ID. Kernel types: `base-classes.md`. Detectors and severities: `anti-patterns.md`.

## Value Object

| ID | Rule | Failure it prevents |
|---|---|---|
| VO-1 [canon] | MUST be immutable: every field `readonly`, no setters, no public mutable fields. | Shared mutation, broken equality |
| VO-2 [convention] | Equality MUST be by value, never `===`. `extends ValueObject<T>` / `isEqual()` is this skill's implementation. | Two equal values treated as different |
| VO-3 [practice] | MUST validate in the constructor, by calling a validation helper from it, and throw `DomainValidationError`. | Invalid instances existing |
| VO-4 [canon] | MUST NOT hold an identity field. | VO silently becoming an Entity |
| VO-5 [canon] | Any "mutation" (`add`, `withX`) MUST return a new instance. | Aliasing bugs |
| VO-6 [practice] | MUST live in the domain layer. | Domain depending on outer layers |
| VO-7 [practice] | Rules and operations about a value MUST live on the VO. | Logic leaking out of the VO |
| VO-8 [practice] | SHOULD replace a primitive with a VO when it has validation rules, domain operations, or always travels with another primitive. | Invalid states, duplicated validation |
| VO-9 [convention] | A group of VOs that only make sense together MUST be a composite VO (`ContextObject` is this skill's term) that extends `ValueObject`. | Half-valid clusters |

## Entity

| ID | Rule | Failure it prevents |
|---|---|---|
| ENT-1 [practice] | SHOULD have an identity typed as a Value Object (`public readonly id`), including local ids of internal entities, not a bare primitive. | Mixed-up ids, no id validation |
| ENT-2 [practice] | MUST live in the domain layer. A class with ORM decorators does not belong in the domain layer. | Persistence mapper mistaken for domain model |
| ENT-3 [practice] | MUST NOT mirror the database schema; the DAO does that. | Schema dictating the model |
| ENT-4 [canon] | MUST encapsulate behavior in methods; fields are private, no raw field exposed for external mutation. | Anemic model |
| ENT-5 [practice] | MUST validate state on every mutation method. | Invariants broken after construction |
| ENT-6 [practice] | SHOULD push cross-Entity logic to a Domain Service. | Entities coupled to each other |
| ENT-7 [practice] | Ids SHOULD be application-generated (`IdGenerator`) or natural. A DB-assigned id is allowed when its cost is accepted (see `entity-patterns.md`) and construction does not need the id. | Domain depending on the DB to exist |
| ENT-8 [practice] | Identity kinds: application-generated (UUID/ULID), natural (IBAN), composite. All are VOs. | Untyped identity |
| ENT-9 [convention] | Non-root entities SHOULD use a private constructor with `create`/`restore`. A public constructor is allowed (TypeScript has no package-private visibility) only if the entity is not exported from the Module and only its root instantiates it. | Outside code creating internals |
| ENT-10 [canon] | MUST NOT import a Repository or call the DB. | Domain depending on infrastructure |
| ENT-11 [canon] | Rules about an entity's own state MUST live in the entity, not in Application or Infrastructure services. | Logic leaked out of the model |

## Domain Service

| ID | Rule | Failure it prevents |
|---|---|---|
| DS-1 [canon] | MUST be stateless: no mutable instance field, direct (Entity, VO, primitive) or indirect (cache, counter, accumulated list, flag). | State shared across requests in a Node singleton |
| DS-2 [practice] | The only fields allowed are injected stateless collaborators: ports, other Domain Services, factories, configuration. | Hidden state |
| DS-3 [practice] | Collaborator fields MUST be `readonly`. | Reassignment after construction |
| DS-4 [practice] | Results MUST be returned, not stored on `this`. | Cross-call leakage |
| DS-5 [canon] | MUST NOT handle sessions, HTTP, UI, authorization or migrations. | Application concerns in the domain |
| DS-6 [canon] | SHOULD exist only for logic spanning several Entities/VOs or with no natural home; otherwise keep it in the Entity. | Anemic model |
| DS-7 [practice] | MUST call only methods that exist on the declared port. | Examples and code that do not compile |
| DS-8 [convention] | Time and ids MUST come from `Clock` / `IdGenerator`, never the system. | Non-deterministic tests |

## Domain Event

| ID | Rule | Failure it prevents |
|---|---|---|
| EV-1 [canon] | MUST be immutable: all fields and the payload `readonly`. | History rewritten |
| EV-2 [convention] | Class name MUST be past tense without a suffix: `OrderCreated`, not `OrderCreatedEvent`. | Commands mistaken for facts |
| EV-3 [convention] | MUST carry `static EVENT_NAME` as `<context>.<event-name>.v<N>`: context singular lowercase, event name kebab-case. | Unroutable, unversioned events |
| EV-4 [practice] | Adding an optional field is non-breaking only for tolerant readers. Never rename a field or change its meaning; any other change bumps `vN` as a new class. Never mutate a published version. | Consumers broken silently |
| EV-5 [convention] | MUST declare `static fromPrimitives(data)` on each concrete event class (not an abstract instance method). | Broken deserialization |
| EV-6 [practice] | MUST be created inside Aggregates via `addDomainEvent`; `occurredAt` comes from the aggregate's clock. | Events from outside the invariant |
| EV-7 [practice] | Payload MUST hold primitives only (`ToPrimitives`). | Domain objects leaking over the wire |
| EV-8 [practice] | MUST be published only from the Application layer; Aggregates and Entities MUST NOT hold an EventBus or dispatcher. | Domain with side effects |
| EV-9 [practice] | Integration events MUST be published only after the aggregate is persisted: call `pullDomainEvents()` once after a successful `save`, then publish. In-process domain-event handlers MAY run before commit when their effects must share the transaction (Decision Log). A crash between save and publish loses events unless an outbox is used. | Emitting events for state that was never saved |
| EV-10 [convention] | Every event class defined MUST be emitted by some Aggregate method. | Dead contracts |
| EV-11 [convention] | A Module SHOULD group its events in a union type used as the aggregate's event generic. | Untyped event bus |

## Aggregate

| ID | Rule | Failure it prevents |
|---|---|---|
| AGG-1 [canon] | MUST be persisted and deleted as a whole. | Torn consistency |
| AGG-2 [canon] | Outside code MUST go through the root and hold no reference to internal Entities. | Bypassed invariants |
| AGG-3 [practice] | The root has a global identity VO; internal Entities have local identity VOs never referenced externally. | Identity leaks |
| AGG-4 [canon] | MUST enforce all business invariants on every state change. | Invalid aggregate state |
| AGG-5 [convention] | Root MUST have a private constructor, `static create(...)` (validates, emits events) and `static restore(snapshot)` (rebuilds from persisted state, emits nothing, used by repositories). | Public construction, spurious events on load |
| AGG-6 [convention] | `create` and time/id-dependent methods take `deps: DomainDeps = systemDeps`; no system clock calls in the domain. | Untestable time |
| AGG-7 [practice] | SHOULD reference other roots by id VO, not by object. A minimal snapshot for coordination is a convention. | Cross-aggregate coupling |
| AGG-8 [practice] | SHOULD stay small: include only data that must be consistent in one transaction. Split when parts need not change atomically or concurrent edits conflict. Method or entity counts alone are not a signal. | Oversized transactional boundary |
| AGG-9 [practice] | Internal collections MUST NOT be returned mutable. | `order.items[0]` mutated from outside |
| AGG-10 [convention] | Aggregates expose `toPrimitives()` for snapshots; the inverse is `restore`. | Ad hoc mapping |
| AGG-11 [practice] | One aggregate per transaction. Cross-aggregate effects use domain events (eventual consistency). If a use case genuinely needs two aggregates in one transaction, record it as a Decision Log item. | Distributed invariants |

## Module

| ID | Rule | Failure it prevents |
|---|---|---|
| MOD-1 [convention] | At most 4 base folders: `domain`, `application`, `presentation`, `infrastructure`. | Layer sprawl |
| MOD-2 [canon] | Names MUST come from Ubiquitous Language (principle canon, banned list practice). `utils`, `helpers`, `shared`, `events`, `common` are banned names for a business Module; `domain/events/` and `domain/errors/` folders inside a module are fine (MOD-9). | Garbage-collector modules |
| MOD-3 [convention] | Names SHOULD NOT contain "and" or be pattern names. | Mixed responsibilities |
| MOD-4 [practice] | Dependencies between Modules MUST be unidirectional and acyclic. | Cyclic coupling |
| MOD-5 [canon] | `domain` imports nothing; `application` imports `domain`; `presentation` imports `application` and `domain`; `infrastructure` imports all. | Inverted dependencies |
| MOD-6 [convention] | The Repository Port lives in `domain/port/`; its Adapter in `infrastructure/adapter/`. | Domain knowing the DB |
| MOD-7 [convention] | InMemory fakes live in `application/testing/`. No mock adapter in infrastructure, no `process.env` switch in providers. | Test code in production wiring |
| MOD-8 [convention] | Each Module SHOULD have a `*.module.ts` declaring DI bindings. | Scattered wiring |
| MOD-9 [practice] | Module errors live in `domain/errors/`, events in `domain/events/`. `DomainError` and generic errors live in the technical kernel. | Shared error dumping ground |
| MOD-10 [convention] | Technical kernel lives in `src/kernel/domain/` and holds no business concepts. | Kernel growing into `shared` |

## Domain Errors

| ID | Rule | Failure it prevents |
|---|---|---|
| ERR-1 [convention] | The domain MUST throw `DomainError` subclasses, never the built-in `Error`. Typed throws are this skill's convention; Result/Either is equally valid. Do not mix both on one port. | Untyped failures |
| ERR-2 [convention] | Use `DomainValidationError` for invalid input/VO construction, `DomainBusinessError` for broken invariants or state rules, `NotFoundError` for missing aggregates. Subclass when callers must tell cases apart. | Callers parsing messages |
| ERR-3 [convention] | Codes follow `<category>.<name>` with categories `resource`, `business`, `concurrency`, `external`, `validation`, `auth`, `system`. | Inconsistent codes |
| ERR-4 [practice] | The domain MUST NOT swallow a DomainError. Catching to translate or rethrow a more specific error at a boundary is allowed. | Masked invariant violations |
| ERR-5 [canon] | `DomainError` classes MUST NOT carry HTTP status codes; mapping happens in presentation. | Transport leaking into domain |
| ERR-6 [practice] | The Application layer maps errors; no catch-all that swallows domain errors. | Silent contract breaks |
| ERR-7 [practice] | Infrastructure failures are wrapped by adapters as `ExternalServiceError` or `SystemError`. | Driver errors reaching the domain |
| ERR-8 [practice] | Guard vs validate: input validation (shape, types) lives at the presentation/application edge; invariants are guarded inside the domain. Never put zod/class-validator decorators on domain classes. | Framework coupling, duplicated checks |

## Repositories, ports and fakes

| ID | Rule | Failure it prevents |
|---|---|---|
| REP-1 [convention] | In NestJS/DI-container projects use an abstract class (it doubles as the injection token); otherwise interface plus a Symbol token is equally valid. Follow the project's existing style. | Mixed styles, no DI token |
| REP-2 [convention] | One not-found contract per codebase. This skill throws a `NotFoundError` subclass from `findById`; `exists(id)` is a convenience. | Two not-found contracts |
| REP-3 [canon] | One repository per Aggregate Root; `save` and `delete` handle the whole aggregate. | Partial persistence |
| REP-4 [practice] | Repositories rebuild aggregates with `restore`, never `create`. | Events re-emitted on load |
| REP-5 [canon] | Ports MUST expose only domain types, never DAOs or ORM types. | ORM leaking into the domain |
| REP-6 [practice] | InMemory fakes MUST extend the same port as the real adapter. | Fake drifting from contract |
| REP-7 [practice] | Fakes MUST throw the same typed errors as the real adapter. | Tests passing on wrong behavior |
| REP-8 [practice] | Test-only helpers (`all()`) stay on the fake, not on the port; use `Map` keyed by `id.value`. | Port polluted by test needs |
| REP-9 [practice] | Application Service order: load, call behavior, `save`, `pullDomainEvents`, publish (EV-9). | Lying events |
