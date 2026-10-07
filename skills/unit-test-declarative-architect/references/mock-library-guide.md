# Mock Library Guide

How to use `jest-mock-extended` (Jest) and `vitest-mock-extended` (Vitest) well. Rules for fakes, call order, and fresh `setup()` live in `TST-*` and `DET-*` (see `test-quality-rules.md` and `determinism-and-async.md`); this file only adds library usage.

## Rules

| ID | Rule | Failure it prevents |
|---|---|---|
| MOCK-1 | MUST import from the library that matches the runner: `vitest-mock-extended` in Vitest, `jest-mock-extended` in Jest. MUST NOT mix them, and MUST NOT use `jest.fn` or `vi.fn` to build port mocks. | Runtime errors or mocks bound to the wrong runner. |
| MOCK-2 | MUST type mocks from the port interface: `mock<PaymentGateway>()`, or `MockProxy<PaymentGateway>` for a typed variable. MUST NOT mock concrete classes. | Stubs that compile against the wrong shape. |
| MOCK-3 | MUST stub with `calledWith(...)` when the result depends on the arguments. MUST NOT use a blanket `mockResolvedValue` there. Use literals or matchers (`any()`, `anyString()`, `anyNumber()`, `isA(Class)`; collection matchers have different names per library, so check the library's exports before using one). | A test that passes for any argument, hiding wrong ids, amounts, or reasons. |
| MOCK-4 | MUST stub async ports as `port.method.calledWith(...).mockResolvedValue(...)` or `.mockRejectedValue(...)`. When several entries match, the later registration wins, so register the general case first and the specific case after. | A specific stub silently shadowed by a general one. |
| MOCK-5 | MUST make the mock strict when an unstubbed call returning `undefined` could hide a bug: pass `{ fallbackMockImplementation: () => { throw new Error('unexpected call') } }` as the second argument of `mock` (works with `mockDeep`). | An unexpected call to a port passing silently. |
| MOCK-6 | MUST use `captor<T>()` to assert the structure of an argument the SUT builds internally. Assert `captor.value` (last call) or `captor.values` (all calls) with `toStrictEqual`. | Tests that cannot see internally built objects and fall back to `expect.anything()` (TST-9). |
| MOCK-7 | SHOULD use `mockDeep<T>()` only for genuinely nested SDK-style objects. Prefer a flat port. Pass `{ funcPropSupport: true }` only for function members that also carry properties. | Deep mocks coupling tests to a vendor object graph. |
| MOCK-8 | MUST build mocks in a fresh `setup()` per test (DET-8). Use `mockReset(m)` only when a module-level mock is unavoidable. `mockClear(m)` clears call history only and keeps implementations. | Stubs and call history leaking between tests. |
| MOCK-9 | MUST NOT mock a port member named `then`: the library ignores `then` by default so mocks are not treated as thenables. Only when a port truly has a `then` member, call `VitestMockExtended.configure({ ignoreProps: [] })` and `VitestMockExtended.resetConfig()` in `afterEach`. | A mock awaited as a promise that never settles, or a surprising `undefined` member. |
| MOCK-10 | MUST check version compatibility before installing or upgrading: read the project's installed `vitest` or `jest`, and run `npm view vitest-mock-extended peerDependencies` (or `jest-mock-extended`). MUST NOT guess a mapping. Current `vitest-mock-extended` 5.x requires `vitest >= 4`. | Peer dependency errors or a mock library built for another runner major. |

Unstubbed calls return `undefined` by default, which is why MOCK-3 and MOCK-5 exist.

## Vitest

```typescript
import { anyString, captor, mock, type MockProxy } from 'vitest-mock-extended';

const setup = () => {
  // MOCK-5: unexpected calls fail loudly
  const gateway: MockProxy<PaymentGateway> = mock<PaymentGateway>(
    {},
    { fallbackMockImplementation: () => { throw new Error('unexpected call'); } },
  );
  const audit = mock<AuditLogger>();
  return { gateway, audit, useCase: new RefundOrder(gateway, audit) };
};

// MOCK-3, MOCK-4: argument-specific async stub
gateway.refund.calledWith(orderId, 5000, anyString()).mockResolvedValue({ status: 'REFUNDED' });

// MOCK-6: capture an internally built argument
const eventCaptor = captor<AuditEvent>();
audit.record.calledWith(eventCaptor).mockResolvedValue(undefined);
// ...Act...
expect(eventCaptor.value).toStrictEqual({ type: 'ARTICLE_PUBLISHED', articleId });
```

## Jest

Same API; only the import source and the config object change.

```typescript
import { anyString, captor, mock, type MockProxy } from 'jest-mock-extended';

const gateway = mock<PaymentGateway>(
  {},
  { fallbackMockImplementation: () => { throw new Error('unexpected call'); } },
);
gateway.refund.calledWith(orderId, 5000, anyString()).mockResolvedValue({ status: 'REFUNDED' });
```

For MOCK-9 in Jest, the equivalent is `JestMockExtended.configure({ ignoreProps: [] })` and `JestMockExtended.resetConfig()`.
