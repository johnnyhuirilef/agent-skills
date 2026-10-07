# Authentication and Session (A07, A04)

Trust boundary: a credential, token, or cookie presented by a caller claiming to be a principal.

| ID | Rule | Attack prevented |
|---|---|---|
| AUTH-1 | MUST hash passwords with Argon2id (preferred) or bcrypt with a per-password salt and tuned cost. MUST NOT use raw SHA/MD5, reversible encryption, or custom crypto. | Offline cracking after a database leak |
| AUTH-2 | MUST generate tokens, session IDs, reset codes, and nonces with `crypto.randomBytes` or `crypto.randomUUID`. MUST NOT use `Math.random` or timestamps. MUST compare secrets with `crypto.timingSafeEqual` on equal-length buffers. | Token prediction, timing side channel |
| AUTH-3 | MUST set session cookies `HttpOnly`, `Secure`, `SameSite=Lax` or `Strict`, narrowest `Path`, and no broad `Domain`. Prefer the `__Host-` prefix. | Session theft via XSS or network, cookie scope abuse |
| AUTH-4 | MUST rotate the session ID on login, privilege change, MFA completion, and account switch. MUST invalidate server-side on logout, password change, revocation, and account disable. | Session fixation, stale sessions |
| AUTH-5 | MUST protect every cookie-authenticated state-changing route against CSRF: anti-CSRF token or strict `Origin` check, plus SameSite. MUST NOT mutate state on GET. Routes using non-ambient bearer tokens are exempt. | Cross-site request forgery |
| AUTH-6 | MUST verify JWT signature with a server-pinned algorithm and key source, then check `exp`, `nbf`, `iss`, and `aud`. MUST NOT use `decode` for decisions, accept `alg: none`, or let the token pick the key (`kid`, `jku`, `x5u`) outside a fixed key set. | Forged tokens, token for another service accepted |
| AUTH-7 | OAuth/OIDC clients MUST bind a session-stored `state`, use PKCE, and verify ID-token `iss`, `aud`, `nonce`, and signature. Authorization servers MUST match `redirect_uri` exactly. | Login CSRF, code injection, token substitution |
| AUTH-8 | Password reset and recovery MUST use single-use, short-lived random tokens bound to the user and action, store only a hash of the token, build links from a configured base URL (not the `Host` header), and invalidate prior tokens and sessions on use. | Account takeover through recovery |
| AUTH-9 | Enrolling, replacing, or disabling a second factor, and changing email or password, MUST require fresh authentication. Step-up challenges MUST bind to the current session, principal, and action, expire, and complete once. | MFA downgrade, step-up bypass |
| AUTH-10 | API keys MUST be random, stored hashed, scoped server-side to tenant and actions, revocable, and never accepted in URLs. MUST NOT ship secret keys in client bundles. | Key leakage, scope escalation |
| AUTH-11 | MUST NOT keep long-lived tokens in `localStorage` when a `HttpOnly` cookie fits. MUST clear browser storage and caches on logout and account switch, and key any client cache by account. | Token theft via XSS, cross-account data exposure |
| AUTH-12 | MUST apply attempt throttling per account and per IP on login, reset, and MFA verification, with identical responses for unknown and known accounts. | Credential stuffing, account enumeration |

```ts
const claims = jwt.verify(token, publicKey, {
  algorithms: ['RS256'],
  issuer: config.issuer,
  audience: config.audience,
});
```
