# Agent Skills

A curated collection of high-quality, production-ready AI agent skills for software architecture, domain-driven design, testing excellence, and code review.

These skills are compatible with:
- ✅ **Claude Code** / **Claude.ai**
- ✅ **Cursor** / **Windsurf**
- ✅ **skills.sh ecosystem**

## Installation

### All skills at once
```bash
npx skills add johnnyhuirilef/agent-skills
```

### Individual skills
```bash
npx skills add johnnyhuirilef/agent-skills --skill 4r-review
npx skills add johnnyhuirilef/agent-skills --skill ddd-canvas-generator
npx skills add johnnyhuirilef/agent-skills --skill unit-test-declarative-architect
npx skills add johnnyhuirilef/agent-skills --skill secure-coding-architect
npx skills add johnnyhuirilef/agent-skills --skill ddd-typescript-architect
```

---

## Available Skills

### [4r-review](skills/4r-review/)
Structured code review across four independent lenses — Risk, Readability, Reliability, Resilience. Forces coverage of every class of problem that single-axis reviews miss.

**Triggers:** "review", "revisar", "auditar", "4R", "code review"

---

### [ddd-canvas-generator](skills/ddd-canvas-generator/)
Generate and critique Domain-Driven Design canvases — Bounded Context Canvas v5 and Aggregate Design Canvas v1.1. Includes C4 diagrams, state transitions, and strategic classification.

**Triggers:** DDD design, bounded context, aggregate modeling, domain canvas

---

### [unit-test-declarative-architect](skills/unit-test-declarative-architect/)
Generate high-quality declarative unit tests with AAA structure, FIRST/DAMP principles, Fishery factories, and In-Memory Fakes. Auto-detects Jest or Vitest.

**Triggers:** unit tests, test suite, Fishery factory, In-Memory repository, mock service

---

### [secure-coding-architect](skills/secure-coding-architect/)
Write and refactor secure TypeScript/JavaScript with ID-tagged rules mapped to OWASP Top 10 (2025). Self-contained: rule references cover injection, auth/sessions, access control, SSRF/uploads/deserialization, config/supply chain/logging, resource limits, tenant isolation, and LLM/agent tools.

**Triggers:** secure code, user input, authentication, API endpoint, database query, file upload, outbound request, multi-tenant, LLM tools

---

### [ddd-typescript-architect](skills/ddd-typescript-architect/)
Implement and review all six DDD tactical patterns in TypeScript — Value Object, Entity, Domain Service, Domain Event, Aggregate, and Module. Enriched with production codebase patterns: base classes, DomainDeps, abstract class ports, ContextObject, ToPrimitives, Domain Error taxonomy, InMemory fakes, event versioning, and inter-aggregate coordination via snapshot. Enforces a deterministic 2-turn implementation workflow and a finding-by-finding grilling loop for reviews.

**Triggers:** domain, entity, aggregate, value-object, domain-service, domain-event, module structure, domain errors, ports/adapters, DDD review

---

## Repository Structure

```
skills/
├── 4r-review/
│   └── SKILL.md
├── ddd-canvas-generator/
│   ├── SKILL.md
│   └── references/
├── unit-test-declarative-architect/
│   ├── SKILL.md
│   └── references/
├── secure-coding-architect/
│   ├── SKILL.md
│   ├── references/
│   └── evals/
└── ddd-typescript-architect/
    ├── SKILL.md
    ├── references/
    │   ├── value-object-patterns.md
    │   ├── aggregate-patterns.md
    │   ├── module-structure.md
    │   ├── domain-errors.md
    │   └── domain-event-patterns.md
    └── evals/
        └── evals.json
```

## Philosophy

- **Deterministic** — consistent output regardless of phrasing
- **Declarative** — describe what, not how
- **Low entropy** — minimal complexity, maximum clarity
- **Non-negotiable quality** — skills actively challenge poor design decisions

---

**Latest Update:** June 2026
