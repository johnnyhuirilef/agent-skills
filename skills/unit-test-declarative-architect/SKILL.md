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

Load when asked to write, extend, or review unit tests for a use case or service, or to create Fishery factories or In-Memory repository fakes.

## Hard Rules

- Detect the runner first: `jest.config.*` means Jest + `jest-mock-extended`; `vitest.config.*` or `vite.config.*` with a test block means Vitest + `vitest-mock-extended`. Ask if unclear.
- Detect error handling: `Promise<Result<T, E>>` follows `references/result-type-testing.md`; throwing use cases use `rejects.toThrow()`.
- Every suite has `const setup = () => {...}` returning Fakes, mocks, and the SUT. Every test has `// Arrange`, `// Act`, `// Assert` and a name like `'should [behaviour] when [scenario]'`.
- Test only the public interface (black box). Reuse existing factories and fakes; never duplicate.
- Repositories are `InMemory[Entity]Repository` Fakes; assert persisted state. Mock only outbound side-effect ports, and assert outcomes, not call order (TST-1, TST-2).
- No `if` or `for` in a test body. Many cases use `it.each` / `test.each` with a declarative table (TST-3, TST-4).
- Cover happy path, not found, business error, and input validation, plus edge cases that apply (TST-6, TST-7).
- Never read the real clock or randomness: inject Clock/ID ports, use fake timers, seed Faker (DET-1, DET-2, DET-3). Await every promise (DET-4, DET-5).
- A fresh `setup()` per test; restore timers and mocks (DET-8, DET-9).
- One behavior per test; use `toStrictEqual`; no large snapshots (TST-8, TST-9).
- Stub with `calledWith` when results depend on arguments (MOCK-3); make mocks strict with `fallbackMockImplementation` when a silent `undefined` could hide a bug (MOCK-5); use `captor` for internally built arguments (MOCK-6).
- Check the mock library against the installed runner version before installing or upgrading (MOCK-10).
- Run the suite, then break the SUT or negate an assertion to see each test fail for the right reason, then restore (VER-1 to VER-5). If code cannot be run, say so; never claim green.
- Challenge the user when the use case violates SRP.
- Follow the STRICT 2-turn workflow below. Never write the suite in Turn 1.

## Decision Gates

| Situation | Load |
|---|---|
| Time, dates, randomness, retries, debounce, async | `references/determinism-and-async.md` |
| Parameterized cases, edge cases, assertions, mock vs fake | `references/test-quality-rules.md` |
| Argument-dependent stubs, strict mocks, captured arguments, deep mocks, or installing the mock library | `references/mock-library-guide.md` |
| Suite finished | `references/verify-tests.md` |
| Use case returns `Result` | `references/result-type-testing.md` |
| Building factories | `references/factory-template.md` |
| Building fakes | `references/repository-fake-template.md` |
| Suite structure | `references/test-template.md` |

## Execution Steps

1. Analyze: identify the use case, dependencies, entities, runner, and error style; search for existing factories and fakes.
2. Load the references matched by the Decision Gates.
3. Turn 1: create or update the Fishery factory and the In-Memory fake, then STOP and ask the user to confirm them.
4. Turn 2, only after approval: write `setup()`, `VALID_INPUT`, and the AAA test cases.
5. Verify per `references/verify-tests.md` before reporting.

## Output Contract

- Turn 1: factory code, fake code, and one confirmation question. No tests.
- Turn 2: the complete test suite, then a list of the rule IDs applied and the edge cases covered or skipped with reason.
- Verification: report `<command>: <observed result>` for the suite run and the break-and-restore check. If code cannot be run, say so; never claim green.

## References

- [determinism-and-async.md](references/determinism-and-async.md)
- [test-quality-rules.md](references/test-quality-rules.md)
- [mock-library-guide.md](references/mock-library-guide.md)
- [verify-tests.md](references/verify-tests.md)
- [result-type-testing.md](references/result-type-testing.md)
- [factory-template.md](references/factory-template.md)
- [repository-fake-template.md](references/repository-fake-template.md)
- [test-template.md](references/test-template.md)
