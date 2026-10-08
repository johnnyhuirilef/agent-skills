#!/usr/bin/env python3
"""Scorer for the ddd-typescript-architect benchmark.
Usage: python3 -I score.py <responses_dir> <out.json>   |   python3 -I score.py --selftest
Responses: <case_id>__<sample>.md. Review cases are matched against prose (fenced code removed);
implementation cases are matched against fenced code only (checklist/comment lines dropped; optional per-check scope_regex limits must_not_regex to matching code blocks). All regexes are case-insensitive."""
import sys, os, re, json, glob, tempfile, shutil

HERE = os.path.dirname(os.path.abspath(__file__))
CASES = os.path.join(HERE, 'cases')
WINDOW = 400
FP_SEV = re.compile(r'\b(BLOCKER|CRITICAL|MAJOR|WARNING)\b', re.I)
FP_FIND = re.compile(r'(violat|anti-?pattern|should|must|missing|leak|bypass|wrong|incorrect|fix\b|problem|issue|smell|breaks?\b|exposes?|mutable|anemic|invalid|not allowed|cardinal)', re.I)
FP_NEG = re.compile(r'\b(no|none|zero|without|not found|0)\b.{0,40}\b(blocker|critical|major|warning)', re.I)

def load_cases(d=CASES):
    out = {}
    for p in sorted(glob.glob(os.path.join(d, '*', 'truth.json'))):
        out[os.path.basename(os.path.dirname(p))] = json.load(open(p))
    return out

def strip_code(t):
    t = re.sub(r'```.*?```', ' ', t, flags=re.S)
    return re.sub(r'```.*\Z', ' ', t, flags=re.S)

CHECKLIST_LINE = re.compile(r'^\s*\[[ xX]\]')
COMMENT_LINE = re.compile(r'^\s*(//|#|\*)')

def clean_block(b):
    """Drop checklist items ([ ]/[x]) and comment lines (//, #, *) so prose mentioning a forbidden token is not code."""
    return '\n'.join(l for l in b.splitlines() if not CHECKLIST_LINE.match(l) and not COMMENT_LINE.match(l))

def code_blocks(t):
    return [clean_block(b) for b in re.findall(r'```[^\n]*\n(.*?)(?:```|\Z)', t, flags=re.S)]

def code_text(t):
    return '\n'.join(code_blocks(t))

def rx_find(patterns, text, flags):
    hits = []
    for p in patterns:
        try:
            hits += list(re.finditer(p, text, flags))
        except re.error:
            pass
    return hits

def score_review(text, truth):
    prose = strip_code(text)
    defects, detected, sev_ok = [], 0, 0
    for d in truth['defects']:
        hits = rx_find(d['mention_regex'], prose, re.I)
        sevs = d['severity'].split('|')
        sev_re = re.compile(r'\b(' + '|'.join(sevs) + r')\b', re.I)
        ok = any(sev_re.search(prose[max(0, h.start() - WINDOW): h.end() + WINDOW]) for h in hits)
        if hits:
            detected += 1
            sev_ok += ok
        defects.append({'id': d['id'], 'mentioned': bool(hits), 'severity_ok': bool(hits) and ok})
    n = len(truth['defects'])
    r = {'planted': n, 'detected': detected, 'defects': defects}
    r['recall'] = detected / n if n else None
    r['severity_ok'] = sev_ok / detected if detected else None
    if truth.get('clean'):
        fp = 0
        for line in prose.splitlines():
            if FP_SEV.search(line) and FP_FIND.search(line) and not FP_NEG.search(line):
                fp += 1
        r['false_positive_count'] = fp
    return r

def score_impl(text, truth):
    blocks = code_blocks(text)
    code = '\n'.join(blocks)
    res = []
    for c in truth['required']:
        # scope_regex (optional): must_not_regex is checked only in code blocks matching it; regex uses all code.
        sc = c.get('scope_regex')
        neg = '\n'.join(b for b in blocks if rx_find([sc], b, re.I | re.M)) if sc else code
        ok = all(rx_find([p], code, re.I | re.M) for p in c.get('regex', []))
        ok = ok and not any(rx_find([p], neg, re.I | re.M) for p in c.get('must_not_regex', []))
        res.append({'id': c['id'], 'passed': bool(ok)})
    passed = sum(x['passed'] for x in res)
    return {'checks_total': len(res), 'checks_passed': passed, 'pass_rate': passed / len(res) if res else None, 'checks': res}

def score_text(text, truth):
    r = score_impl(text, truth) if 'required' in truth else score_review(text, truth)
    r['words'] = len(text.split())
    return r

def run(rdir, out, cases=None):
    cases = cases or load_cases()
    rows = []
    for p in sorted(glob.glob(os.path.join(rdir, '*.md'))):
        base = os.path.basename(p)[:-3]
        cid, _, sample = base.partition('__')
        if cid not in cases:
            print('skip (unknown case):', base, file=sys.stderr); continue
        r = score_text(open(p, encoding='utf-8', errors='replace').read(), cases[cid])
        r.update(case=cid, sample=sample or '0', file=os.path.basename(p))
        rows.append(r)
    agg = {}
    for cid in sorted({r['case'] for r in rows}):
        rs = [r for r in rows if r['case'] == cid]
        def mean(k):
            v = [x[k] for x in rs if x.get(k) is not None]
            return sum(v) / len(v) if v else None
        agg[cid] = {'n': len(rs), 'words': mean('words')}
        for k in ('recall', 'severity_ok', 'false_positive_count', 'pass_rate'):
            m = mean(k)
            if m is not None: agg[cid][k] = m
    json.dump({'responses': rows, 'by_case': agg}, open(out, 'w'), indent=2)
    f = lambda v: '   -  ' if v is None else f'{v:6.2f}'
    print(f"{'case':5} {'sample':8} {'recall':>6} {'sev_ok':>6} {'fp':>4} {'checks':>7} {'words':>6}")
    for r in rows:
        chk = f"{r['checks_passed']}/{r['checks_total']}" if 'checks_total' in r else '-'
        fp = r.get('false_positive_count'); fp = '-' if fp is None else fp
        print(f"{r['case']:5} {r['sample']:8} {f(r.get('recall'))} {f(r.get('severity_ok'))} {str(fp):>4} {chk:>7} {r['words']:6}")
    print('-- means by case')
    for cid, a in agg.items():
        print(cid, {k: (round(v, 2) if isinstance(v, float) else v) for k, v in a.items()})
    return rows

R1_GOOD = """## DDD Review
- BLOCKER: `@Entity()` TypeORM decorator on Money value object (persistence mapper).
- BLOCKER: PricingService keeps mutable lastQuote / quotesIssued state (singleton).
- BLOCKER: Customer is an anemic model with public fields.
- BLOCKER: ChangeItemQuantityHandler mutates items[0] directly, bypassing the aggregate root.
- CRITICAL: Order gets an EventBus injected and publishes inside the aggregate.
- CRITICAL: Quantity exposes a public setValue setter.
```ts
@Entity() class Money {}
```
"""
R1_BAD = "The module looks fine overall. Maybe add more tests.\n"
R1_WRONGSEV = "SUGGESTION: the @Entity() decorator from TypeORM is a small style thing.\n"
R4_CLEAN = "## DDD Review\nNo BLOCKER or CRITICAL issues found.\nSUGGESTION: consider a Clock for occurredAt.\nRecommendation: APPROVE\n"
R4_NOISY = "BLOCKER: the Customer constructor is wrong and must be public.\nWARNING: missing setter, this is a problem.\nCRITICAL: event bus usage should change.\n"
I1_GOOD = """Decision log.
```ts
export class OrderId extends ValueObject<string> {}
export class OrderLine extends ValueObject<{ readonly productId: string; readonly quantity: number }> {}
export class OrderPlaced extends DomainEvent<{ orderId: string }> {
  static readonly EVENT_NAME = 'orders.order-placed.v1';
  fromPrimitives(d: unknown) { return new OrderPlaced(d as any); }
}
export class OrderPaid {} export class OrderShipped {} export class OrderCancelled {}
export class InvalidOrderTransitionError extends DomainError { readonly code = 'business.invalid-transition'; }
export class Order extends AggregateRoot<OrderId, OrderEvent> {
  private constructor(id: OrderId) { super(id); }
  static create(id: OrderId, deps: { clock: Clock }): Order {
    const o = new Order(id); const t = deps.clock.now(); o.addDomainEvent(new OrderPlaced({ orderId: 'x' })); return o;
  }
}
async function run(o: Order) { await repo.save(o); await bus.publish(o.pullDomainEvents()); }
```
"""
I1_BAD = """```ts
@Entity()
export class Order { constructor(public id: string) {}
  ship() { throw new Error('bad'); } }
export class OrderPlace {}
```
"""

def selftest():
    cases = load_cases()
    # every case dir must be a review (R*) or implementation (I*) case; the fixtures below need these ids
    assert all(re.fullmatch(r'[RI]\d+', c) for c in cases), cases.keys()
    assert {'R1', 'R2', 'R3', 'R4', 'R5', 'I1', 'I2', 'I3'} <= set(cases), cases.keys()
    # truth sanity: regexes compile; review regexes match their own planted prompt text
    for cid, t in cases.items():
        prompt = open(os.path.join(CASES, cid, 'prompt.txt')).read()
        for d in t.get('defects', []):
            for p in d['mention_regex']: re.compile(p, re.I)
            assert rx_find(d['mention_regex'], prompt, re.I | re.M), f"{d['id']} regex matches nothing in prompt"
        for c in t.get('required', []):
            for p in c['regex'] + c['must_not_regex'] + ([c['scope_regex']] if c.get('scope_regex') else []): re.compile(p, re.I | re.M)
        if 'required' in t: assert 8 <= len(t['required']) <= 12
    g = score_text(R1_GOOD, cases['R1']); b = score_text(R1_BAD, cases['R1'])
    assert g['recall'] == 1.0 and g['severity_ok'] == 1.0, g
    assert b['recall'] == 0.0 and b['severity_ok'] is None, b
    w = score_text(R1_WRONGSEV, cases['R1'])
    assert w['recall'] > 0 and w['severity_ok'] == 0.0, w
    c = score_text(R4_CLEAN, cases['R4']); n = score_text(R4_NOISY, cases['R4'])
    assert c['false_positive_count'] == 0, c
    assert n['false_positive_count'] == 3, n
    ig = score_text(I1_GOOD, cases['I1']); ib = score_text(I1_BAD, cases['I1'])
    assert ig['checks_passed'] == ig['checks_total'] == 12, [x for x in ig['checks'] if not x['passed']]
    assert ib['checks_passed'] <= 3, ib
    # code-only: checks must ignore prose
    assert score_text("private constructor static create() class Order extends AggregateRoot", cases['I1'])['checks_passed'] == 0
    # checklist/comment stripping + scope_regex
    chk = "```\n[x] no @Entity() from TypeORM\n// never use @Entity(\n * @Entity( in doc\n# @Entity( note\nexport class Order extends AggregateRoot {}\n```"
    c4 = lambda t: [x for x in score_text(t, cases['I1'])['checks'] if x['id'] == 'I1-C4'][0]['passed']
    c11 = lambda t: [x for x in score_text(t, cases['I1'])['checks'] if x['id'] == 'I1-C11'][0]['passed']
    assert c4(chk), 'checklist/comment lines must be ignored'
    assert not c4(chk.replace('[x] no', 'x = 1; no').replace('no @Entity() from TypeORM', '@Entity()')), 'real decorator still caught'
    agg = "```ts\nclass Order extends AggregateRoot { a() { this.addDomainEvent(e); } }\n```\n"
    hnd = "```ts\nclass H { async h(o) { await this.eventBus.publish(o.pullDomainEvents()); } }\n```\n"
    assert c11(agg + hnd), 'handler eventBus must not fail C11 (scope_regex)'
    bad = agg.replace('this.addDomainEvent(e);', 'this.eventBus.publish(e); this.addDomainEvent(e);')
    assert not c11(bad + hnd), 'eventBus inside aggregate must fail C11'
    assert cases['I1']['required'][10].get('scope_regex'), 'I1-C11 declares scope_regex'
    # end-to-end run on temp dir
    d = tempfile.mkdtemp()
    try:
        for name, txt in [('R1__a', R1_GOOD), ('R1__b', R1_BAD), ('R4__a', R4_CLEAN), ('R4__b', R4_NOISY), ('I1__a', I1_GOOD), ('I1__b', I1_BAD)]:
            open(os.path.join(d, name + '.md'), 'w').write(txt)
        rows = run(d, os.path.join(d, 'out.json'))
        assert len(rows) == 6 and json.load(open(os.path.join(d, 'out.json')))['by_case']['R1']['recall'] == 0.5
    finally:
        shutil.rmtree(d)
    print('SELFTEST OK')

if __name__ == '__main__':
    if len(sys.argv) == 2 and sys.argv[1] == '--selftest':
        selftest()
    elif len(sys.argv) == 3:
        run(sys.argv[1], sys.argv[2])
    else:
        print(__doc__); sys.exit(2)
