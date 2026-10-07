# Functional Core, Imperative Shell (A01, A04, A06)

Trust boundary: validated data moving from the edge into business and authorization logic, and decisions moving back out to I/O.

Layers: the core holds decisions (validation, authorization, pricing, state transitions) as pure, immutable functions. The shell holds side effects (database, logs, cache, network, counters) in thin, explicit functions at the edge.

| ID | Rule | Attack prevented |
|---|---|---|
| STY-1 | MUST write decisions (authorize, validate, transition, compute price) as pure functions: same input, same output, no I/O, no clock or randomness read inside. Pass time, IDs, and the principal in as arguments. | Hidden state, untestable auth logic, time-of-check bugs |
| STY-2 | MUST turn untrusted input into an immutable typed value at the edge (`Readonly`, `as const`, `z.infer`) and pass only that value onward. MUST NOT mutate it, and MUST NOT re-read `req.body` after parsing. | Check-then-modify (TOCTOU), mass assignment, validation bypass |
| STY-3 | MUST derive new values instead of mutating (`{ ...a, b }`, `map`, `filter`, `reduce` with a fresh accumulator). MUST NOT use `let`, in-place `push`/`splice`/`delete`, or mutating `sort` on shared or validated data. | Cross-request state leaks, shared-object corruption |
| STY-4 | MUST NOT keep per-request or per-tenant state in module-level variables or singletons. Hold it in arguments, request scope, or the store. | Data leaking between users or tenants |
| STY-5 | MUST confine side effects to the shell: one function per effect, named for it (`insertInvoice`, `writeAuditLog`), called after the pure decision returns. Security-relevant effects (audit log, rate-limit counter, session revocation) MUST stay explicit and MUST NOT be removed to look pure. | Missing audit trail, bypassed controls |
| STY-6 | MUST use atomic mutation where concurrency matters: a conditional `UPDATE ... WHERE`, a transaction, an idempotency key, or a lock. MUST NOT split read, compute, and write across separate calls to stay "immutable". | Race conditions, double spend, overselling |
| STY-7 | MUST freeze or `readonly`-type security configuration (allowlists, CORS origins, role maps) after startup. | Runtime tampering, prototype-pollution effects on policy |
| STY-8 | MUST prefer a named pure function over an imperative loop only when it is clearer; a loop is acceptable inside a pure function if it mutates only local variables never exposed. | Over-engineering that hides the real control |

```ts
const decideTransfer = (
  principal: Principal,
  request: Readonly<TransferRequest>,
  from: Readonly<Account>,
): Result<TransferPlan, TransferError> =>
  from.ownerId !== principal.id
    ? err('not_found')
    : request.amount > from.balance
      ? err('insufficient_funds')
      : ok({ fromId: from.id, toId: request.toId, amount: request.amount });

const executeTransfer = (plan: TransferPlan) =>
  db.$transaction((tx) =>
    tx.account.updateMany({
      where: { id: plan.fromId, balance: { gte: plan.amount } },
      data: { balance: { decrement: plan.amount } },
    }),
  );
```

The decision is pure and immutable (STY-1, STY-2). The mutation is one atomic conditional update inside a transaction (STY-6), so the balance check cannot race.
