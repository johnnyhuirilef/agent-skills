---
name: secure-coding-architect
description: "Trigger: writing or refactoring TypeScript/JavaScript that handles untrusted input, auth, sessions, queries, uploads, outbound requests, APIs, tenant data, secrets, or LLM calls. Writes code that enforces OWASP Top 10 (2025) controls."
license: Apache-2.0
metadata:
  author: "johnnyhuirilef"
  version: "2.0"
---

# Secure Coding Architect

## Activation Contract

Load when code you write or change receives data from a less-trusted party, makes a trust decision, or touches a secret, tenant record, or external system.

## Hard Rules

- Validate at the edge with a strict schema; unknown keys rejected (INP-1). Fail closed on any error or missing config (CFG-3).
- Query with parameters and operator-safe objects only (INP-2). No shell, `eval`, or dynamic import from input (INP-3).
- Authorize every route, per resource, on the server, inside the data query (AC-1, AC-2). Pick writable fields explicitly (AC-3).
- Hash passwords with Argon2id or bcrypt; tokens from a CSPRNG; constant-time comparison (AUTH-1, AUTH-2). Verify every JWT binding (AUTH-6). Deliver browser sessions in `HttpOnly`, `Secure`, `SameSite` cookies, never in the JSON body (AUTH-3, AUTH-11).
- Scope tenant and owner in every read, write, cache key, and derived copy (DATA-1, DATA-2).
- Allowlist outbound URLs, file paths, and upload types (SSRF-1, SSRF-2, SSRF-3). Never deserialize untrusted data into executable shapes (SSRF-5).
- Secrets from the environment only; redact logs; log security events (CFG-1, CFG-6). Return generic errors (CFG-7).
- Bound body size, concurrency, pagination, and time (RES-1, RES-3, RES-4). Rate-limit auth routes (RES-2).
- Treat model output and tool arguments as untrusted input; re-authorize in the tool handler (AI-1, AI-2).
- Write decisions as pure, immutable functions over readonly validated input; confine side effects to a thin shell; use atomic mutation where concurrency matters (STY-1, STY-2, STY-5, STY-6).

## Decision Gates

| Code touches | Load | OWASP 2025 |
|---|---|---|
| Input, queries, rendering, shell, redirects | `references/input-and-injection.md` | A05 |
| Login, passwords, sessions, JWT, OAuth, MFA, CSRF | `references/auth-and-session.md` | A07, A04 |
| Routes, permissions, CORS, headers, business flows | `references/access-control-and-api.md` | A01, A06 |
| Outbound fetch, file paths, uploads, archives, deserialization | `references/ssrf-uploads-deserialization.md` | A01, A08 |
| Config, secrets, dependencies, CI, logging, errors | `references/config-supply-chain-logging.md` | A02, A03, A08, A09, A10 |
| Limits, queues, multi-tenant data, deletion, export | `references/resource-limits-and-data-isolation.md` | A01, A06 |
| LLM calls, agents, tools, RAG, MCP | `references/ai-and-llm.md` | A01, A05 |
| Business logic, state, concurrency, shared data | `references/functional-core-imperative-shell.md` | A01, A04, A06 |
| Need a worked pattern | `references/examples.md` | - |

## Execution Steps

1. Name the trust boundary: who controls the data, and where it crosses into your code, a sink, or another principal.
2. Load the matching reference for every row that applies.
3. Implement; keep validation and authorization in one central place, not scattered.
4. Self-check each loaded rule against the code before answering.

## Output Contract

- Checklist: one line per applied rule as `ID (A0x): control, attack prevented`; only rules relevant to this code.
- Then the complete code.
- For a fix, also state: the invariant enforced, the narrowest change at the last trusted decision point, and one regression test.

## References

- [input-and-injection.md](references/input-and-injection.md)
- [auth-and-session.md](references/auth-and-session.md)
- [access-control-and-api.md](references/access-control-and-api.md)
- [ssrf-uploads-deserialization.md](references/ssrf-uploads-deserialization.md)
- [config-supply-chain-logging.md](references/config-supply-chain-logging.md)
- [resource-limits-and-data-isolation.md](references/resource-limits-and-data-isolation.md)
- [ai-and-llm.md](references/ai-and-llm.md)
- [functional-core-imperative-shell.md](references/functional-core-imperative-shell.md)
- [examples.md](references/examples.md)
