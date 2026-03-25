# Test Suite Template (AAA + Setup)

Declarative test structure for Use Cases and Services. Supports both **Jest** (`jest-mock-extended`) and **Vitest** (`vitest-mock-extended`).

## Test Runner Detection

Detect the test runner from the project configuration and use the corresponding mock library:

| Config file | Runner | Mock import |
|---|---|---|
| `jest.config.ts` / `jest.config.js` | Jest | `import { mock } from 'jest-mock-extended'` |
| `vitest.config.ts` / `vite.config.ts` with test | Vitest | `import { mock } from 'vitest-mock-extended'` |

## Structure

```typescript
// Adjust import based on detected test runner
import { mock } from 'jest-mock-extended'; // or 'vitest-mock-extended'
import { faker } from '@faker-js/faker';
import { ProcessOrder } from './process-order.use-case';
import { InMemoryOrderRepository } from './in-memory-order.repository';
import { type PaymentService } from './payment.service';
import { type NotificationService } from './notification.service';
import { OrderFactory } from './order.factory';
import { Order } from './order';

const VALID_INPUT = {
  orderId: faker.string.uuid(),
  amount: 10000,
  currency: 'USD',
  customer: {
    email: faker.internet.email(),
    fullName: faker.person.fullName(),
  },
};

const setup = () => {
  const repository = new InMemoryOrderRepository();
  const paymentService = mock<PaymentService>();
  const notificationService = mock<NotificationService>();
  const useCase = new ProcessOrder(repository, paymentService, notificationService);
  return { repository, paymentService, notificationService, useCase };
};

describe('ProcessOrder', () => {
  it('should process order and persist when payment succeeds', async () => {
    // Arrange
    const { repository, paymentService, useCase } = setup();
    const orderPrimitives = OrderFactory.build({ amount: 10000 });
    const order = Order.fromPrimitives(orderPrimitives);
    await repository.save(order);

    paymentService.charge.mockResolvedValue({ status: 'SUCCESS' });

    // Act
    const result = await useCase.run({ orderId: order.id.value });

    // Assert — state verification on the Fake
    const saved = await repository.findById(order.id);
    expect(saved?.status.value).toBe('COMPLETED');
    expect(paymentService.charge).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 10000 }),
    );
  });

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

  it('should mark order as failed when payment is rejected', async () => {
    // Arrange
    const { repository, paymentService, useCase } = setup();
    const order = Order.fromPrimitives(OrderFactory.build());
    await repository.save(order);

    paymentService.charge.mockResolvedValue({ status: 'REJECTED' });

    // Act
    const result = await useCase.run({ orderId: order.id.value });

    // Assert
    const saved = await repository.findById(order.id);
    expect(saved?.status.value).toBe('PAYMENT_FAILED');
  });

  describe('Input Validation', () => {
    it('should throw error when input is null', async () => {
      // Arrange
      const { useCase } = setup();

      // Act & Assert
      await expect(useCase.run(null as any)).rejects.toThrow();
    });

    it('should throw error when orderId is empty', async () => {
      // Arrange
      const { useCase } = setup();

      // Act & Assert
      await expect(useCase.run({ orderId: '' })).rejects.toThrow();
    });
  });
});
```

## Rules

1. **`setup()` function**: Every test suite MUST have a `const setup = () => { ... }` that initializes Fakes, mocks, and the SUT. Returns a destructurable object.
2. **AAA structure**: Every test MUST use `// Arrange`, `// Act`, `// Assert` comments explicitly.
3. **Naming convention**: Use natural language in `it()` strings — `'should [behaviour] when [scenario]'`. No underscores.
4. **VALID_INPUT constant**: Define reusable input objects at the top of the file for common valid inputs. Override with spread for variations.
5. **State verification**: Assert on Fake repository state (`repository.findById`), not just mock call counts.
6. **Mock the interface**: Use `mock<InterfaceType>()`, never mock concrete implementations.
7. **Nested describes**: Group related scenarios under `describe('Input Validation')`, `describe('Error Handling')`, etc.
8. **Zero logic in tests**: No `if`, `for`, or ternary. Complex data belongs in the Factory.
9. **Minimum 3 cases**: Happy path + entity not found + business logic error. Add input validation group as needed.
