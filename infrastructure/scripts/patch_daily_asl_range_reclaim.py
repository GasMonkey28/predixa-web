"""
Patch all *-daily-orchestrator.asl.json to add RangeReclaim after RunY2Y3.

Idempotent: skips if RangeReclaim already present.
Does NOT deploy to AWS — only updates local ASL files.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(r"C:\Users\malin\Predixa\predixa-web\infrastructure\step-functions")
LAMBDA = "arn:aws:lambda:us-east-1:822233328169:function:predixa-range-reclaim"


def ticker_from_name(path: Path) -> str:
    # aapl-daily-orchestrator.asl.json -> AAPL
    return path.name.split("-")[0].upper()


def patch(path: Path) -> bool:
    raw = path.read_text(encoding="utf-8")
    data = json.loads(raw)
    states = data.get("States") or {}
    if "RangeReclaim" in states:
        print(f"skip (already patched): {path.name}")
        return False
    if "RunY2Y3" not in states:
        print(f"skip (no RunY2Y3): {path.name}")
        return False

    ticker = ticker_from_name(path)
    # Comment at top
    data["Comment"] = (
        f"{ticker} daily orchestrator: Data → Premarket → model_3mix → model_y2y3 → Range Reclaim. "
        "Range Reclaim fades Model1 y4/y5 band breakouts; writes range_reclaim/{T}/*.json only "
        "(see tradespark/range_reclaim/README.md). Backup: infrastructure/step-functions/_backups/pre-range-reclaim_*"
    )

    states["RunY2Y3"]["Next"] = "RangeReclaim"
    states["RangeReclaim"] = {
        "Comment": (
            "Model Range Reclaim — AFTER y2y3 so tier+hands available for size bonuses. "
            "Logic: pred_high=prev_close+y4, pred_low=prev_close+y5; OS>=0.3% prev_close; "
            "short if close>pred_high (1% stop); long if close<pred_low (no stop); "
            "size 1.0 +0.5 tier(+0.5 y2y3 agree on longs). Private code in tradespark/range_reclaim."
        ),
        "Type": "Task",
        "Resource": "arn:aws:states:::lambda:invoke",
        "Parameters": {
            "FunctionName": LAMBDA,
            "Payload": {"ticker": ticker},
        },
        "Retry": [
            {
                "ErrorEquals": ["States.ALL"],
                "MaxAttempts": 2,
                "IntervalSeconds": 20,
                "BackoffRate": 2,
            }
        ],
        "Catch": [
            {
                "ErrorEquals": ["States.ALL"],
                "ResultPath": "$.range_reclaim_error",
                "Next": "Succeed",
            }
        ],
        "ResultPath": "$.range_reclaim",
        "Next": "Succeed",
    }

    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    print(f"patched: {path.name} ({ticker})")
    return True


def main():
    n = 0
    for path in sorted(ROOT.glob("*-daily-orchestrator.asl.json")):
        if patch(path):
            n += 1
    print(f"done, patched {n} files")


if __name__ == "__main__":
    main()
