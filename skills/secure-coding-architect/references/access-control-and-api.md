# Access Control and API (A01, A06)

Trust boundary: a request from an authenticated or anonymous caller asking to act on a resource.

| ID | Rule | Attack prevented |
|---|---|---|
| AC-1 | MUST authenticate and authorize every route, including batch, export, import, legacy, admin, and background paths to the same operation. Deny by default; new routes start closed. | Missing function-level authorization |
| AC-2 | MUST bind the principal to the resource inside the data query (`where: { id, ownerId }`), not in a separate check afterward. MUST return the same response for "not found" and "no access". | IDOR/BOLA, enumeration |
| AC-3 | MUST copy only an explicit allowlist of fields from input into models. MUST NOT spread request bodies into persistence calls. Role, tenant, owner, price, and status fields MUST be set server-side. | Mass assignment, privilege escalation |
| AC-4 | MUST use unguessable public IDs (UUIDv4/v7) as defense in depth. MUST NOT treat an unguessable ID as authorization. | IDOR via sequential IDs |
| AC-5 | Bulk, search, filter, sort, and export operations MUST apply per-item authorization and MUST NOT expose hidden fields through ordering, counts, or error differences. | Data exfiltration through features, oracles |
| AC-6 | MUST enforce business state machines and invariants on the server: valid transitions, positive bounded quantities, idempotency keys for payments, and atomic check-and-update (transaction, conditional update, or lock). | Step skipping, replay, race conditions, double spend |
| AC-7 | MUST use an exact-origin CORS allowlist. MUST NOT reflect `Origin` or combine credentials with a broad match. MUST NOT use substring or unanchored regex origin checks. | Cross-origin data theft |
| AC-8 | WebSocket upgrades authenticated by cookie MUST check `Origin` or require a channel token. Every message handler MUST re-authorize the action. | Cross-site WebSocket hijacking |
| AC-9 | MUST set security headers (Helmet): CSP, HSTS, `frame-ancestors` or `X-Frame-Options` on state-changing pages, `X-Content-Type-Options: nosniff`, `Referrer-Policy`. Use `rel="noopener"` for untrusted links. | Clickjacking, MIME sniffing, XSS impact |
| AC-10 | MUST configure `trust proxy` only for known ingress hops. MUST NOT derive identity, tenant, absolute URLs, or client IP from `Host` or `X-Forwarded-*` unless the trusted proxy overwrites them. | Header spoofing, poisoned reset links |
| AC-11 | Responses containing user data MUST carry `Cache-Control: private, no-store` (or an equivalent key that includes identity). MUST NOT cache by path suffix. | Cache deception, cross-user disclosure |
| AC-12 | MUST NOT leave debug, metrics, health-detail, admin, or `/env` endpoints reachable without authentication, and MUST NOT enable them by query parameter or header. | Information disclosure, admin takeover |

```ts
const invoice = await db.invoice.findFirst({
  where: { id: params.id, tenantId: principal.tenantId },
});
if (!invoice) return res.status(404).json({ error: 'Not found' });
```
