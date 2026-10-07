# Determinism, Async, and Isolation

Tests must give the same result on every run, on any machine, in any order.

| ID | Rule | Failure it prevents |
|---|---|---|
| DET-1 | MUST inject time and ID generation as ports (`Clock`, `IdGenerator`) when the use case reads them. MUST NOT call `new Date()`, `Date.now()`, or `Math.random()` inside a test's expected values. | Flaky tests at midnight, month ends, or across time zones |
| DET-2 | MUST fix the system time with fake timers when the SUT reads the clock directly: `jest.useFakeTimers().setSystemTime(...)` or `vi.useFakeTimers(); vi.setSystemTime(...)`. | Expiry tests that pass today and fail tomorrow |
| DET-3 | MUST seed Faker once per factory file (`faker.seed(123)`) so generated data is reproducible. | Intermittent failures from rare random values (empty name, huge number) |
| DET-4 | MUST `await` every async call and assertion. MUST use `await expect(p).rejects.toThrow(...)`. MUST NOT leave floating promises. | Tests that pass before the work finishes; unhandled rejections |
| DET-5 | MUST NOT use `setTimeout` or real sleeps in tests. Advance fake timers instead. | Slow suites, timing-dependent failures |
| DET-6 | MUST test retry, backoff, and debounce with fake timers: start the call, advance time, then await the result. | Tests that wait real seconds or never exercise the delay |
| DET-7 | MUST NOT depend on test order, network, filesystem, or environment variables. | Order-dependent and machine-dependent failures |
| DET-8 | MUST create a fresh Fake, mocks, and SUT through `setup()` in each test. MUST NOT share mutable state at module or `describe` level. | State leaking between tests |
| DET-9 | MUST restore fake timers and mocks after each test: `afterEach(() => jest.useRealTimers())` or `afterEach(() => vi.useRealTimers())`. | Fake timers leaking into later tests |

## Fixed time

```ts
// Jest
beforeEach(() => { jest.useFakeTimers().setSystemTime(new Date('2025-01-15T10:00:00Z')); });
afterEach(() => { jest.useRealTimers(); });

// Vitest
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2025-01-15T10:00:00Z')); });
afterEach(() => { vi.useRealTimers(); });
```

## Retry with backoff

```ts
it('should retry three times when the gateway keeps failing', async () => {
  // Arrange
  const { gateway, useCase } = setup();
  gateway.charge.mockRejectedValue(new Error('timeout'));

  // Act
  const promise = useCase.run(VALID_INPUT);
  const assertion = expect(promise).rejects.toThrow('timeout');
  await vi.advanceTimersByTimeAsync(10_000); // jest: jest.advanceTimersByTimeAsync

  // Assert
  await assertion;
  expect(gateway.charge).toHaveBeenCalledTimes(3);
});
```

Attach the `rejects` assertion before advancing timers to avoid an unhandled rejection.
