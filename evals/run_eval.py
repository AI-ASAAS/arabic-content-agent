"""Evaluation runner following ASAAS AI Foundation (skills/ai/references/evaluation.md).

Usage:
    python evals/run_eval.py content_agent          # run deterministic tool & guardrail checks
    python evals/run_eval.py content_agent --save   # save current run as baseline.json
"""

import asyncio
import json
import sys
import time
from pathlib import Path
from typing import Any, Awaitable, Callable

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "backend"))

from modules.content_agent.tools import (  # noqa: E402
    detect_brand_violations,
    get_asaas_brand_guidelines,
    get_dialect_guidance,
    get_platform_rules,
    sanitize_script_text,
)

EVALS = Path(__file__).resolve().parent


async def eval_content_agent_guardrails(case_input: dict[str, Any]) -> dict[str, Any]:
    """Evaluates deterministic tools, sanitization, and policy checks without external API calls."""
    brand = get_asaas_brand_guidelines()
    platform_rules = get_platform_rules(
        case_input.get("platform", "TikTok / Reels"),
        int(case_input.get("target_seconds", 60)),
    )
    dialect_rules = get_dialect_guidance(case_input.get("dialect", "عربية فصحى"))

    raw_sample = case_input.get("raw_script", "")
    sanitized = sanitize_script_text(raw_sample) if raw_sample else ""
    violations = (
        detect_brand_violations([sanitized], int(case_input.get("target_seconds", 60)))
        if sanitized
        else []
    )

    return {
        "tools_used": [
            brand["tool"],
            platform_rules["tool"],
            dialect_rules["tool"],
        ],
        "target_words": platform_rules["target_words"],
        "sanitized": sanitized,
        "has_violations": len(violations) > 0,
        "violations": violations,
        "dialect_guidance": dialect_rules["guidance"],
    }


FEATURES: dict[str, Callable[[dict[str, Any]], Awaitable[dict[str, Any]]]] = {
    "content_agent": eval_content_agent_guardrails,
}


def check(expect: dict[str, Any], output: dict[str, Any]) -> list[str]:
    failures: list[str] = []
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
    cases_file = EVALS / feature / "cases.jsonl"
    cases = [
        json.loads(line)
        for line in cases_file.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    results: dict[str, Any] = {}
    for case in cases:
        started = time.perf_counter()
        try:
            output = await FEATURES[feature](case["input"])
            failures = check(case.get("expect", {}), output)
        except Exception as error:
            failures = [f"error: {type(error).__name__}: {error}"]
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
    regressions = [
        cid for cid, r in results.items() if not r["passed"] and baseline.get(cid, {}).get("passed")
    ]
    for cid, r in results.items():
        if not r["passed"]:
            print(f"  FAIL {cid}: {'; '.join(r['failures'])}")
    if regressions:
        print(f"  REGRESSED since baseline: {', '.join(regressions)}")
    if save:
        baseline_path.write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
        print("  baseline saved")
    return 1 if (regressions or passed < len(results)) else 0


def main() -> None:
    if len(sys.argv) < 2 or sys.argv[1] not in FEATURES:
        print(f"Usage: python evals/run_eval.py [{'|'.join(FEATURES)}] [--save]")
        sys.exit(2)
    feature = sys.argv[1]
    save = "--save" in sys.argv[2:]
    results = asyncio.run(run(feature))
    sys.exit(compare(feature, results, save))


if __name__ == "__main__":
    main()
