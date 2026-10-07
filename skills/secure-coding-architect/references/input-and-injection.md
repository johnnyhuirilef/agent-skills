# Input and Injection (A05)

Trust boundary: any value from a request, URL fragment, header, file, queue, database row written by another path, `postMessage`, or browser storage.

| ID | Rule | Attack prevented |
|---|---|---|
| INP-1 | MUST parse every external value with a strict schema at the edge (Zod `.strict()`, TypeBox). MUST use the parsed output, never the raw input, afterward. MUST NOT trust a TypeScript type as validation. | Type confusion, mass assignment, field smuggling |
| INP-2 | MUST use parameterized queries or ORM builders. MUST NOT concatenate or template values into SQL, NoSQL filters, LDAP, XPath, or GraphQL documents. For Mongo-style filters MUST coerce fields to primitives (`z.string()`) so `{ "$ne": null }` cannot arrive as an operator. Field names, sort keys, and column names MUST come from an allowlist. | SQL/NoSQL injection, operator injection, injection via keys |
| INP-3 | MUST NOT pass input to `eval`, `new Function`, `vm`, `child_process.exec`, template compilers, or `import()`. When a process is unavoidable, MUST use `execFile` with an argument array and an allowlisted command. | Remote code execution, command injection |
| INP-4 | MUST rely on framework escaping for HTML. MUST NOT use `innerHTML`, `dangerouslySetInnerHTML`, `document.write`, or `v-html` with untrusted data; if rich text is required, MUST sanitize with DOMPurify using an allowlist. MUST NOT put input into `href`/`src` without scheme allowlist (`https:`, `mailto:`). | Stored, reflected, and DOM XSS, `javascript:` URLs |
| INP-5 | MUST reject `__proto__`, `constructor`, and `prototype` keys in recursive merge or path-assignment code. MUST build lookup maps with `Object.create(null)` or `Map`. MUST NOT deep-merge untrusted JSON into config or option objects. | Prototype pollution leading to auth bypass or RCE gadgets |
| INP-6 | MUST re-validate data read from storage before using it in a new context (path, URL, regex, template, policy expression). Validation at write time does not cover a different sink. | Second-order injection |
| INP-7 | MUST validate redirect targets against an allowlist of exact origins or relative paths. MUST NOT place untrusted data in `Location`, `Set-Cookie`, or other headers without rejecting CR/LF. | Open redirect, header injection, response splitting |
| INP-8 | MUST check `event.origin` against an exact allowlist (and `event.source` when frames share an origin) in every `message` handler. MUST pass an explicit target origin to `postMessage`, never `*`, for sensitive data. | Cross-origin command and data theft |
| INP-9 | MUST NOT build regular expressions from input; MUST escape if unavoidable. Complex patterns on untrusted strings MUST be linear-time (see RES-4). | ReDoS, regex injection |

```ts
const Query = z.object({ email: z.string().email().max(254) }).strict();
const { email } = Query.parse(req.body);
const user = await db.user.findFirst({ where: { email } });
```
