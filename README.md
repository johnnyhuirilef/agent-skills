# Agent Skills

A curated collection of high-quality, production-ready AI agent skills for software architecture, domain-driven design, and testing excellence.

These skills are compatible with:
- ✅ **Claude Code** / **Claude.ai**
- ✅ **Cursor** / **Windsurf**
- ✅ **skills.sh ecosystem** (`npx skills add johnnyhuirilef/agent-skills`)

## About This Repository

This repository provides expert-level skills designed to teach AI agents how to perform complex technical tasks in a deterministic, declarative, and maintainable manner. Skills are built on principles of:

- **Deterministic execution** — Consistent output regardless of phrasing
- **Declarative intent** — Focus on *what* should be accomplished, not *how*
- **Best practices enforcement** — Industry standards, architectural principles, and quality gates
- **Low entropy design** — Minimal complexity, maximum clarity
- **Quality-first attitude** — Skills actively challenge poor design decisions

## Available Skills

Each skill is self-contained with:
- `SKILL.md` — Core instructions, workflows, and principles
- `references/` — Detailed templates, patterns, and examples
- `evals/` — Formal evaluations with structured assertions

### 1. **ddd-canvas-generator**
Generate and critique Domain-Driven Design canvas designs (Bounded Context Canvas v5, Aggregate Design Canvas v1.1).

**Use when:**
- Modeling strategic domain boundaries and contexts
- Designing aggregates with proper transaction boundaries
- Creating C4 system architecture diagrams
- Validating domain language and entity relationships
- Challenging architectural decisions with DDD principles

**Features:**
- Dual-canvas workflow (BC → Aggregate)
- C4 Context/Container diagrams (Mermaid)
- Aggregate state transition diagrams
- Strategic classification (Core/Supportive/Generic)
- 15 domain role archetypes

### 2. **unit-test-declarative-architect**
Generate high-quality declarative unit tests with AAA structure, FIRST/DAMP principles, and automatic test framework detection.

**Use when:**
- Writing unit tests for Use Cases and Domain Services
- Creating test data factories with Fishery + Faker
- Implementing In-Memory repository Fakes
- Testing Result-type (neverthrow) error handling
- Designing reusable test infrastructure

**Features:**
- Jest/Vitest auto-detection
- Dual error handling patterns (Result types + exceptions)
- Map-based In-Memory repository Fakes
- Natural language test naming
- VALID_INPUT constant pattern
- Nested describe organization

## Installation

### Via skills.sh CLI
```bash
npx skills add johnnyhuirilef/agent-skills
```

### In Claude.ai / Claude Code
Upload this repository as a custom skill, or reference skills individually.

### In Cursor / Windsurf
Follow your agent's documentation for loading custom skills from GitHub repositories.

## Repository Structure

```
.
├── README.md                          # This file
├── skills/
│   ├── ddd-canvas-generator/
│   │   ├── SKILL.md                  # Skill definition
│   │   ├── references/
│   │   │   ├── bounded-context-v5.md
│   │   │   └── aggregate-v1.1.md
│   │   └── evals/
│   │       └── evals.json
│   └── unit-test-declarative-architect/
│       ├── SKILL.md
│       ├── references/
│       │   ├── test-template.md
│       │   ├── factory-template.md
│       │   ├── repository-fake-template.md
│       │   └── result-type-testing.md
│       └── evals/
│           └── evals.json
```

## Skill Development Philosophy

1. **Start with evaluation** — Write evals before skill logic
2. **Enforce determinism** — Make outputs predictable and repeatable
3. **Document thoroughly** — Include examples, rules, and anti-patterns
4. **Test comprehensively** — Cover happy paths, edge cases, and failure scenarios
5. **Challenge inputs** — Never accept poor design without technical rationale
6. **Reference established standards** — Build on proven methodologies (DDD, C4, SOLID, testing frameworks)

## Key Principles

- **Non-negotiable Quality** — Skills actively critique poor decisions and refuse mediocrity
- **Architectural Rigor** — Every skill enforces established patterns and best practices
- **Declarative Interaction** — Users describe the business problem; the skill handles execution
- **Low Complexity** — Minimize cyclomatic complexity without sacrificing purpose
- **State of the Art** — Always reflect current best practices and modern tooling

## Design Philosophy

These skills embody a commitment to software engineering excellence:
- **Deterministic & Declarative** — Never imperative, always architectural
- **Low entropy, low cyclomatic complexity** — Without sacrificing purpose
- **Rigorous critique** — Active challenge to poor design choices
- **Formal execution** — Structured, precise, and auditable outputs

## Standards & References

- [Agent Skills Specification](https://agentskills.io)
- [skills.sh Documentation](https://skills.sh/docs)
- [Domain-Driven Design](https://domainlanguage.com/ddd/) — Evans, E.
- [C4 Model](https://c4model.com/) — Brown, S.
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [Anthropic Skills](https://github.com/anthropics/skills)

## Contributing

These skills are designed to be iterated and improved. Found issues? Have suggestions? Open an issue or fork this repository.

## License

These skills are provided as reference implementations and educational examples. Use freely in your projects.

---

**Philosophy:** Better architecture, better tests, better software.  
**Latest Update:** March 2025
