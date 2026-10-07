# AI and LLM (A01, A05, A06)

Trust boundary: untrusted content flows into a model or memory, and model output flows into a capability or sink.

| ID | Rule | Attack prevented |
|---|---|---|
| AI-1 | MUST treat model output, retrieved documents, memory, tool results, and MCP metadata as untrusted input. MUST validate model output against a schema before use and encode it for the sink (HTML, SQL, shell, URL). | Insecure output handling, injection through the model |
| AI-2 | MUST authorize inside every tool handler using the requesting principal and the named resource, with the tool arguments validated again (paths, URLs, queries, IDs). MUST NOT rely on a system prompt or schema as the control. | Confused deputy, tool-argument injection |
| AI-3 | MUST run tools with the requester's authority or a credential scoped to them, never a broad service credential. Delegated sub-agents MUST receive only the capabilities their task needs. | Excessive agency, privilege inheritance |
| AI-4 | MUST bind human approval to the normalized tool name, full argument object, requester, target, and expiry, and execute exactly the approved object once (idempotent on retry). Side effects triggered by retrieved content MUST need explicit user intent. | Approval confusion, action hijack by injected content |
| AI-5 | MUST scope retrieval, conversation history, embeddings, memory, and prompt caches by tenant and ACL in the query and cache key. MUST record provenance for memory and MUST NOT promote low-trust content to durable instructions. | Context bleed, memory poisoning |
| AI-6 | MUST assemble prompts with typed roles; MUST NOT concatenate untrusted text into system or tool-policy sections, and MUST NOT accept caller-supplied role fields. | Role and provenance confusion |
| AI-7 | MUST keep credentials, other users' data, and secret policy values out of model context. | Sensitive context extraction |
| AI-8 | MUST cap loop iterations, tokens, tool calls, and spend per request and per tenant, with cancellation. | Runaway cost, delegated action loops |
| AI-9 | MUST route MCP calls by authenticated connection and request correlation, not by model-chosen server, tool name, or URI. Allowlist servers and tools deterministically. | MCP identity confusion |

```ts
const args = SendEmailArgs.parse(toolCall.arguments);
await assertCan(principal, 'email:send', args.accountId);
await mailer.send(args);
```
