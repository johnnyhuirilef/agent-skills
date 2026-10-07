# Test Quality Rules

| ID | Rule | Failure it prevents |
|---|---|---|
| TST-1 | MUST use an In-Memory Fake for repositories and stores. MUST mock only outbound side-effect ports (email, payment, logger, queue). | Tests coupled to repository call shapes |
| TST-2 | MUST assert outcomes and persisted state. MUST NOT assert call order or internal calls. Assert a mock call only for the outbound effect itself. | Refactors breaking tests with no behavior change |
| TST-3 | MUST use `it.each` / `test.each` with a declarative table when the same behavior runs on many inputs. | Copy-pasted tests that drift apart |
| TST-4 | MUST NOT put `if`, `for`, `switch`, or ternaries in a test body. Table rows hold data only. | Tests that need their own tests |
| TST-5 | MUST name each table row (a `name` field or `$name` in the title) so a failure identifies the case. | Opaque failures like `case 3` |
| TST-6 | MUST cover happy path, entity not found, business error, and input validation. | Missing basic failure modes |
| TST-7 | MUST walk the edge-case checklist below and cover each applicable item or state why it is skipped. | Untested boundaries and failure paths |
| TST-8 | MUST test one behavior per test; a test name with "and" signals a split. | Failures that do not point to a cause |
| TST-9 | MUST use `toStrictEqual` for objects and arrays. MUST NOT use large snapshots. MUST NOT use `expect.anything()` for fields the test is about. | Extra or undefined fields passing silently |
| TST-10 | MUST NOT over-specify mocks: stub only what the scenario needs. | Brittle arrange blocks |

## Edge-case checklist

| Category | Cases to consider |
|---|---|
| Boundaries | min, max, just below, just above, zero, negative |
| Empty and duplicate | empty string, empty list, duplicate entry, duplicate request |
| Idempotency and concurrency | same command twice, two commands on the same entity |
| Authorization | caller without permission, caller on another owner's entity |
| Dependency throws | a port rejects mid-flow; state stays consistent, error surfaces |
| Partial failure | step 2 of 3 fails; no half-written state, no duplicate side effect |
| Time | expired, exactly at expiry, not yet valid |

## Declarative table

```ts
it.each([
  { name: 'empty id', input: { orderId: '' } },
  { name: 'null input', input: null },
  { name: 'negative amount', input: { orderId: 'o-1', amount: -1 } },
])('should reject input when $name', async ({ input }) => {
  // Arrange
  const { useCase } = setup();

  // Act
  const promise = useCase.run(input as any);

  // Assert
  await expect(promise).rejects.toThrow();
});
```

## Outcome over call order

```ts
// Assert state, not the sequence of calls
expect(await repository.findById(id)).toStrictEqual(expected);
```
