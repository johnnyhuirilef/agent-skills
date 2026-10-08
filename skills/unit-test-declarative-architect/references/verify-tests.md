# Verify Tests Before Finishing

A green suite proves nothing until each test is shown able to fail.

| ID | Rule | Failure it prevents |
|---|---|---|
| VER-1 | MUST run the suite for the new file with the project's runner and report the command and result. | Delivering tests that do not compile or run |
| VER-2 | MUST break the SUT (change a condition, drop a save) or negate one assertion, rerun, and see the matching test fail for the expected reason. | Tests that pass vacuously |
| VER-3 | MUST restore the code exactly after each break and rerun to green. | Leaving a sabotaged SUT behind |
| VER-4 | MUST check each failure message names the intended behavior, not a setup error. | Tests failing for the wrong reason |
| VER-5 | MUST state plainly when code cannot be run, list what was not verified, and MUST NOT claim the suite passes. | False confidence |

## Procedure

1. Run the suite (`npx jest path` or `npx vitest run path`); expect green.
2. For each test or group, apply one break to the SUT or flip one assertion.
3. Rerun; expect red with a relevant message.
4. Restore, rerun, expect green.
5. Report: `<command>: <observed result>` for the green run and for each break.

If you cannot execute code, report: "Not run: tests unverified. Run `<command>` and check the break-and-restore step."
