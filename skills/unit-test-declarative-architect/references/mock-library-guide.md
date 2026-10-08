# Mock Library Guide

How to use `jest-mock-extended` (Jest) and `vitest-mock-extended` (Vitest) well. Rules for fakes, call order, a fresh `setup()`, and mock resets live in `TST-*` and `DET-*` (see `test-quality-rules.md` and `determinism-and-async.md`, DET-8); this file only adds library usage.

## Rules

| ID | Rule | Failure it prevents |
|---|---|---|
| MOCK-1 | MUST import from the library that matches the runner: `vitest-mock-extended` in Vitest, `jest-mock-extended` in Jest, never both. MUST type each mock from the port interface (`mock<PaymentGateway>()`), never from a concrete class, and MUST NOT build port mocks with `jest.fn` or `vi.fn`. | Runtime errors, mocks bound to the wrong runner, or stubs that compile against the wrong shape. |
| MOCK-3 | MUST stub with `calledWith(...)` when the result depends on the arguments, and stub async ports with `.mockResolvedValue(...)` / `.mockRejectedValue(...)` on it. MUST NOT use a blanket `mockResolvedValue` there. Use literals or matchers (`any()`, `anyString()`, `anyNumber()`, `isA(Class)`; collection matchers have different names per library, so check the library's exports before using one). When several stubs match one call, the last registered wins: register the general case first and the specific case after. | A test that passes for any argument, hiding wrong ids, amounts, or reasons; a specific stub silently shadowed by a general one. |
| MOCK-5 | MUST make the mock strict when an unstubbed call returning `undefined` could hide a bug: pass `{ fallbackMockImplementation: () => { throw new Error('unexpected call') } }` as the second argument of `mock` (`mockDeep` takes it as its first argument). | An unexpected call to a port passing silently. |
| MOCK-6 | MUST use `captor<T>()` to assert the structure of an argument the SUT builds internally. Assert `captor.value` (last call) or `captor.values` (all calls) with `toStrictEqual`. | Tests that cannot see internally built objects and fall back to `expect.anything()` (TST-9). |
| MOCK-10 | MUST check version compatibility before installing or upgrading: read the project's installed `vitest` or `jest`, and run `npm view vitest-mock-extended peerDependencies` (or `jest-mock-extended`). MUST NOT guess a mapping. For example, `vitest-mock-extended` 5.1.1 declares `vitest >= 4.0.0`. | Peer dependency errors or a mock library built for another runner major. |

Unstubbed calls return `undefined` by default, which is why MOCK-3 and MOCK-5 exist.

## Vitest

```typescript
import { captor, mock } from 'vitest-mock-extended';
import { type AuditLogger, type RefundEvent } from './audit-logger';
import { type PaymentGateway } from './payment-gateway';
import { RefundOrder } from './refund-order.use-case';

const setup = () => {
  // MOCK-5: unexpected calls fail loudly
  const gateway = mock<PaymentGateway>(
    {},
    { fallbackMockImplementation: () => { throw new Error('unexpected call'); } },
  );
  const audit = mock<AuditLogger>();
  return { gateway, audit, useCase: new RefundOrder(gateway, audit) };
};

it('should record the refund event when the gateway refunds the order', async () => {
  // Arrange
  const { gateway, audit, useCase } = setup();
  // MOCK-3: argument-specific async stub
  gateway.refund.calledWith('order-1', 5000, 'damaged').mockResolvedValue({ status: 'REFUNDED' });
  // MOCK-6: capture an internally built argument
  const eventCaptor = captor<RefundEvent>();
  audit.record.calledWith(eventCaptor).mockResolvedValue(undefined);

  // Act
  await useCase.run({ orderId: 'order-1', amount: 5000, reason: 'damaged' });

  // Assert
  expect(eventCaptor.value).toStrictEqual({ type: 'ORDER_REFUNDED', orderId: 'order-1', amount: 5000 });
});
```

## Jest

Same API; only the import source changes. Stubs, matchers, and `captor` work as in the Vitest example.

```typescript
import { mock } from 'jest-mock-extended';
import { type AuditLogger } from './audit-logger';
import { type PaymentGateway } from './payment-gateway';
import { RefundOrder } from './refund-order.use-case';

const setup = () => {
  const gateway = mock<PaymentGateway>(
    {},
    { fallbackMockImplementation: () => { throw new Error('unexpected call'); } },
  );
  const audit = mock<AuditLogger>();
  return { gateway, audit, useCase: new RefundOrder(gateway, audit) };
};
```
