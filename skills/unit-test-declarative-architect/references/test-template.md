# Test Suite Template (AAA + Setup)

Declarative test structure for Use Cases and Services. Supports both **Jest** (`jest-mock-extended`) and **Vitest** (`vitest-mock-extended`).

## Test Runner Detection

Detect the test runner from the project configuration and use the corresponding mock library:

| Config file | Runner | Mock import |
|---|---|---|
| `jest.config.ts` / `jest.config.js` | Jest | `import { mock } from 'jest-mock-extended'` |
| `vitest.config.ts` / `vite.config.ts` with test | Vitest | `import { mock } from 'vitest-mock-extended'` |

## Structure

This template uses the exception style: the use case throws. For a use case that returns `Result`, keep the same structure and use the assertions in `result-type-testing.md`. Never mix both styles in one suite.

```typescript
// Adjust import based on detected test runner
import { mock } from 'jest-mock-extended'; // or 'vitest-mock-extended'
import { InvalidOrderStateError, OrderNotFoundError, ValidationError } from './errors';
import { InMemoryOrderRepository } from './in-memory-order.repository';
import { Order } from './order';
import { OrderFactory } from './order.factory';
import { type PaymentService } from './payment.service';
import { ProcessOrder, type ProcessOrderInput } from './process-order.use-case';

const VALID_INPUT: ProcessOrderInput = { orderId: 'order-1', paymentToken: 'tok-visa' };

const setup = () => {
  const repository = new InMemoryOrderRepository();
  const paymentService = mock<PaymentService>();
  const useCase = new ProcessOrder(repository, paymentService);
  return { repository, paymentService, useCase };
};

describe('ProcessOrder', () => {
  it('should complete the order when the payment is approved', async () => {
    // Arrange
    const { repository, paymentService, useCase } = setup();
    const order = Order.fromPrimitives(OrderFactory.build({ amount: 10000 }));
    await repository.save(order);
    paymentService.charge
      .calledWith(order.id.value, 10000, VALID_INPUT.paymentToken)
      .mockResolvedValue({ status: 'APPROVED' });

    // Act
    await useCase.run({ ...VALID_INPUT, orderId: order.id.value });

    // Assert
    const saved = await repository.findById(order.id);
    expect(saved?.status).toBe('COMPLETED');
  });

  it('should reject when the order does not exist', async () => {
    // Arrange
    const { useCase } = setup();

    // Act
    const promise = useCase.run(VALID_INPUT);

    // Assert
    await expect(promise).rejects.toThrow(OrderNotFoundError);
  });

  it('should reject when the order is cancelled', async () => {
    // Arrange
    const { repository, useCase } = setup();
    const order = Order.fromPrimitives(OrderFactory.build({ status: 'CANCELLED' }));
    await repository.save(order);

    // Act
    const promise = useCase.run({ ...VALID_INPUT, orderId: order.id.value });

    // Assert
    await expect(promise).rejects.toThrow(InvalidOrderStateError);
  });

  describe('Input Validation', () => {
    it.each([
      { name: 'orderId is empty', input: { ...VALID_INPUT, orderId: '' } },
      { name: 'paymentToken is empty', input: { ...VALID_INPUT, paymentToken: '' } },
    ])('should reject the input when $name', async ({ input }) => {
      // Arrange
      const { useCase } = setup();

      // Act
      const promise = useCase.run(input);

      // Assert
      await expect(promise).rejects.toThrow(ValidationError);
    });
  });
});
```
