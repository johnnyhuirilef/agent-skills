"""Summarize Stryker JSON reports written by stryker-run.sh.

usage: python3 -I stryker-summary.py [report_dir]   (default results/stryker)

Report names follow the project names: ...-<version>-<usecase>-<sample>.json, for example
stk-orig-auth-1.json. The version is the dash field right before the use case.

Prints:
  1. per version and use case: mutants, killed, survived, timeout, no coverage, errors, score
     score = (killed + timeout) / (total - compile errors - ignored)
  2. noise estimate per version pair:
     - discordant kills: for every pair of suites (one per version, same use case), the mutants
       detected by one suite and not the other, summed over use cases
     - within-version discordant kills (sample 1 vs sample 2 of the same version), as the
       noise floor to compare against
     - exact two-sided sign test over mutants whose detection count differs between versions
     - bootstrap over suites (resample suites within each version and use case) of the
       difference in total score, 95% interval
Standard library only.
"""

import itertools
import json
import math
import random
import sys
from collections import defaultdict
from pathlib import Path

DETECTED = {"Killed", "Timeout"}
EXCLUDED = {"CompileError", "Ignored"}
ORDER = ["orig", "final", "v3", "oracle"]


def mutant_key(file_name, m):
    loc = m["location"]
    return (file_name, m["mutatorName"], m.get("replacement", ""),
            loc["start"]["line"], loc["start"]["column"], loc["end"]["line"], loc["end"]["column"])


def load(report_dir):
    suites = []
    for path in sorted(Path(report_dir).glob("*.json")):
        parts = path.stem.split("-")
        if len(parts) < 3:
            print(f"skip {path.name}: name is not ...-<version>-<usecase>-<sample>", file=sys.stderr)
            continue
        version, usecase, sample = (parts[-3] if len(parts) >= 3 else "?"), parts[-2], parts[-1]
        data = json.loads(path.read_text())
        status = {}
        for file_name, f in data["files"].items():
            for m in f["mutants"]:
                status[mutant_key(Path(file_name).name, m)] = m["status"]
        suites.append({"name": path.stem, "version": version, "usecase": usecase,
                       "sample": sample, "status": status})
    return suites


def counts(statuses):
    c = defaultdict(int)
    for s in statuses:
        c[s] += 1
    total = len(statuses)
    valid = total - sum(c[s] for s in EXCLUDED)
    detected = c["Killed"] + c["Timeout"]
    return {"total": total, "killed": c["Killed"], "survived": c["Survived"], "timeout": c["Timeout"],
            "nocov": c["NoCoverage"], "errors": c["RuntimeError"] + c["CompileError"],
            "detected": detected, "valid": valid}


def pct(num, den):
    return f"{100 * num / den:.1f}%" if den else "n/a"


def version_sort(versions):
    return sorted(versions, key=lambda v: (ORDER.index(v) if v in ORDER else len(ORDER), v))


def print_table(suites):
    versions = version_sort({s["version"] for s in suites})
    usecases = sorted({s["usecase"] for s in suites})
    print("## Mutation score per version and use case (sums over samples)\n")
    print("| Version | Use case | Suites | Mutants | Killed | Survived | Timeout | No cov | Errors | Score |")
    print("|---|---|---|---|---|---|---|---|---|---|")
    for v in versions:
        all_statuses, n_all = [], 0
        for uc in usecases:
            group = [s for s in suites if s["version"] == v and s["usecase"] == uc]
            if not group:
                continue
            statuses = [st for s in group for st in s["status"].values()]
            all_statuses += statuses
            n_all += len(group)
            c = counts(statuses)
            print(f"| {v} | {uc} | {len(group)} | {c['total']} | {c['killed']} | {c['survived']} | "
                  f"{c['timeout']} | {c['nocov']} | {c['errors']} | {pct(c['detected'], c['valid'])} |")
        c = counts(all_statuses)
        print(f"| {v} | **all** | {n_all} | {c['total']} | {c['killed']} | {c['survived']} | "
              f"{c['timeout']} | {c['nocov']} | {c['errors']} | **{pct(c['detected'], c['valid'])}** |")
    print()


def detected_set(suite):
    return {k for k, st in suite["status"].items() if st in DETECTED}


def sign_test(plus, minus):
    """Exact two-sided binomial sign test, p = 0.5."""
    n = plus + minus
    if n == 0:
        return 1.0
    k = min(plus, minus)
    tail = sum(math.comb(n, i) for i in range(k + 1)) / 2 ** n
    return min(1.0, 2 * tail)


def total_score(groups):
    det = val = 0
    for group in groups:
        for s in group:
            c = counts(list(s["status"].values()))
            det += c["detected"]
            val += c["valid"]
    return det / val if val else 0.0


def bootstrap(by_uc_a, by_uc_b, reps=10000, seed=1):
    rng = random.Random(seed)
    diffs = []
    for _ in range(reps):
        ra = [[rng.choice(g) for _ in g] for g in by_uc_a]
        rb = [[rng.choice(g) for _ in g] for g in by_uc_b]
        diffs.append(total_score(ra) - total_score(rb))
    diffs.sort()
    return diffs[int(0.025 * reps)], diffs[int(0.975 * reps) - 1]


def print_noise(suites):
    versions = [v for v in version_sort({s["version"] for s in suites}) if v != "oracle"]
    usecases = sorted({s["usecase"] for s in suites})

    def group(v, uc):
        return [s for s in suites if s["version"] == v and s["usecase"] == uc]

    print("## Noise floor: sample vs sample within a version\n")
    print("| Version | Suite pairs | Discordant kills (sum) |")
    print("|---|---|---|")
    for v in versions:
        pairs = disc = 0
        for uc in usecases:
            for a, b in itertools.combinations(group(v, uc), 2):
                pairs += 1
                disc += len(detected_set(a) ^ detected_set(b))
        print(f"| {v} | {pairs} | {disc} |")
    print()

    print("## Version pairs (paired per mutant, same use case)\n")
    print("| A vs B | Score A | Score B | Killed only by A suite | Killed only by B suite | "
          "Mutants A>B | Mutants B>A | Sign test p | Bootstrap 95% CI of A-B |")
    print("|---|---|---|---|---|---|---|---|---|")
    for va, vb in itertools.combinations(versions, 2):
        only_a = only_b = plus = minus = 0
        ga, gb = [], []
        for uc in usecases:
            a_suites, b_suites = group(va, uc), group(vb, uc)
            if not a_suites or not b_suites:
                continue
            ga.append(a_suites)
            gb.append(b_suites)
            for a, b in itertools.product(a_suites, b_suites):
                da, db = detected_set(a), detected_set(b)
                only_a += len(da - db)
                only_b += len(db - da)
            keys = set().union(*(s["status"] for s in a_suites + b_suites))
            for k in keys:
                ka = sum(k in detected_set(s) for s in a_suites) / len(a_suites)
                kb = sum(k in detected_set(s) for s in b_suites) / len(b_suites)
                plus += ka > kb
                minus += kb > ka
        if not ga:
            continue
        lo, hi = bootstrap(ga, gb)
        print(f"| {va} vs {vb} | {100 * total_score(ga):.1f}% | {100 * total_score(gb):.1f}% | "
              f"{only_a} | {only_b} | {plus} | {minus} | {sign_test(plus, minus):.3f} | "
              f"{100 * lo:+.1f} to {100 * hi:+.1f} pp |")
    print()


def main():
    report_dir = sys.argv[1] if len(sys.argv) > 1 else str(Path(__file__).parent / "results" / "stryker")
    suites = load(report_dir)
    if not suites:
        sys.exit(f"no reports in {report_dir}")
    print_table(suites)
    print_noise(suites)


if __name__ == "__main__":
    main()
