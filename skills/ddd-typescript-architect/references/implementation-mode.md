Load when: the user asks to create or change domain code, or a "refactor" request has finished its brief review.

# Implementation Mode

The mode gate is in `SKILL.md`. This file holds the Ambiguity Gate, the two turns, the non-interactive fallback, the Decision Log and the checklist. Rules: `hard-rules.md`; kernel types: `base-classes.md`.

## Non-interactive fallback

If no user can answer (evaluation, CI, subagent), or the prompt already answers a gate question, state assumptions in a short list and proceed without waiting.

## Ambiguity Gate

Before writing code, check these. If one is unclear, ask ONE question at a time and wait.

| Question | Ask only if |
|---|---|
| Which Bounded Context does this belong to, and what is the Module name (a business word)? | Unclear |
| Aggregate Root that owns this behavior? | Unclear |
| Business invariants to enforce? | Unclear |
| Domain Events produced? | Events are involved. Skip when no events are involved |

Non-interactive: state an assumption for each unclear item instead.

## Turn 1: Domain model (then STOP)

Present: Value Objects, Entity/Aggregate structure and identity strategy, Domain Error types, Domain Events. Then ask: "Does this domain model reflect the business correctly? Any adjustments before I implement?" Do not generate ports, services or infrastructure in this turn.

Skip Turn 1 (go straight to Turn 2) when the request is a single Value Object or a single Domain Service, or in the non-interactive fallback.

## Turn 2: Implementation (after approval)

Output the Decision Log, then code in this order: domain layer (VOs, Entities, Aggregate, errors, events), Repository Port, Application handler, InMemory fake (`application/testing/`), infrastructure DAO and adapter if persistence is involved.

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

Run it internally before every code output. Print only unmet or not-applicable items. Never print a forbidden literal (an ORM decorator, a system-clock call); describe it in words.

- Value Objects extend `ValueObject`, are immutable, validate in the constructor with `DomainValidationError`
- Entity ids are Value Objects, including internal entities; kernel `id` and `value` are `public readonly`
- No ORM decorator on domain classes
- Domain Services: no mutable fields, `readonly` collaborators, call only methods on their port
- Events are past tense, versioned, immutable, with a static `fromPrimitives`, and each one is emitted
- Aggregate Root is the only entry point; private constructor, `create` and `restore`; `restore` emits no events and repositories use it
- Time and ids come from `Clock` / `IdGenerator` via `DomainDeps`, not the system
- Internal Entity identities are never exposed
- Module names come from Ubiquitous Language
- Domain imports nothing from infrastructure; Repository Port in `domain/port/`, Adapter in `infrastructure/`; ports throw typed errors
- Integration events are published from the Application layer after `save`, never from the Aggregate
- Domain throws `DomainError` subclasses only
- InMemory fakes live in `application/testing/` and extend the same port
