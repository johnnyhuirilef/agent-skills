Load when: reviewing existing code, or checking generated code against known failure modes.

# Anti-Pattern Detectors

## Severity scale

- **BLOCKER**: breaks a layering, identity, encapsulation or aggregate invariant. Must be fixed before merge.
- **CRITICAL**: serious but contained.
- **WARNING**: smell or risk.
- **SUGGESTION**: optional improvement.

Report each defect at its own table severity. Never escalate a finding because other findings exist. Report only violations of a rule or a row below; anything else goes under at most 3 SUGGESTIONs.

## Detector table

| ID | Anti-pattern | How to detect | Severity | Rule |
|---|---|---|---|---|
| AP-1 | TypeORM `@Entity()` on a domain class | Decorator from the ORM on a class in `domain/`. Cite: *"In TypeORM, the Entity is used as a mapper to a table in the database, but that is not the case with the Entity from DDD. If you use DDD Entity to map it to the database, that is a cardinal error."* | BLOCKER | ENT-2, ENT-3 |
| AP-2 | Domain Service holding Entity/VO state | Field of type Entity or Value Object (shared across requests in a Node singleton) | BLOCKER | DS-1 |
| AP-3 | Domain Service holding indirect state | Any non-`readonly` field: counter, cache, accumulated list, flag | BLOCKER | DS-1, DS-2 |
| AP-4 | Domain Service accumulating output | `this.result = ...` or any write to `this` between calls | BLOCKER | DS-4 |
| AP-5 | Anemic Entity | Public fields and no behavior; logic sits in Application/Infrastructure | BLOCKER | ENT-4 |
| AP-6 | Direct access to Aggregate internals | Outside code reads or mutates `order.items[0]` or an internal Entity | BLOCKER | AGG-2, AGG-9 |
| AP-7 | Partial Aggregate persistence | Repository saves or deletes an internal Entity on its own | BLOCKER | AGG-1, REP-3 |
| AP-8 | Entity calling Repository/DB | Entity imports a repository or DB client | BLOCKER | ENT-10 |
| AP-9 | Catching exceptions inside the domain | `try/catch` or `.catch` that swallows or converts a domain error in `domain/` | BLOCKER | ERR-4 |
| AP-10 | VO with public mutable field | Non-`readonly` field on a Value Object | BLOCKER | VO-1 |
| AP-11 | VO compared by reference | `===` or `==` between Value Objects | BLOCKER | VO-2 |
| AP-12 | Mutable event payload | Event fields or payload not `readonly` | BLOCKER | EV-1 |
| AP-13 | Garbage Module name | Module or folder named `utils`, `helpers`, `shared`, `events` or `common` | BLOCKER | MOD-2 |
| AP-14 | Domain depends outward | `domain/` imports from `application`, `infrastructure`, `presentation`, ORM or framework | BLOCKER | MOD-5 |
| AP-15 | Events published from inside an Aggregate | Aggregate calls `publish` or `emit` | CRITICAL | EV-8 |
| AP-16 | EventBus injected into an Aggregate or Entity | Bus or publisher in a domain constructor or field | CRITICAL | EV-8 |
| AP-17 | VO mutated via public setter | `setX()` or assignment method on a Value Object | CRITICAL | VO-1 |
| AP-18 | Database-assigned id in the domain | Id from `@PrimaryGeneratedColumn`, auto-increment or `RETURNING id` needed before the aggregate exists | CRITICAL | ENT-7 |
| AP-19 | Bare primitive entity id | `id: string` or `id: number` on an Entity, including local ids of internal Entities | CRITICAL | ENT-1 |
| AP-20 | Repository rebuilds with `create` | Adapter calls `create()` or a public constructor to load an aggregate, re-emitting events | CRITICAL | AGG-5, REP-4 |
| AP-21 | Publish before persist | `publish` called before `save` completes | CRITICAL | EV-9, REP-9 |
| AP-22 | Aggregate holds another root by object | Field typed as another Aggregate Root | WARNING | AGG-7 |
| AP-23 | Aggregate too large | 10+ methods or 5+ internal Entities | WARNING | AGG-8 |
| AP-24 | Wrong consistency boundary | Two internal Entities always loaded together but rarely changed together | WARNING | AGG-8 |
| AP-25 | Public constructor on Aggregate Root | `constructor` not `private`; no `create`/`restore` pair | WARNING | AGG-5 |
| AP-26 | Event name breaks the convention | `EVENT_NAME` without `<context>.<event-name>.v<N>`, no version, plural context, or class name with `Event` suffix or not past tense | WARNING | EV-2, EV-3 |
| AP-27 | Missing static `fromPrimitives` | Event class without `static fromPrimitives`, or declared as an instance method | WARNING | EV-5 |
| AP-28 | Raw `Error` from the domain | `throw` of the built-in `Error` constructor in `domain/` | WARNING | ERR-1 |
| AP-29 | System clock in the domain | No-argument `Date` constructor, `Date.now()` or `Math.random` in `domain/`, events included | WARNING | AGG-6, EV-6, DS-8 |
| AP-30 | VO logic moved to Entity | Entity or service implements a rule about a value that the VO should own | WARNING | VO-7 |
| AP-31 | Non-unidirectional Module deps | Import cycle between Modules | WARNING | MOD-4 |
| AP-32 | Validation outside the VO constructor | Callers validate before `new VO(...)`; constructor does not validate | WARNING | VO-3 |
| AP-33 | Collaborator field not `readonly` | Injected field in a Domain Service lacks `readonly` | WARNING | DS-3 |
| AP-34 | Domain Service doing application work | Authorization, session parsing or HTTP in a Domain Service | WARNING | DS-5 |
| AP-35 | Behavior extracted without need | Domain Service for logic involving a single Entity | WARNING | DS-6 |
| AP-36 | Entity logic in Application/Infrastructure | Service computes or checks a rule over one Entity's state | WARNING | ENT-11 |
| AP-37 | HTTP status in a DomainError | `statusCode` or numeric HTTP code on an error class in the domain | WARNING | ERR-5 |
| AP-38 | Swallowing catch-all | Generic `catch (e)` in the Application layer that hides domain errors | WARNING | ERR-6 |
| AP-39 | Shared error module | One `errors/` module for every context | WARNING | MOD-9, ERR-3 |
| AP-40 | Pattern or conjunction Module name | `shoppingAndCustomer`, `strategy`, `factory` | WARNING | MOD-3 |
| AP-41 | Events defined but never emitted | Event class with no `addDomainEvent` caller | WARNING | EV-10 |
| AP-42 | Mock adapter in infrastructure | `infrastructure/adapter/mock` or `process.env` toggle in a provider | WARNING | MOD-7 |
| AP-43 | Two not-found contracts | Repository port returning `null`/`Result` while others throw | WARNING | REP-2 |
| AP-44 | Fake out of contract | InMemory fake not extending the port, or not throwing the same errors | WARNING | REP-6, REP-7 |
| AP-45 | Kernel member not public | `Entity.id` or `ValueObject.value` declared `protected` | WARNING | VO-2, ENT-1 |
| AP-46 | Primitive obsession | Primitives with rules or that always travel together | SUGGESTION | VO-8 |
