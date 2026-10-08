Load when: the user pastes code or asks for a review, or a "refactor" request needs its brief review first.

# Review Mode

The mode gate itself is in `SKILL.md`. This file holds the review procedure, report template, finding fields, verdict rule and Grilling Loop.

## Severity scale

- **BLOCKER**: breaks a layering, identity, encapsulation or aggregate invariant. Must be fixed before merge.
- **CRITICAL**: serious but contained.
- **WARNING**: smell or risk.
- **SUGGESTION**: optional improvement.

Report each defect at its own table severity (`anti-patterns.md`). Never escalate a finding because other findings exist. Report only violations of a rule or a table row; anything else goes under at most 3 SUGGESTIONs.

## Procedure

1. Read the code. Identify every pattern and layer involved. Do not write fixes yet.
2. Check it against `anti-patterns.md`. Cite the rule ID from `hard-rules.md` for each finding (the `Rule` column of the row gives it).
3. Present the report.
4. Ask the Grilling Loop question (unless the verdict is APPROVE or the run is non-interactive).

For a "refactor" request: review the existing code briefly (findings only, no grilling question), then switch to Implementation mode (`implementation-mode.md`).

Non-interactive fallback (evaluation, CI, subagent, or the prompt says no user can answer): state assumptions in one short list, deliver the full report, and omit the Grilling Loop question. Never stop to wait. If the user's message explicitly asks for the confirmation question, include it.

## Report template

```
## DDD Review: <class or file name>

### Pattern(s) Detected
<list>

### Layer Analysis
<where each artifact lives and whether it is correct>

### Findings
<ordered by severity: BLOCKER, CRITICAL, WARNING, SUGGESTION. "None" if clean.>

### Recommendation
APPROVE | REFACTOR | REDESIGN: <one sentence reason>
```

Every finding MUST have all of these fields. None is optional:

- **Severity** and rule ID (for example `BLOCKER, ENT-1`)
- **File / class / line**
- **Evidence**: the exact code
- **Why**: the concrete DDD consequence, not a generic statement
- **Fix**: the corrected code or approach

## Verdict rule

- Any BLOCKER: REDESIGN.
- Any CRITICAL, or more than 2 WARNINGs: REFACTOR.
- Otherwise: APPROVE. Clean code MUST get APPROVE with no invented findings.

## Grilling Loop

After the COMPLETE report, ask exactly ONE confirmation question about the highest-severity finding: confirm the proposed fix. Do not ask discovery questions. Do not repeat the fix already in the report. If the user shows context you missed, correct the report and do not defend a finding that turns out wrong. If the review is APPROVE, ask nothing.
