# Configuration, Supply Chain, Logging, Errors (A02, A03, A08, A09, A10)

Trust boundary: the environment, dependencies, build pipeline, and operators' view of your system.

| ID | Rule | Attack prevented |
|---|---|---|
| CFG-1 | MUST read secrets from the environment or a secret manager and validate them at startup with a schema. MUST NOT hardcode secrets, commit `.env` files, put secrets in URLs, client bundles, process arguments, or logs. `.gitignore` and the Docker build context MUST exclude them. | Credential disclosure |
| CFG-2 | MUST use vetted primitives: AES-256-GCM or ChaCha20-Poly1305 with a unique random nonce per message, HMAC-SHA-256 for integrity, TLS for transport. MUST NOT use ECB, static IVs, unauthenticated encryption, or fallbacks to plaintext when crypto fails. | Data tampering, disclosure, downgrade (A04) |
| CFG-3 | Defaults MUST be secure: missing or invalid config stops startup; a disabled flag, unavailable dependency, or failed policy check denies access. Development settings (debug, permissive CORS, seed credentials) MUST be impossible to enable in production. | Fail-open behavior, insecure defaults |
| CFG-4 | MUST commit the lockfile, install with `npm ci` (or equivalent frozen install), pin CI actions and container images by version or digest, and use scoped registry configuration for private packages. MUST NOT run unvetted `postinstall` scripts from new dependencies. | Dependency confusion, mutable inputs, malicious packages |
| CFG-5 | CI jobs MUST run untrusted code (forks, PRs) without secrets or write tokens, with minimal `permissions`. MUST NOT interpolate branch names, titles, or issue text into shell steps. Release jobs MUST publish the artifact digest that was tested. | Pipeline takeover, build substitution |
| CFG-6 | MUST log security events (login success and failure, authorization denials, privilege and config changes, validation failures at the edge) as structured entries with actor, action, resource, outcome, and request ID. MUST redact tokens, passwords, PII, and card data; MUST neutralize CR/LF in logged input. Alerts MUST exist for repeated failures. | Undetected attacks, log injection, secrets in logs (A09) |
| CFG-7 | MUST catch errors at one boundary and return a generic body with a correlation ID. MUST NOT expose stack traces, SQL errors, internal paths, or "user not found" distinctions. MUST handle `unhandledRejection` and `uncaughtException` by logging and exiting for supervisor restart. | Information leakage, crash on bad input (A10) |
| CFG-8 | MUST verify integrity of anything executed or loaded from outside the repo: signature or checksum from an independent trusted source, with failure meaning rejection. Updaters and plugin loaders MUST check product, version, channel, and expiry, not only payload bytes. MUST NOT load code from user-controlled paths. | Tampered updates, rollback, malicious plugins (A08) |
| CFG-9 | Containers MUST run as non-root, drop capabilities, avoid `privileged` and host mounts, and bind admin or metrics ports to internal interfaces only. Cloud and workload identities MUST be granted only the actions and resources the code uses. | Container escape, lateral movement |
| CFG-10 | Servers MUST ignore client-supplied identity metadata (`X-User`, cert-subject headers, account IDs) unless set by a verified ingress that strips incoming copies. Events MUST be verified per SSRF-8. | Identity spoofing |

```ts
const Env = z.object({
  DATABASE_URL: z.string().url(),
  SESSION_SECRET: z.string().min(32),
});
export const env = Env.parse(process.env);
```
