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
Generate high-quality declarative unit tests with AAA structure, Fishery factories, and In-Memory Fakes. Auto-detects Jest or Vitest. Rules cover deterministic time and randomness, async, parameterized cases, edge cases, and proving each test can fail.

**Triggers:** unit tests, test suite, Fishery factory, In-Memory repository, mock service, fake timers, it.each

---

### [secure-coding-architect](skills/secure-coding-architect/)
Write and refactor secure TypeScript/JavaScript with ID-tagged rules mapped to OWASP Top 10 (2025). Self-contained: rule references cover injection, auth/sessions, access control, SSRF/uploads/deserialization, config/supply chain/logging, resource limits, tenant isolation, and LLM/agent tools.

**Triggers:** secure code, user input, authentication, API endpoint, database query, file upload, outbound request, multi-tenant, LLM tools

---

### [ddd-typescript-architect](skills/ddd-typescript-architect/)
Implement and review the DDD tactical patterns in TypeScript: Value Object, Entity, Domain Service, Domain Event, Aggregate, Module, Domain Errors and ports. A compact `SKILL.md` picks the mode (review, implementation or question) and loads only the references that mode needs: ID-tagged hard rules, one severity scale with a merged anti-pattern table, and a deterministic verdict (any BLOCKER = REDESIGN, any CRITICAL or more than 2 WARNING = REFACTOR, otherwise APPROVE).

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
│   ├── references/
│   └── evals/
├── secure-coding-architect/
│   ├── SKILL.md
│   ├── references/
│   └── evals/
└── ddd-typescript-architect/
    ├── SKILL.md
    ├── references/        # hard-rules, anti-patterns, base-classes, review/implementation modes, per-pattern guides
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
