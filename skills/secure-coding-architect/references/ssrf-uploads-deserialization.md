# SSRF, Files, Uploads, Deserialization (A01, A08)

Trust boundary: a URL, path, file, archive, or serialized blob chosen by someone else that your process fetches, opens, stores, or decodes.

| ID | Rule | Attack prevented |
|---|---|---|
| SSRF-1 | MUST fetch only URLs whose scheme (`https:`) and host match an allowlist. When the host is user-supplied (webhooks, previews), MUST resolve DNS, reject loopback, private, link-local, and metadata ranges (`169.254.0.0/16`, `fd00::/8`), connect to the validated IP, and re-validate every redirect (or disable redirects). MUST set timeout and response-size caps. | SSRF to internal services and cloud metadata, DNS rebinding |
| SSRF-2 | MUST resolve user-influenced paths against a fixed base (`path.resolve`) and verify the result stays inside it (`path.relative` does not start with `..`), after decoding and symlink resolution (`fs.realpath`). Prefer opaque IDs mapped to storage keys over client filenames. | Path traversal, arbitrary file read or write |
| SSRF-3 | MUST validate uploads by size, count, and content (magic bytes), not by `Content-Type` or extension alone. MUST store under server-generated names outside the web root, with non-executable permissions, and serve with a fixed `Content-Type`, `nosniff`, and `Content-Disposition: attachment` for untrusted types. | Web shell upload, stored XSS via files |
| SSRF-4 | MUST validate every archive entry path before extraction, reject absolute paths, `..`, and symlinks, and cap entry count, per-entry size, total expanded size, and nesting. | Zip slip, decompression bombs |
| SSRF-5 | MUST parse untrusted data as JSON (validated by schema) or another data-only format. MUST NOT use `node-serialize`, `eval`-based parsers, `yaml.load` with unsafe tags, or revivers that instantiate classes from input. XML parsers MUST disable external entities and DTD processing. | Deserialization RCE, XXE |
| SSRF-6 | Signed URLs and share links MUST bind operation, exact object and version, audience, tenant, and short expiry. MUST be re-checked or revoked when access changes. | Object access beyond the issuer's authority |
| SSRF-7 | MUST create temp files with `fs.mkdtemp` and unpredictable names, open with exclusive flags, and delete on every exit path. MUST NOT check-then-use a path; operate on the opened handle. | Temp file races, TOCTOU |
| SSRF-8 | MUST verify webhook and event payloads with a provider signature (HMAC, constant-time compare) plus timestamp or replay check before acting. MUST NOT trust a source identity from the body. | Forged events, replay |

```ts
const resolved = await fs.realpath(path.resolve(baseDir, name));
if (path.relative(baseDir, resolved).startsWith('..')) throw new ForbiddenError();
```
