Load when: about to write or change domain code (any pattern), or when a review finding needs its rule ID.

# Hard Rules

Every rule is MUST / MUST NOT unless it says SHOULD. Cite rules by ID. Kernel types are defined in `base-classes.md`. Detectors and severities for violations are in `anti-patterns.md`.

## Value Object

| ID | Rule | Failure it prevents |
|---|---|---|
| VO-1 | MUST be immutable: every field `readonly`, no setters, no public mutable fields. | Shared mutation, broken equality |
| VO-2 | MUST extend `ValueObject<T>` and compare with `isEqual()` by value, never `===`. | Two equal values treated as different |
| VO-3 | MUST validate in the constructor, by calling a validation helper from it, and throw `DomainValidationError`. | Invalid instances existing |
| VO-4 | MUST NOT hold an identity field. | VO silently becoming an Entity |
| VO-5 | Any "mutation" (`add`, `withX`) MUST return a new instance. | Aliasing bugs |
| VO-6 | MUST live in the domain layer. | Domain depending on outer layers |
| VO-7 | Rules and operations about a value MUST live on the VO, not in an Entity or service. | Logic leaking out of the VO |
| VO-8 | SHOULD replace a primitive with a VO when it has validation rules, domain operations, or always travels with another primitive. | Invalid states, duplicated validation |
| VO-9 | A group of VOs that only make sense together MUST be a `ContextObject` that extends `ValueObject`. | Half-valid clusters |

## Entity

| ID | Rule | Failure it prevents |
|---|---|---|
| ENT-1 | MUST have an identity typed as a Value Object (`public readonly id`), including the local ids of internal entities. Never a bare primitive or object reference. | Mixed-up ids, no id validation |
| ENT-2 | MUST live in the domain layer. A class decorated with the TypeORM `@Entity()` is a DAO, not a DDD Entity. | Persistence mapper mistaken for domain model |
| ENT-3 | MUST NOT mirror the database schema; the DAO does that. | Schema dictating the model |
| ENT-4 | MUST encapsulate behavior in methods; fields are private, no raw field exposed for external mutation. | Anemic model |
| ENT-5 | MUST validate state on every mutation method. | Invariants broken after construction |
| ENT-6 | SHOULD push cross-Entity logic to a Domain Service. | Entities coupled to each other |
| ENT-7 | Ids MUST be application-generated (`IdGenerator`) or natural, before persistence. A database-assigned id MUST NOT enter the domain. | Domain depending on the DB to exist |
| ENT-8 | Identity kinds: application-generated (UUID/ULID), natural (IBAN), composite. All are VOs. | Untyped identity |
| ENT-9 | Non-root entities SHOULD use a private constructor with `create`/`restore`. A public constructor is allowed only because TypeScript has no package-private visibility, and only if the entity is not exported from the Module and only its root instantiates it. | Outside code creating internals |
| ENT-10 | MUST NOT import a Repository or call the DB. | Domain depending on infrastructure |
| ENT-11 | Rules about an entity's own state MUST live in the entity, not in Application or Infrastructure services. | Logic leaked out of the model |

## Domain Service

| ID | Rule | Failure it prevents |
|---|---|---|
| DS-1 | MUST be stateless: no mutable instance field, direct (Entity, VO, primitive) or indirect (cache, counter, accumulated list, flag). | State shared across requests in a Node singleton |
| DS-2 | The only fields allowed are injected stateless collaborators: ports, other Domain Services, factories, configuration. | Hidden state |
| DS-3 | Collaborator fields MUST be `readonly`. | Reassignment after construction |
| DS-4 | Results MUST be returned, never stored on `this`. | Cross-call leakage |
| DS-5 | MUST NOT handle sessions, HTTP, UI, authorization or migrations. | Application concerns in the domain |
| DS-6 | SHOULD exist only for logic spanning several Entities/VOs or with no natural home; otherwise keep it in the Entity. | Anemic model |
| DS-7 | MUST call only methods that exist on the declared port. | Examples and code that do not compile |
| DS-8 | Time and ids MUST come from `Clock` / `IdGenerator`, never the system. | Non-deterministic tests |

## Domain Event

| ID | Rule | Failure it prevents |
|---|---|---|
| EV-1 | MUST be immutable: all fields and the payload `readonly`. | History rewritten |
| EV-2 | Class name MUST be past tense without a suffix: `OrderCreated`, not `OrderCreatedEvent`. | Commands mistaken for facts |
| EV-3 | MUST carry `static EVENT_NAME` as `<context>.<event-name>.v<N>`: context singular lowercase, event name kebab-case. | Unroutable, unversioned events |
| EV-4 | Adding an optional payload field is non-breaking. Any other payload change MUST bump `vN` as a new class; never mutate a published version. | Consumers broken silently |
| EV-5 | MUST declare `static fromPrimitives(data)` on each concrete event class (not an abstract instance method). | Broken deserialization |
| EV-6 | MUST be created inside Aggregates via `addDomainEvent`; `occurredAt` comes from the aggregate's clock. | Events from outside the invariant |
| EV-7 | Payload MUST hold primitives only (`ToPrimitives`). | Domain objects leaking over the wire |
| EV-8 | MUST be published only from the Application layer; Aggregates and Entities MUST NOT hold an EventBus. | Domain with side effects |
| EV-9 | `pullDomainEvents()` MUST be called once, after a successful `save`, then published. A crash between save and publish loses events unless an outbox is used. | Emitting events for state that was never saved |
| EV-10 | Every event class defined MUST be emitted by some Aggregate method. | Dead contracts |
| EV-11 | A Module SHOULD group its events in a union type used as the aggregate's event generic. | Untyped event bus |

## Aggregate

| ID | Rule | Failure it prevents |
|---|---|---|
| AGG-1 | MUST be persisted and deleted as a whole. | Torn consistency |
| AGG-2 | Outside code MUST go through the root and hold no reference to internal Entities. | Bypassed invariants |
| AGG-3 | The root has a global identity VO; internal Entities have local identity VOs never referenced externally. | Identity leaks |
| AGG-4 | MUST enforce all business invariants on every state change. | Invalid aggregate state |
| AGG-5 | Root MUST have a private constructor, `static create(...)` (validates, emits events) and `static restore(snapshot)` (rebuilds from persisted state, emits nothing, used by repositories). | Public construction, spurious events on load |
| AGG-6 | `create` and time/id-dependent methods take `deps: DomainDeps = systemDeps`; no system clock calls in the domain. | Untestable time |
| AGG-7 | MUST reference another Aggregate Root by its id VO, never by object. Coordinate through a minimal snapshot. | Cross-aggregate coupling |
| AGG-8 | SHOULD stay small: 10+ methods or 5+ internal Entities means question the boundary. Entities that do not change together in one transaction belong in separate Aggregates. | Oversized transactional boundary |
| AGG-9 | Internal collections MUST NOT be returned mutable; expose queries or copies. | `order.items[0]` mutated from outside |
| AGG-10 | Aggregates expose `toPrimitives()` for snapshots; the inverse is `restore`. | Ad hoc mapping |

## Module

| ID | Rule | Failure it prevents |
|---|---|---|
| MOD-1 | At most 4 base folders: `domain`, `application`, `presentation`, `infrastructure`. | Layer sprawl |
| MOD-2 | Names MUST come from Ubiquitous Language. `utils`, `helpers`, `shared`, `events`, `common` are BLOCKER names. | Garbage-collector modules |
| MOD-3 | Names SHOULD NOT contain "and" or be pattern names (`strategy`, `factory`). | Mixed responsibilities |
| MOD-4 | Dependencies between Modules MUST be unidirectional and acyclic. | Cyclic coupling |
| MOD-5 | `domain` imports nothing; `application` imports `domain`; `presentation` imports `application` and `domain`; `infrastructure` imports all. | Inverted dependencies |
| MOD-6 | The Repository Port lives in `domain/port/`; its Adapter in `infrastructure/adapter/`. | Domain knowing the DB |
| MOD-7 | InMemory fakes live in `application/testing/`. No mock adapter in infrastructure, no `process.env` switch in providers. | Test code in production wiring |
| MOD-8 | Each Module SHOULD have a `*.module.ts` declaring DI bindings. | Scattered wiring |
| MOD-9 | Module errors live in `domain/errors/`, events in `domain/events/`. `DomainError` and generic errors live in the kernel. | Shared error dumping ground |
| MOD-10 | Kernel base classes live in `src/kernel/domain/` and hold no business concepts. | Kernel growing into `shared` |

## Domain Errors

| ID | Rule | Failure it prevents |
|---|---|---|
| ERR-1 | The domain MUST throw `DomainError` subclasses, never the built-in `Error`. | Untyped failures |
| ERR-2 | Use `DomainValidationError` for invalid input/VO construction, `DomainBusinessError` for broken invariants or state rules, `NotFoundError` for missing aggregates. Subclass when callers must tell cases apart. | Callers parsing messages |
| ERR-3 | Codes follow `<category>.<name>` with categories `resource`, `business`, `concurrency`, `external`, `validation`, `auth`, `system`. | Inconsistent codes |
| ERR-4 | The domain MUST NOT catch or swallow its own errors. | Masked invariant violations |
| ERR-5 | `DomainError` classes MUST NOT carry HTTP status codes; mapping happens in presentation. | Transport leaking into domain |
| ERR-6 | The Application layer maps errors; no catch-all that swallows domain errors. | Silent contract breaks |
| ERR-7 | Infrastructure failures are wrapped by adapters as `ExternalServiceError` or `SystemError`. | Driver errors reaching the domain |

## Repositories, ports and fakes

| ID | Rule | Failure it prevents |
|---|---|---|
| REP-1 | Ports are `abstract class` (DI token) by default; `interface` only when the codebase already uses interfaces for ports. | Mixed styles, no DI token |
| REP-2 | Repository ports THROW typed errors: `findById` throws a `NotFoundError` subclass for a missing aggregate. Use `exists(id)` for checks. No `null` or `Result` returns on the same port. | Two not-found contracts |
| REP-3 | One repository per Aggregate Root; `save` and `delete` handle the whole aggregate. | Partial persistence |
| REP-4 | Repositories rebuild aggregates with `restore`, never `create`. | Events re-emitted on load |
| REP-5 | Ports MUST expose only domain types, never DAOs or ORM types. | ORM leaking into the domain |
| REP-6 | InMemory fakes MUST extend the same port as the real adapter. | Fake drifting from contract |
| REP-7 | Fakes MUST throw the same typed errors as the real adapter. | Tests passing on wrong behavior |
| REP-8 | Test-only helpers (`all()`) stay on the fake, not on the port; use `Map` keyed by `id.value`. | Port polluted by test needs |
| REP-9 | The Application Service order is: load, call behavior, `save`, `pullDomainEvents`, publish. | Lying events |
