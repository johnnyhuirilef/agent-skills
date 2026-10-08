---
name: unit-test-declarative-architect
description: "Trigger: writing unit tests, Fishery factories, jest-mock-extended / vitest-mock-extended mocks, or In-Memory repository fakes for TypeScript use cases. Produces declarative AAA tests."
license: Apache-2.0
metadata:
  author: "johnnyhuirilef"
  version: "2.0"
---

# Unit Test Declarative Architect

## Activation Contract

Load to write, extend, or review unit tests for a use case or service, or to create Fishery factories or In-Memory repository fakes.

## Hard Rules

- Detect the runner first: `jest.config.*` means Jest + `jest-mock-extended`; `vitest.config.*` or `vite.config.*` with a test block means Vitest + `vitest-mock-extended`. Ask if unclear. Mock ports with `mock<Port>()`, never `jest.fn`/`vi.fn` (MOCK-1).
- Detect error handling: `Promise<Result<T, E>>` follows `references/result-type-testing.md`; throwing use cases use `rejects.toThrow()`. One style per suite.
- Every suite has `const setup = () => {...}` returning Fakes, mocks, and the SUT. Every test has `// Arrange`, `// Act`, `// Assert` and a name like `'should [behaviour] when [scenario]'`.
- Test only the public interface. Reuse existing factories and fakes; never duplicate.
- Repositories are `InMemory[Entity]Repository` Fakes; assert persisted state. Mock only outbound side-effect ports; assert outcomes, not call order (TST-1, TST-2).
- No `if` or `for` in a test body; many cases use an `it.each` / `test.each` table of named rows (TST-3, TST-4, TST-5).
- Cover happy path, not found, business error, and input validation, plus edge cases that apply (TST-6, TST-7).
- Never read the real clock or randomness: inject Clock/ID ports, use fake timers, seed Faker (DET-1 to DET-3). Await every promise (DET-4); never sleep, advance fake timers (DET-5).
- A fresh `setup()` per test, no shared or external state; restore timers and mocks (DET-8, DET-9).
- One behavior per test; use `toStrictEqual`; no large snapshots (TST-8, TST-9).
- Stub with `calledWith` when results depend on arguments (MOCK-3); strict mocks via `fallbackMockImplementation` when a silent `undefined` could hide a bug (MOCK-5); `captor` for internally built arguments (MOCK-6).
- Before installing or upgrading the mock library, check its runner peer version (MOCK-10).
- Challenge the user when the use case violates SRP.
- Follow the STRICT 2-turn workflow below. Never write the suite in Turn 1.

## Decision Gates

| Situation | Load |
|---|---|
| Time, dates, randomness, retries, debounce, async | `references/determinism-and-async.md` |
| Parameterized cases, edge cases, assertions, mock vs fake | `references/test-quality-rules.md` |
| Argument-dependent stubs, strict mocks, captured arguments, or installing the mock library | `references/mock-library-guide.md` |
| Suite finished | `references/verify-tests.md` |
| Use case returns `Result` | `references/result-type-testing.md` |
| Building factories | `references/factory-template.md` |
| Building fakes | `references/repository-fake-template.md` |
| Suite structure | `references/test-template.md` |

## Execution Steps

1. Identify the use case, dependencies, entities, runner, and error style; find existing factories and fakes.
2. Load the references matched by the Decision Gates.
3. Turn 1: create or update only the missing Fishery factory and In-Memory fake, name reused ones, then STOP and ask the user to confirm.
4. Turn 2, only after approval: write `setup()`, `VALID_INPUT`, and the AAA test cases.
5. Verify and report per `references/verify-tests.md` (VER-1 to VER-5); never claim unrun code green.

## Output Contract

- Turn 1: new or updated factory and fake code, reused paths, and one confirmation question. No tests.
- Turn 2: the complete test suite, then the rule IDs applied and the edge cases covered or skipped with reason.

## References

- [determinism-and-async.md](references/determinism-and-async.md)
- [test-quality-rules.md](references/test-quality-rules.md)
- [mock-library-guide.md](references/mock-library-guide.md)
- [verify-tests.md](references/verify-tests.md)
- [result-type-testing.md](references/result-type-testing.md)
- [factory-template.md](references/factory-template.md)
- [repository-fake-template.md](references/repository-fake-template.md)
- [test-template.md](references/test-template.md)
