# Generation prompt

Each response is one fresh agent session (no shared context) given this prompt. Replace the placeholders:

- `<skill>`: path to the skill under test, e.g. `skills/ddd-typescript-architect`
- `<ID>`: a case id from `cases/` (R1-R5 review cases, I1-I3 implementation cases)
- `<out>`: the responses directory you will pass to `score.py`
- `<sample>`: the sample number (1, 2, ...)

```text
Read <skill>/SKILL.md and follow it (load only the references it tells you to load).
Then answer the user request in cases/<ID>/prompt.txt exactly as the skill prescribes
(no user is available to answer questions).
Write your complete final answer, and nothing else, to <out>/<ID>__<sample>.md.
```

Record the total tokens each session used if you want to compare cost between skill versions.
