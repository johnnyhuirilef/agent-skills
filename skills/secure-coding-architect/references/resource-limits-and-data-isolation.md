# Resource Limits and Data Isolation (A01, A06)

Trust boundary: work and data volume chosen by one principal that consumes capacity or storage shared with others.

## Resource limits

| ID | Rule | Attack prevented |
|---|---|---|
| RES-1 | MUST cap request body size, upload size, JSON depth, array length, and string length before parsing (`express.json({ limit })`, schema `.max()`). MUST enforce aggregate caps per tenant, not only per item. | Memory exhaustion, aggregate flooding |
| RES-2 | MUST rate-limit by authenticated principal and by IP, with stricter limits on login, reset, signup, and expensive routes. MUST key limits on a trusted identity, not a spoofable header. Shared limiters MUST use a shared store when running multiple instances. | Brute force, quota escape, cost abuse |
| RES-3 | MUST bound pagination (`limit` max, cursor), filter cardinality, sort fields (allowlist), query depth, and expansion or `include` fields. MUST NOT fan out one request into unbounded downstream calls. | Query amplification, scan DoS |
| RES-4 | MUST set deadlines on outbound calls, queries, and handlers, and propagate cancellation (`AbortSignal`). MUST use linear-time regex (or `re2`) on untrusted strings, and bound recursion and parse depth. | Slowloris-style hangs, ReDoS, detached work |
| RES-5 | MUST release handles on every path (`try/finally`, `using`, stream `pipeline`). MUST expire sessions, caches, and pending jobs, and bound unique cache keys and metric label cardinality. | Descriptor and memory leaks |
| RES-6 | MUST NOT let untrusted input reach `process.exit`, unhandled throws in shared workers, or infinite loops. Queue consumers MUST send poison messages to a dead-letter path after bounded retries. | Process crash, head-of-line blocking |
| RES-7 | Retries MUST use capped exponential backoff with jitter, a retry budget, and idempotency. Expensive work (decompression, crypto, key lookup) MUST run after authentication and the earliest size gate. | Retry storms, pre-auth work imbalance |

## Data isolation and lifecycle

| ID | Rule | Attack prevented |
|---|---|---|
| DATA-1 | MUST enforce tenant and owner in every read, update, delete, list, count, and bulk query, including background jobs, imports, and admin paths. Prefer row-level security or a repository that injects the scope so a call cannot omit it. MUST NOT take tenant identity from the body or URL. | Cross-tenant access |
| DATA-2 | MUST include tenant and environment in cache keys, object keys, search document IDs, queue partitions, and unique constraints. | Key collision, cross-tenant overwrite or read |
| DATA-3 | MUST apply the access filter again at retrieval time for search, cache, embeddings, and previews, and invalidate derived copies when ACLs change. | Index and cache ACL drift |
| DATA-4 | Soft-deleted or revoked records MUST be excluded by default in every query path (default scope with an explicit opt-out). Revocation MUST invalidate sessions, cached grants, subscriptions, and queued jobs. Deletion MUST propagate to indexes, exports, and analytics. | Access to deleted data, stale authorization |
| DATA-5 | Exports, backups, and imports MUST authorize per item and exclude other tenants, soft-deleted records, and secret fields. Imported or restored data MUST pass the same validation and authorization as a normal write. | Exfiltration through export, validation bypass through import |
| DATA-6 | Migrations MUST backfill tenant, owner, and ACL fields before readers rely on them, and defaults for missing fields MUST deny. | Ownership gaps during rollout |
| DATA-7 | MUST keep secrets and private content out of logs, traces, and analytics, or apply the same access and retention as the source. | Alternate readers of sensitive data |

```ts
const page = z.object({ limit: z.coerce.number().int().min(1).max(100).default(20) }).parse(req.query);
const rows = await repo.forTenant(principal.tenantId).list({ limit: page.limit });
```
