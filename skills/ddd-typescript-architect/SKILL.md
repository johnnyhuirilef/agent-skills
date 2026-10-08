---
name: ddd-typescript-architect
description: "Trigger: DDD in TypeScript: domain, entity, aggregate, value object, domain service, domain event, module, domain errors, ports/adapters. Implements or reviews tactical DDD; not for generic CRUD or non-DDD code."
license: Apache-2.0
metadata:
  author: "johnnyhuirilef"
  version: "2.0"
---

# DDD TypeScript Architect

## Activation Contract

Load when the user asks to write, change or review TypeScript code involving domain models, entities, aggregates, value objects, domain services, domain events, modules, domain errors or ports/adapters, even without the word "DDD".

Pick the mode first:

| Request | Mode |
|---|---|
| User pastes code or asks for a review | Review |
| User asks to create or change code | Implementation |
| "Refactor" | Review the code briefly (no grilling question), then Implementation |
| User asks to explain a DDD concept | Question: answer directly. No mode, no report, no gates |

If no user can answer (evaluation, CI, subagent) or the prompt already answers a gate, state assumptions and proceed.

Then identify the pattern and layer of every artifact.

| Code signal | Pattern |
|---|---|
| Immutable, no identity, compared by value | Value Object |
| Mutable, unique identity, business logic | Entity |
| Stateless class spanning several objects | Domain Service |
| Immutable record of something that happened | Domain Event |
| Cluster behind one root with invariants | Aggregate |
| Folder grouping one business concept by layer | Module |
| Named exception from the domain | Domain Error |
| Abstract class the domain declares, infrastructure implements | Port |

| Layer | Contains |
|---|---|
| `domain` | Entities, VOs, Aggregates, Domain Services, Events, Ports, Errors |
| `application` | Use cases, handlers, InMemory fakes (`application/testing/`) |
| `presentation` | Controllers, resolvers |
| `infrastructure` | Adapters, DAOs, external clients |

**CARDINAL RULE**: the domain depends on NOTHING. Dependencies flow inward only.

## Hard Rules

Rules live in `references/hard-rules.md`; cite them by ID.

- Value Objects: immutable, extend `ValueObject`, validate in the constructor (VO-1, VO-2, VO-3).
- Entity ids are Value Objects, application-generated, never bare primitives or DB-assigned (ENT-1, ENT-7). No ORM decorator on a domain class (ENT-2).
- Domain Services hold no mutable state (DS-1, DS-4).
- Aggregate roots: private constructor, `create` emits events, `restore` emits none (AGG-5). Other roots by id only (AGG-7).
- Time and ids come from `DomainDeps`, never the system (AGG-6, DS-8).
- Events: past tense, `<context>.<event-name>.v<N>`, static `fromPrimitives`, published only by the Application layer after `save` (EV-2, EV-3, EV-5, EV-8, EV-9).
- The domain throws `DomainError` subclasses, never `Error`, and never catches them (ERR-1, ERR-4).
- Ports are abstract classes and throw typed not-found errors; repositories rebuild with `restore` (REP-1, REP-2, REP-4).
- Module names are business words; layers per MOD-1, MOD-2, MOD-5.

## Decision Gates

| Situation | Load |
|---|---|
| Review | `references/anti-patterns.md` and `references/review-mode.md` only |
| Implementation | `references/hard-rules.md`, `references/base-classes.md`, `references/implementation-mode.md`; then only the topic files for the patterns being written |
| Question | Nothing |

Topic files:

| Pattern | Load |
|---|---|
| Value Object | `references/value-object-patterns.md` |
| Entity, identity | `references/entity-patterns.md` |
| Aggregate | `references/aggregate-patterns.md` |
| Domain Event, EventBus | `references/domain-event-patterns.md` |
| Domain Service, fakes | `references/domain-service-and-testing.md` |
| Domain Error | `references/domain-errors.md` |
| Module, ports, folders | `references/module-structure.md` |

## Severity

- **BLOCKER**: breaks a layering, identity, encapsulation or aggregate invariant. Fix before merge.
- **CRITICAL**: serious but contained.
- **WARNING**: smell or risk.
- **SUGGESTION**: optional.

Report each defect at its own severity. Never escalate because other findings exist. Report only rule or table violations; anything else is at most 3 SUGGESTIONs.

BLOCKER and CRITICAL index (full table in `anti-patterns.md`):

| Sev | Defect (AP id) |
|---|---|
| BLOCKER | ORM `@Entity()` on domain class (AP-1); Domain Service state, direct, indirect or accumulated (AP-2, AP-3, AP-4); anemic Entity (AP-5); outside access to aggregate internals (AP-6); partial aggregate persistence (AP-7); Entity calling Repository/DB (AP-8); domain swallows exceptions (AP-9); mutable VO field or `===` on VOs (AP-10, AP-11); mutable event payload (AP-12); module named `utils`, `helpers`, `shared`, `events` or `common` (AP-13); domain imports outward (AP-14) |
| CRITICAL | Aggregate publishes events or holds an EventBus (AP-15, AP-16); VO setter (AP-17); DB-assigned id in domain (AP-18); bare primitive entity id (AP-19); repository rebuilds with `create` (AP-20); publish before persist (AP-21) |

Verdict: any BLOCKER = REDESIGN. Any CRITICAL or more than 2 WARNING = REFACTOR. Otherwise APPROVE; clean code gets APPROVE.

## Execution Steps

1. Pick the mode; detect pattern and layer.
2. Load what Decision Gates names for that mode, then follow it.
3. Run the DDD checklist internally; print only unmet items.

## Output Contract

- Review: the report from `review-mode.md`. Each finding has severity with rule ID, location, evidence, why, fix. Verdict last, then one confirmation question about the top finding (none on APPROVE or non-interactive runs).
- Implementation: Decision Log (only real choices), then code in the order `implementation-mode.md` defines.
- Question: a direct answer.

## References

Review: `references/anti-patterns.md`, `references/review-mode.md`. Implementation: `references/hard-rules.md`, `references/base-classes.md`, `references/implementation-mode.md`, plus the topic files in Decision Gates.
