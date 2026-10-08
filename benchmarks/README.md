# Benchmarks

Tools to measure a skill change instead of asserting it. Each tool compares skill versions on the same fixed inputs. Run the tool on the version before the change and on the version after it, then compare the numbers.

Requirements: Python 3 (standard library only), Node.js with npm. Run every Python script with `python3 -I`.

| Tool | Skill it measures | What it measures |
|---|---|---|
| [`unit-test-mutation/`](unit-test-mutation/) | `unit-test-declarative-architect` (or any unit-test skill) | How many planted bugs the generated tests catch |
| [`ddd-skill/`](ddd-skill/) | `ddd-typescript-architect` | Review recall and severity, false positives on clean code, implementation checks |
| [`skill-example-typecheck/`](skill-example-typecheck/) | `unit-test-declarative-architect` | `tsc` errors in the TypeScript examples inside the skill |

Generated files (candidate projects, responses, results, extracted blocks, `node_modules/`) are ignored by `benchmarks/.gitignore`.

## unit-test-mutation

**What it measures.** An agent uses the skill to write unit tests for a use case in a small TypeScript project (`base/src/`). The harness then applies each mutant from `mutants.json` (one planted bug, for example a flipped condition or a removed call) to the use case and runs the suite. A mutant is *killed* when a test that passes on the original source fails, disappears or times out under the mutant. There are 10 mutants for each use case:

| Use case | File |
|---|---|
| `auth` | `src/auth/ResetPassword.ts` |
| `billing` | `src/billing/ChargeSubscription.ts` |
| `transfer` | `src/transfer/TransferFunds.ts` |

The harness also records the test count, the base pass rate and whether `tsc --noEmit` passes. It always scores the tests against the pristine `base/src/`, so changes a candidate made to `src/` do not affect the score.

**How to run.**

```bash
cd benchmarks/unit-test-mutation
(cd base && npm ci)
python3 -I harness.py check                  # every mutant applies to exactly one place in base/src
./new-project.sh v4-auth-1                   # creates projects/v4-auth-1 (<label>-<usecase>-<sample>)
# run one fresh agent session with the prompt in PROMPT.md, pointed at projects/v4-auth-1
./runall.sh                                  # scores every projects/* dir into results/<name>.json
# or one project:
python3 -I harness.py run projects/v4-auth-1 auth results/v4-auth-1.json
```

**How to interpret.** `killed` is the main number (out of 10 for each project). A version comparison uses the same number of samples for each use case; the baselines below use 2 samples x 3 use cases = 60 mutants. Check `tests_failed` and `typecheck_ok` too: a suite that does not pass on the base source kills nothing.

### Hard tier

`mutants-hard.json` holds 31 harder mutants (10 for `auth`, 11 for `billing`, 10 for `transfer`) that a reasonable but not exhaustive suite can miss: exact backoff values and order, the exact idempotency key, save order and compensation, fire-and-forget versus awaited side effects, which error becomes the `cause`, the exact log entry, boundary and check-order semantics, and case or whitespace handling. It is a separate file, so the 30-mutant baseline stays comparable. Every hard mutant typechecks and changes behaviour through the use case's public API.

`oracle/<usecase>/` holds specs that pass on `base/src/` and kill every hard mutant (31/31). They are the proof that each mutant is killable, not a model answer: they target only the hard tier.

```bash
python3 -I harness.py check --mutants mutants-hard.json
./runall.sh mutants-hard.json                # scores every projects/* dir into results/mutants-hard/<name>.json
python3 -I harness.py run projects/v4-auth-1 auth results/v4-auth-1.hard.json --mutants mutants-hard.json
# re-prove the oracle for one use case:
./new-project.sh oracle-auth-1 && cp -R oracle/auth projects/oracle-auth-1/tests/auth
python3 -I harness.py run projects/oracle-auth-1 auth results/oracle-auth-1.hard.json --mutants mutants-hard.json
```

Hard-tier scores of the suites behind the baseline below (`unit-test-declarative-architect`, 2 samples per use case; surviving mutants in brackets):

| Version | auth (of 10) | billing (of 11) | transfer (of 10) | Total |
|---|---|---|---|---|
| Original | 5 [HA3 HA4 HA5 HA7 HA8], 5 [HA3 HA4 HA5 HA7 HA8] | 8 [HB5 HB8 HB9], 6 [HB1 HB2 HB5 HB8 HB9] | 6 [HT2 HT3 HT8 HT10], 7 [HT3 HT8 HT10] | 37/62 (60%) |
| PR #2 before cleanup | 6 [HA3 HA4 HA5 HA8], 8 [HA4 HA5] | 8 [HB2 HB8 HB9], 9 [HB8 HB9] | 6 [HT3 HT6 HT8 HT10], 5 [HT2 HT3 HT6 HT8 HT10] | 42/62 (68%) |
| PR #2 after cleanup | 5 [HA3 HA4 HA5 HA6 HA8], 5 [HA3 HA4 HA5 HA6 HA8] | 9 [HB8 HB9], 9 [HB8 HB9] | 6 [HT2 HT3 HT8 HT10], 6 [HT2 HT3 HT8 HT10] | 40/62 (65%) |

The hard tier removes the ceiling (60-68% instead of 97%), but the gap between versions is 3 to 5 mutants with 2 samples, so it does not yet show that one version is better. HA4, HA5, HB8, HB9, HT3, HT8 and HT10 survived in all 6 suites of their use case; 15 hard mutants were killed by all 18 suites and do not separate versions.

### Stryker

**Why.** The hand-written mutants above come from the same author as the use cases, so they can share the author's blind spots, and there are only 30 + 31 of them. [Stryker](https://stryker-mutator.io/) generates mutants mechanically from its standard mutators (about 44-63 per use case), so nobody chooses which bugs to plant. Use it as the primary score; keep the hand-written tiers for the specific semantics Stryker does not mutate (exact backoff values, call order, which error becomes the `cause`).

**How to run.** `stryker.config.mjs` is shared. `stryker-run.sh` runs Stryker from inside one candidate project with the vitest runner, mutates only `src/<usecase>/**/*.ts` (minus the type-only `ports.ts` and entity interfaces), runs only that project's `tests/**/*.spec.ts`, disables incremental mode, and writes the JSON report to `results/stryker/<project>.json`. The clear-text score table goes to stdout.

```bash
cd benchmarks/unit-test-mutation
(cd base && npm ci)                          # includes @stryker-mutator/core and vitest-runner
./new-project.sh v4-auth-1                   # then generate the tests as above
./stryker-run.sh projects/v4-auth-1 auth     # results/stryker/v4-auth-1.json
python3 -I stryker-summary.py                # every report in results/stryker/
```

`stryker-summary.py` takes the version from the dash field before the use case (`stk-orig-auth-1` is version `orig`). Score = (killed + timeout) / (total - compile errors - ignored). Set `STRYKER_CONCURRENCY` to change the worker count (default 4). One run takes a few seconds.

**Results.** The 18 suites behind the baseline (2 samples per use case, tests copied unchanged into fresh projects) and the hard-tier oracle as a reference:

| Version | auth | billing | transfer | Total |
|---|---|---|---|---|
| Original | 84/88 | 83/88 | 117/126 | 282+2/302 = 94.0% |
| PR #2 before cleanup | 88/88 | 85/88 | 117/126 | 288+2/302 = 96.0% |
| PR #2 after cleanup | 84/88 | 84/88 | 116/126 | 282+2/302 = 94.0% |
| Hard-tier oracle (1 suite each) | 29/44 | 32/44 | 46/63 | 107/151 = 70.9% |

Cells are killed + timeout over mutants, summed over the 2 samples. Every billing suite has 1 timeout; nothing is a compile or runtime error. The oracle scores low because it only targets the hard tier; it is not a full suite.

**Noise estimate** (`stryker-summary.py`, mutants paired by file, mutator, replacement and location within a use case):

| A vs B | Killed only by an A suite | Killed only by a B suite | Mutants A>B / B>A | Sign test p | Bootstrap 95% CI of A-B |
|---|---|---|---|---|---|
| Original vs before cleanup | 3 | 15 | 0 / 4 | 0.125 | -4.0 to +0.0 pp |
| Original vs after cleanup | 4 | 4 | 2 / 2 | 1.000 | -1.3 to +1.3 pp |
| Before vs after cleanup | 14 | 2 | 5 / 1 | 0.219 | +0.7 to +3.3 pp |

"Killed only by" sums over every cross-version suite pair (4 pairs per use case). Within a version, sample 1 and sample 2 disagree on 4 (original), 4 (before cleanup) and 0 (after cleanup) mutants. The sign test counts mutants whose detection rate differs between the two versions. The bootstrap resamples suites within each version and use case; with 2 suites per cell it has few distinct outcomes, so trust the sign test more. No version pair is significant: the 2-point lead of the version before cleanup comes from 4 to 6 mutants in `auth` and `billing`; `transfer` is level.

**Limits.**

- Equivalent mutants (a change that does not alter behaviour) survive for every suite, so they lower all versions by the same amount and do not bias a comparison, but they put a ceiling below 100%.
- 45 of the 48 surviving or uncovered mutants over the 18 suites are `StringLiteral` mutants that empty an error message (`TransferFunds.ts`, `ChargeSubscription.ts`, `ResetPassword.ts`). A suite that asserts the error class and not the message lets them survive. Whether that matters is a style choice, so these mutants measure assertion strictness more than bug detection.
- Stryker's standard mutators do not cover the hard-tier semantics (backoff values, call order, the `cause`), which is why the hard-tier oracle scores 71% here and the generated suites score 94-96% while missing hard mutants. Read both numbers.
- Only `src/<usecase>/` is mutated; `src/shared/` (errors, clock) is not.

## ddd-skill

**What it measures.** Fixed cases in `cases/<ID>/` (`prompt.txt` is the user request, `truth.json` is the answer key):

- `R1`-`R3`: review requests with planted defects. The scorer measures *recall* (the share of planted defects mentioned in the prose) and *severity* (the share of mentioned defects with an accepted severity label within 400 characters).
- `R4`, `R5`: review requests on clean code. The scorer counts false positives (lines that report a BLOCKER, CRITICAL, MAJOR or WARNING finding).
- `I1`-`I3`: implementation requests. The scorer runs regex checks against the fenced code only (checklist and comment lines removed).

**How to run.**

```bash
cd benchmarks/ddd-skill
python3 -I score.py --selftest               # scorer and answer keys are consistent
# generate responses with the prompt in PROMPT.md into responses/<ID>__<sample>.md
python3 -I score.py responses results.json   # per-response table and means by case
```

**How to interpret.** Recall and severity near 1.0 and zero false positives on `R4` and `R5` are the target. For `I*` cases, compare `checks_passed / checks_total`. Also read the `R5` answers yourself: the verdict (for example APPROVE or REFACTOR) shows whether the skill invents work on clean code, and the regex scorer does not grade it.

## skill-example-typecheck

**What it measures.** `extract.py` takes every `ts` / `typescript` fenced block from `SKILL.md` and `references/*.md` of a skill and typechecks it with `tsc --strict`. A block without its own imports gets a prelude that imports the stub types. Blocks are split into a Vitest group and a Jest group by the APIs they use. Blocks whose first line starts with `// Don't` (deliberate anti-examples) are excluded. The `stubs/` files model the SUT types that the `unit-test-declarative-architect` examples use (`Order`, `OrderFactory`, `ProcessOrder`, repositories, errors). For a different skill, write stubs for its example types first.

**How to run.**

```bash
cd benchmarks/skill-example-typecheck
npm ci
cd ../..
python3 -I benchmarks/skill-example-typecheck/extract.py skills/unit-test-declarative-architect
```

Output goes to `benchmarks/skill-example-typecheck/runs/<label>/` (default label `latest`; pass a second argument to keep several runs).

**How to interpret.** `TOTAL tsc errors` should be 0. Each error line names the generated block file (`block_<reference>_<n>.ts`), so you can find the source block in the skill.

## Known limits

- **Ceiling effect.** The mutation benchmark scored 58/60 for every version measured. It shows that a change did not make the tests worse, but it cannot show that a change made them better. Harder mutants are needed to separate versions.
- **Regex scorer.** The DDD scorer matches regexes, not meaning. A correct answer that uses different words can score as a miss, and a wrong answer that uses the expected words can score as a hit. Read a sample of responses before trusting a change in the numbers.
- **Small samples.** The baselines use 2 samples for each case or use case. Differences of one mutant or one check are within noise.
- **Token counts** come from the agent sessions, not from these tools. Record them yourself when you generate.

## Recorded baselines

### unit-test-mutation (`unit-test-declarative-architect`)

| Version | Mutants killed | Tests per suite | Tokens per generation |
|---|---|---|---|
| Original | 58/60 | 14.8 | 74.9k |
| PR #2 before cleanup | 58/60 | 17.8 | 83.8k |
| PR #2 after cleanup | 58/60 | 18.5 | 82.5k |

### ddd-skill (`ddd-typescript-architect`)

| Metric | Original | After conceptual audit |
|---|---|---|
| Review recall | 100% | 100% |
| Review severity | 100% | 100% |
| Implementation checks | 12/12 | 12/12 |
| R5 (clean code) verdicts, 2 samples | APPROVE + REFACTOR | APPROVE x2 |
| Tokens (14 comparable generations) | 82.9k | 77.5k |

### skill-example-typecheck (`unit-test-declarative-architect`)

| Version | tsc errors |
|---|---|
| Original (`main`) | 34 |
| PR #2 before cleanup | 48 |
| PR #2 after cleanup | 0 |

The stubs model the types of the cleaned-up examples, so part of the error count on older versions is stub mismatch rather than broken code. Compare versions with the same stubs only.
