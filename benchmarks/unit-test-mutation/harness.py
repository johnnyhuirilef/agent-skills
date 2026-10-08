"""Mutation harness. Usage:
  python3 -I harness.py check [--mutants <file>]    # verify every mutant applies uniquely to base
  python3 -I harness.py run <project_dir> <usecase> <out.json> [--mutants <file>]
--mutants defaults to mutants.json (the 30-mutant baseline); mutants-hard.json is the hard tier.
A relative --mutants path is resolved against the current directory first, then this directory.
<usecase> is a key of the mutants file (auth | billing | transfer). Only <project_dir>/tests is used;
src/ and config always come from base/, so edits a candidate made to src/ never leak into the score.
A mutant is killed when a test that passes on the unmutated source fails (or disappears) under the mutant.
"""
import json, os, shutil, subprocess, sys, tempfile
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.join(HERE, "base")


def load_mutants(path):
    if not os.path.isabs(path) and not os.path.exists(path):
        path = os.path.join(HERE, path)
    return json.load(open(path))


def apply(src, m):
    if src.count(m["find"]) != 1:
        raise ValueError(f"mutant {m['id']}: find string matches {src.count(m['find'])} times")
    return src.replace(m["find"], m["repl"])


def make_workdir(project, mutated_file=None, mutated_src=None):
    d = tempfile.mkdtemp(prefix="mut-", dir=os.path.join(HERE, "tmp"))
    shutil.copytree(os.path.join(BASE, "src"), os.path.join(d, "src"))
    shutil.copytree(os.path.join(project, "tests"), os.path.join(d, "tests"))
    for f in ("package.json", "tsconfig.json", "vitest.config.ts"):
        shutil.copy(os.path.join(BASE, f), os.path.join(d, f))
    os.symlink(os.path.join(BASE, "node_modules"), os.path.join(d, "node_modules"))
    if mutated_file:
        open(os.path.join(d, mutated_file), "w").write(mutated_src)
    return d


def run_vitest(d, timeout=150):
    out = os.path.join(d, "result.json")
    try:
        p = subprocess.run(["npx", "vitest", "run", "--reporter=json", f"--outputFile={out}"],
                           cwd=d, capture_output=True, text=True, timeout=timeout)
    except subprocess.TimeoutExpired:
        return {"timeout": True, "tests": {}}
    tests = {}
    if os.path.exists(out):
        try:
            data = json.load(open(out))
            for tr in data.get("testResults", []):
                name = os.path.basename(tr.get("name", ""))
                for a in tr.get("assertionResults", []):
                    tests[f"{name}::{a.get('fullName')}"] = a.get("status")
        except Exception:
            pass
    return {"timeout": False, "tests": tests, "exit": p.returncode}


def typecheck(d):
    p = subprocess.run(["npx", "tsc", "--noEmit"], cwd=d, capture_output=True, text=True, timeout=150)
    return p.returncode == 0, len(p.stdout.splitlines())


def main():
    args = sys.argv[1:]
    mutants_file = "mutants.json"
    if "--mutants" in args:
        i = args.index("--mutants")
        if i + 1 >= len(args):
            print(__doc__); sys.exit(2)
        mutants_file = args[i + 1]
        del args[i:i + 2]
    if not (args[:1] == ["check"] and len(args) == 1) and not (args[:1] == ["run"] and len(args) == 4):
        print(__doc__); sys.exit(2)
    MUTANTS = load_mutants(mutants_file)
    os.makedirs(os.path.join(HERE, "tmp"), exist_ok=True)
    if args[0] == "check":
        for uc, spec in MUTANTS.items():
            src = open(os.path.join(BASE, spec["file"])).read()
            for m in spec["mutants"]:
                apply(src, m)
        print("all", sum(len(s["mutants"]) for s in MUTANTS.values()), "mutants in", os.path.basename(mutants_file), "apply uniquely")
        return
    project, uc, outp = args[1], args[2], args[3]
    spec = MUTANTS[uc]
    src = open(os.path.join(BASE, spec["file"])).read()

    d = make_workdir(project)
    base = run_vitest(d)
    tc_ok, tc_lines = typecheck(d)
    shutil.rmtree(d, ignore_errors=True)
    passing = {k for k, v in base["tests"].items() if v == "passed"}
    result = {
        "project": os.path.basename(os.path.normpath(project)), "usecase": uc,
        "mutants_file": os.path.basename(mutants_file),
        "tests_total": len(base["tests"]), "tests_passed": len(passing),
        "tests_failed": sum(1 for v in base["tests"].values() if v == "failed"),
        "timeout": base["timeout"], "typecheck_ok": tc_ok, "typecheck_error_lines": tc_lines,
        "mutants": [],
    }

    def one(m):
        d = make_workdir(project, spec["file"], apply(src, m))
        r = run_vitest(d)
        shutil.rmtree(d, ignore_errors=True)
        killed = r["timeout"] or any(r["tests"].get(t) != "passed" for t in passing)
        return {"id": m["id"], "desc": m["desc"], "killed": bool(killed and passing)}

    with ThreadPoolExecutor(max_workers=5) as ex:
        result["mutants"] = list(ex.map(one, spec["mutants"]))
    result["killed"] = sum(1 for m in result["mutants"] if m["killed"])
    json.dump(result, open(outp, "w"), indent=2)
    print(os.path.basename(os.path.normpath(project)), uc, f"tests {len(passing)}/{len(base['tests'])} pass; killed {result['killed']}/{len(spec['mutants'])}; typecheck_ok={tc_ok}")


main()
