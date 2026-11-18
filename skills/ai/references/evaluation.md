# Evaluation

Use this reference when building a new AI feature, and before changing a prompt, model, retrieval setting, tool or agent. An evaluation set is a small file of real inputs with what a good result must contain. It turns "the answers feel better" into "18 of 20 pass, and nothing that passed before fails now".

## Where it lives

```text
evals/
|-- run_eval.py            the runner below
`-- <feature>/
    |-- cases.jsonl        one case per line, committed
    `-- baseline.json      the last accepted run, committed
```

Never put real customer data, secrets or personal details in cases; write realistic but invented inputs, or anonymize them.

## Cases

```json
{"id": "double-charge", "input": {"text": "I was charged twice this month"}, "expect": {"equals": {"category": "billing", "urgent": true}}}
{"id": "no-pii-echo", "input": {"text": "My phone is 777123456, app crashes"}, "expect": {"not_contains": ["777123456"]}}
{"id": "viewer-cannot-pay", "input": {"role": "viewer", "text": "Record 5000 from member 7"}, "expect": {"tools_not_used": ["record_payment"]}}
```

Start with 5 to 20 cases from the requirement, then add every real failure as a new case. Cover:

- the common requests, in each language the product supports;
- edge cases: empty, very long, mixed Arabic and English, typos;
- requests the feature must refuse or answer with "not found";
- permission cases: users who must not see or change something;
- attempts to override instructions through user text or documents.

## Checks

Prefer deterministic checks on structured output: `equals` for fields, `contains` and `not_contains` for text, `tools_used` and `tools_not_used` for assistants, and for RAG the cited `doc_id`s. The feature function returns a dict with the fields the checks read (for an assistant, include `tools_used`).

Use a model as a judge only for qualities code cannot check (tone, completeness of a summary). When you do: give it a short rubric with pass/fail criteria, use a different model from the one being judged when possible, have it return structured output, read a sample of its verdicts yourself, and never let it be the only check on facts, numbers or permissions.

## Runner

```python
"""Runs one feature's evaluation set and compares it with the saved baseline.

    python -m evals.run_eval triage            # run and compare
    python -m evals.run_eval triage --save     # accept this run as the new baseline
"""

import asyncio
import json
import sys
import time
from pathlib import Path
from typing import Any, Awaitable, Callable

EVALS = Path(__file__).parent

# feature name -> async function(case input) -> output dict. Register real features here.
FEATURES: dict[str, Callable[[dict[str, Any]], Awaitable[dict[str, Any]]]] = {}


def check(expect: dict[str, Any], output: dict[str, Any]) -> list[str]:
    """Deterministic checks. Returns the reasons a case failed (empty means passed)."""
    failures = []
    for key, wanted in expect.get("equals", {}).items():
        if output.get(key) != wanted:
            failures.append(f"{key}: expected {wanted!r}, got {output.get(key)!r}")
    text = json.dumps(output, ensure_ascii=False).lower()
    for phrase in expect.get("contains", []):
        if phrase.lower() not in text:
            failures.append(f"missing {phrase!r}")
    for phrase in expect.get("not_contains", []):
        if phrase.lower() in text:
            failures.append(f"must not contain {phrase!r}")
    for tool in expect.get("tools_used", []):
        if tool not in output.get("tools_used", []):
            failures.append(f"did not use tool {tool}")
    for tool in expect.get("tools_not_used", []):
        if tool in output.get("tools_used", []):
            failures.append(f"used forbidden tool {tool}")
    return failures


async def run(feature: str) -> dict[str, Any]:
    cases = [json.loads(line) for line in (EVALS / feature / "cases.jsonl").read_text(encoding="utf-8").splitlines() if line.strip()]
    results = {}
    for case in cases:
        started = time.perf_counter()
        try:
            output = await FEATURES[feature](case["input"])
            failures = check(case.get("expect", {}), output)
        except Exception as error:  # a crash is a failed case, not a stopped run
            output, failures = {}, [f"error: {type(error).__name__}: {error}"]
        results[case["id"]] = {
            "passed": not failures,
            "failures": failures,
            "ms": round((time.perf_counter() - started) * 1000),
        }
    return results


def compare(feature: str, results: dict[str, Any], save: bool) -> int:
    baseline_path = EVALS / feature / "baseline.json"
    baseline = json.loads(baseline_path.read_text(encoding="utf-8")) if baseline_path.exists() else {}
    passed = sum(r["passed"] for r in results.values())
    print(f"{feature}: {passed}/{len(results)} passed")
    regressions = [cid for cid, r in results.items() if not r["passed"] and baseline.get(cid, {}).get("passed")]
    fixed = [cid for cid, r in results.items() if r["passed"] and cid in baseline and not baseline[cid]["passed"]]
    for cid, r in results.items():
        if not r["passed"]:
            print(f"  FAIL {cid}: {'; '.join(r['failures'])}")
    if fixed:
        print(f"  fixed since baseline: {', '.join(fixed)}")
    if regressions:
        print(f"  REGRESSED since baseline: {', '.join(regressions)}")
    if save:
        baseline_path.write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
        print("  baseline saved")
    return 1 if regressions else 0


if __name__ == "__main__":
    name = sys.argv[1]
    sys.exit(compare(name, asyncio.run(run(name)), "--save" in sys.argv))
```

Register a feature by mapping its name to an async function that calls the real service with the case input (and a test user for the case's role):

```python
# evals/features.py
from evals.run_eval import FEATURES

async def triage(case_input):
    result = await triage_message(get_test_llm(), case_input["text"])
    return result.model_dump()

FEATURES["triage"] = triage
```

Checked with a stand-in feature: the first run saves a baseline with one known failure; a later version that fixes it reports "fixed since baseline"; a version that breaks a passing case reports "REGRESSED" and exits with status 1, so it can gate a merge.

## How to use the results

- Before a change, run the set and save the baseline if none exists. After the change, run it again: no regressions, and the target cases fixed.
- Report the pass count, regressions, and cost and latency per call (from the LLM client's logs) in the pull request.
- When comparing models or prompts, change one thing at a time and keep the cases fixed.
- A model or provider switch needs a full run; a pass rate that drops is a reason not to switch, even if the new model is cheaper.
- Real model calls cost money: run the set on demand and before merging, not on every commit, unless the team agrees otherwise.
