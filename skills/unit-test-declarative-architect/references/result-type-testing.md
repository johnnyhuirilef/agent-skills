# Result Type Testing Patterns

For use cases that return `Promise<Result<T, E>>` instead of throwing. Keep the suite from `test-template.md` (`setup()`, `VALID_INPUT`, factories, Fakes); only the assertions change.

## API used in tests (neverthrow)

| Call | Returns |
|---|---|
| `result.isOk()` / `result.isErr()` | `true` when the result is Ok / Err |
| `result._unsafeUnwrap()` | the Ok value; throws if the result is Err |
| `result._unsafeUnwrapErr()` | the Err value; throws if the result is Ok |

`_unsafeUnwrap` and `_unsafeUnwrapErr` are neverthrow APIs. With another Result library, use its own unwrap calls in the same order: assert the Ok/Err check, then unwrap and assert the exact value. Never use `if` or `match` in the test body (TST-4).

## Ok Path

```typescript
it('should complete the order when the payment is approved', async () => {
  // Arrange
  const { repository, paymentService, useCase } = setup();
  const order = Order.fromPrimitives(OrderFactory.build({ amount: 5000 }));
  await repository.save(order);
  paymentService.charge
    .calledWith(order.id.value, 5000, VALID_INPUT.paymentToken)
    .mockResolvedValue({ status: 'APPROVED' });

  // Act
  const result = await useCase.run({ ...VALID_INPUT, orderId: order.id.value });

  // Assert
  expect(result.isOk()).toBe(true);
  expect(result._unsafeUnwrap()).toStrictEqual({ orderId: order.id.value, status: 'COMPLETED' });
  const saved = await repository.findById(order.id);
  expect(saved?.status).toBe('COMPLETED');
});
```

## Err Path

```typescript
it('should return OrderNotFoundError when the order does not exist', async () => {
  // Arrange
  const { useCase } = setup();

  // Act
  const result = await useCase.run(VALID_INPUT);

  // Assert
  expect(result.isErr()).toBe(true);
  expect(result._unsafeUnwrapErr()).toStrictEqual(new OrderNotFoundError(VALID_INPUT.orderId));
});

it('should return InvalidOrderStateError when the order is cancelled', async () => {
  // Arrange
  const { repository, useCase } = setup();
  const order = Order.fromPrimitives(OrderFactory.build({ status: 'CANCELLED' }));
  await repository.save(order);

  // Act
  const result = await useCase.run({ ...VALID_INPUT, orderId: order.id.value });

  // Assert
  expect(result.isErr()).toBe(true);
  expect(result._unsafeUnwrapErr()).toStrictEqual(new InvalidOrderStateError('CANCELLED'));
});
```
