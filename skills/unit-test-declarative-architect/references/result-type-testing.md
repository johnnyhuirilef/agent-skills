# Result Type Testing Patterns

Reference for testing Use Cases that return `Result<T, E>` types (neverthrow, oxide.ts, or custom implementations) instead of throwing exceptions.

## Result Type API (neverthrow)

```typescript
// Boolean checks (safe — no throw)
result.isOk()              // → true if success
result.isErr()             // → true if error

// Type narrowing (safe — after isOk/isErr check)
if (result.isOk()) {
  result.value;            // → typed access to the Ok value
}
if (result.isErr()) {
  result.error;            // → typed access to the Err value
}

// Safe extraction
result.unwrapOr(default)   // → returns Ok value, or default if Err
result.match(
  (val) => handleOk(val),  // → runs if Ok
  (err) => handleErr(err), // → runs if Err
);

// Unsafe extraction (acceptable in tests only)
result._unsafeUnwrap()     // → returns Ok value (throws if Err)
result._unsafeUnwrapErr()  // → returns Err value (throws if Ok)
```

## Recommended Assertion Patterns

### Pattern 1: Type Narrowing (preferred for type-safe assertions)

```typescript
it('should process order successfully when payment is approved', async () => {
  // Arrange
  const { repository, paymentService, useCase } = setup();
  const order = Order.fromPrimitives(OrderFactory.build({ amount: 5000 }));
  await repository.save(order);

  paymentService.charge.mockResolvedValue({ status: 'APPROVED' });

  // Act
  const result = await useCase.run({ orderId: order.id.value });

  // Assert
  expect(result.isOk()).toBe(true);
  if (!result.isOk()) return; // type guard — narrows to Ok

  expect(result.value.status).toBe('COMPLETED');

  // State verification on the Fake
  const saved = await repository.findById(order.id);
  expect(saved?.status.value).toBe('COMPLETED');
});
```

### Pattern 2: Unsafe Unwrap (concise for tests where you expect a specific branch)

```typescript
it('should calculate score when all data is valid', async () => {
  // Arrange
  const { useCase } = setup();
  const input = ScoreInputFactory.build();

  // Act
  const result = await useCase.run(input);

  // Assert
  expect(result.isOk()).toBe(true);

  const value = result._unsafeUnwrap();
  expect(value.score).toBeGreaterThan(0);
  expect(value.calculatedAt).toBeDefined();
});
```

### Pattern 3: Match (useful when asserting both branches in related tests)

```typescript
it('should return calculated score when input is valid', async () => {
  // Arrange
  const { useCase } = setup();
  const input = ScoreInputFactory.build();

  // Act
  const result = await useCase.run(input);

  // Assert
  result.match(
    (value) => {
      expect(value.score).toBeGreaterThan(0);
    },
    (error) => {
      fail(`Expected Ok but got Err: ${error.message}`);
    },
  );
});
```

## Error Path — Result Failure

```typescript
it('should return error when order does not exist', async () => {
  // Arrange
  const { useCase } = setup();

  // Act
  const result = await useCase.run({ orderId: faker.string.uuid() });

  // Assert
  expect(result.isErr()).toBe(true);

  const error = result._unsafeUnwrapErr();
  expect(error.message).toContain('not found');
});

it('should return domain error when business rule is violated', async () => {
  // Arrange
  const { repository, useCase } = setup();
  const order = Order.fromPrimitives(OrderFactory.build({ status: 'CANCELLED' }));
  await repository.save(order);

  // Act
  const result = await useCase.run({ orderId: order.id.value });

  // Assert
  expect(result.isErr()).toBe(true);

  const error = result._unsafeUnwrapErr();
  expect(error.isInvalidState()).toBe(true);
  expect(error.context.cause).toContain('Cannot process a cancelled order');
});
```

## Exception-Based Equivalent (for comparison)

When the Use Case throws exceptions instead of returning Result types:

```typescript
it('should throw when order does not exist', async () => {
  // Arrange
  const { useCase } = setup();

  // Act & Assert
  await expect(
    useCase.run({ orderId: faker.string.uuid() }),
  ).rejects.toThrow('not found');
});

it('should throw domain error when business rule is violated', async () => {
  // Arrange
  const { repository, useCase } = setup();
  const order = Order.fromPrimitives(OrderFactory.build({ status: 'CANCELLED' }));
  await repository.save(order);

  // Act & Assert
  await expect(
    useCase.run({ orderId: order.id.value }),
  ).rejects.toThrow(InvalidStateError);
});
```

## Detection Rule

Determine the error handling pattern from the Use Case's return type:

| Return type | Pattern | Assert style |
|---|---|---|
| `Promise<Result<T, E>>` | Functional | `result.isOk()` / `result.isErr()` |
| `Promise<T>` (throws) | Exception | `rejects.toThrow()` |

Check the Use Case file's return type before generating tests. Never mix patterns within the same test suite.
