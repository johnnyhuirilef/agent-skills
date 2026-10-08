# Generation prompt

Each candidate is one fresh agent session (no shared context) given this prompt. Replace the placeholders:

- `<skill>`: path to the skill under test, e.g. `skills/unit-test-declarative-architect`
- `<project>`: the candidate dir created by `./new-project.sh <label>-<uc>-<sample>`
- `<uc>` / `<File>`: one row of the use-case map below

| `<uc>` | `<File>` |
|---|---|
| `auth` | `ResetPassword` |
| `billing` | `ChargeSubscription` |
| `transfer` | `TransferFunds` |

```text
Read <skill>/SKILL.md and follow it (load only the references it tells you to load).
Then write unit tests for the use case src/<uc>/<File>.ts in <project>.
I approve your Turn 1 proposal in advance; no user is available to answer questions.
Put spec files under tests/<uc>/ and factories/fakes under tests/support/.
Run npx vitest run in <project> until the suite passes.
You may temporarily break src/ to prove tests can fail, but restore it exactly afterwards.
```

Record the total tokens each session used if you want to compare cost between skill versions.
