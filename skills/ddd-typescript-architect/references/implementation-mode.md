Load when: the user asks to create or change domain code, or a "refactor" request has finished its brief review.

# Implementation Mode

The mode gate itself is in `SKILL.md`. This file holds the Ambiguity Gate, the two turns, the non-interactive fallback, the Decision Log and the internal checklist. Rules are in `hard-rules.md`; kernel types in `base-classes.md`.

## Non-interactive fallback

If no user can answer (evaluation, CI, subagent), or the prompt already answers a gate question, state your assumptions in one short list and proceed. Never stop to wait in that case.

## Ambiguity Gate

Before writing code, check these. If one is unclear, ask ONE question at a time and wait.

| Question | Ask only if |
|---|---|
| Bounded Context / Module name? | Unclear |
| Aggregate Root that owns this behavior? | Unclear |
| Business invariants to enforce? | Unclear |
| Domain Events produced? | Events are involved. Skip when no events are involved |

In the non-interactive fallback, do not ask: state the assumption for each unclear item and continue.

## Turn 1: Domain model (then STOP)

Present: Value Objects, Entity/Aggregate structure with identity strategy, Domain Error types, Domain Events (name and payload). Then ask: "Does this domain model reflect the business correctly? Any adjustments before I implement?" Do not generate ports, services or infrastructure in this turn.

Skip Turn 1 (go straight to Turn 2) when the request is a single Value Object or a single Domain Service, or in the non-interactive fallback.

## Turn 2: Implementation (after approval)

Output the Decision Log, then the code in this order: domain layer (VOs, Entities, Aggregate, errors, events), Repository Port, Application Service/handler, InMemory fake (`application/testing/`), infrastructure DAO and adapter if persistence is involved.

## Decision Log

Print it only when there are real design choices. One line per decision. Omit "not applicable" lines.

```
## DDD Decision Log
- Value Object: <Class>, validates <rule> in constructor
- Aggregate boundary: <what is inside and why>
- Identity strategy: <application-generated / natural / composite>, reason
- Domain Events emitted: <EventName> on <trigger>
- Error types: <ErrorClass> for <scenario>
- Port declaration: abstract class (or interface), reason
```

## DDD checklist

Run it internally before every code output. Print only unmet or not-applicable items. Never print a box that contains a forbidden literal (for example the TypeORM entity decorator or a system-clock call); describe it in words.

- Value Objects extend `ValueObject`, are immutable, validate in the constructor with `DomainValidationError`
- Entity ids are Value Objects, including internal entities; kernel `id` and `value` are `public readonly`
- No TypeORM entity decorator on domain classes
- Domain Services have zero mutable fields and `readonly` collaborators
- Domain Services call only methods that exist on their port
- Events are past tense, versioned, immutable, with a static `fromPrimitives`, and each one is emitted
- Aggregate Root is the only entry point; private constructor with `create` and `restore`
- `restore` emits no events and is what repositories use
- Time and ids come from `Clock` / `IdGenerator` via `DomainDeps`, not the system
- Internal Entity identities are never exposed
- Module names come from Ubiquitous Language
- Domain layer has zero imports from infrastructure
- Repository Port in `domain/port/` as an abstract class; Adapter in `infrastructure/`
- Repository ports throw typed errors, including `NotFoundError`
- Events are published from the Application layer after `save`, never from the Aggregate
- Domain throws `DomainError` subclasses only
- InMemory fakes live in `application/testing/` and extend the same port
