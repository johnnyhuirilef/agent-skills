"""Extract ts/typescript blocks from a skill dir and typecheck them.

usage: python3 -I extract.py <skill_dir> [out_label]

Blocks are written to runs/<out_label>/{vitest,jest}/ next to this script (default label: latest)
and typechecked with the local node_modules/.bin/tsc (run `npm ci` here first). The stubs/ files
model the SUT types used by the unit-test-declarative-architect examples (Order, ProcessOrder, ...).
"""
import json, os, re, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
if len(sys.argv) not in (2, 3):
    print(__doc__); sys.exit(2)
skill = sys.argv[1]
label = sys.argv[2] if len(sys.argv) == 3 else 'latest'
out = os.path.join(HERE, 'runs', label)
shutil.rmtree(out, ignore_errors=True)

def prelude(md, runner):
    mp = 'jest-mock-extended' if runner == 'jest' else 'vitest-mock-extended'
    common = (
        "import { faker } from '@faker-js/faker';\n"
        f"import {{ type MockProxy }} from '{mp}';\n"
        "import { InvalidOrderStateError, OrderNotFoundError, ValidationError } from './errors';\n"
        "import { InMemoryOrderRepository } from './in-memory-order.repository';\n"
        "import { Order, OrderId, type OrderPrimitives } from './order';\n"
        "import { OrderFactory } from './order.factory';\n"
        "import { type OrderRepository } from './order.repository';\n"
        "import { type PaymentService } from './payment.service';\n"
    )
    uc = './process-order-result.use-case' if md == 'result-type-testing.md' else './process-order.use-case'
    return common + (
        f"import {{ ProcessOrder, type ProcessOrderInput }} from '{uc}';\n"
        "declare const setup: () => { repository: InMemoryOrderRepository; paymentService: MockProxy<PaymentService>; "
        "gateway: MockProxy<PaymentService>; useCase: ProcessOrder };\n"
        "declare const VALID_INPUT: ProcessOrderInput;\n"
        + {
            'repository-fake-template.md': "declare const repository: InMemoryOrderRepository; declare const mockRepository: MockProxy<OrderRepository>;\n"
                                           "declare const order: Order; declare const primitives: OrderPrimitives;\n",
            'test-quality-rules.md': "declare const repository: InMemoryOrderRepository; declare const id: OrderId; declare const expected: Order;\n",
        }.get(md, '')
        + "// ---- block ----\n"
    )

def runner_of(code):
    nocomment = re.sub(r'//.*', '', code)
    return 'jest' if ("jest-mock-extended" in nocomment or re.search(r'\bjest\.', nocomment)) else 'vitest'

files = [os.path.join(skill, 'SKILL.md')] + sorted(
    os.path.join(skill, 'references', f) for f in os.listdir(os.path.join(skill, 'references')) if f.endswith('.md'))
manifest, excluded = [], []
for path in files:
    md = os.path.basename(path)
    text = open(path, encoding='utf-8').read()
    for i, m in enumerate(re.finditer(r'```(?:ts|typescript)\n(.*?)```', text, re.S), 1):
        code = m.group(1)
        first = code.strip().splitlines()[0] if code.strip() else ''
        if first.startswith("// Don't"):
            excluded.append(f'{md}#{i}')
            continue
        runner = runner_of(code)
        d = os.path.join(out, runner)
        if not os.path.isdir(d):
            shutil.copytree(os.path.join(HERE, 'stubs'), d)
            types = ['node', 'jest'] if runner == 'jest' else ['node', 'vitest/globals']
            json.dump({'compilerOptions': {'target': 'ES2022', 'module': 'ES2022', 'lib': ['ES2022'],
                       'moduleResolution': 'bundler', 'strict': True, 'noEmit': True, 'esModuleInterop': True,
                       'skipLibCheck': True, 'types': types}, 'include': ['*.ts']},
                      open(os.path.join(d, 'tsconfig.json'), 'w'), indent=2)
        name = f"block_{md.replace('.md', '').replace('-', '_')}_{i}.ts"
        has_import = re.search(r'^import ', code, re.M) is not None
        body = (code if has_import else prelude(md, runner) + code) + '\nexport {};\n'
        open(os.path.join(d, name), 'w', encoding='utf-8').write(body)
        manifest.append((md, i, runner, name, has_import))

total = 0
for runner in ('vitest', 'jest'):
    d = os.path.join(out, runner)
    if not os.path.isdir(d):
        continue
    errs = []
    while True:  # tsc hides semantic errors while any syntax error exists: park syntax-broken files and rerun
        r = subprocess.run([os.path.join(HERE, 'node_modules', '.bin', 'tsc'), '--noEmit', '-p', d],
                           capture_output=True, text=True)
        cur = [l for l in r.stdout.splitlines() if re.search(r'error TS\d+', l)]
        syn = {re.match(r'(.*?\.ts)\(', l).group(1) for l in cur if re.search(r'error TS1\d{3}:', l)}
        if not syn:
            errs += cur
            break
        errs += [l for l in cur if re.search(r'error TS1\d{3}:', l)]
        for f in syn:
            os.rename(f, f + '.syntax-error')
    total += len(errs)
    print(f'[{runner}] errors: {len(errs)}')
    for l in errs:
        print('  ', l.replace(d + '/', ''))
print('blocks:', len(manifest), 'excluded:', excluded)
for row in manifest:
    print('  ', row)
print('TOTAL tsc errors:', total)
