#!/usr/bin/env python3
"""Generate the reproducible synthetic dataset used by AI03.

SYNTHETIC - not derived from real customers.
"""

from __future__ import annotations

import argparse
import csv
import math
import re
from datetime import date, timedelta
from pathlib import Path


SEED = 20261110
DEFAULT_ROWS = 56
HEADER = ["date", "productSku", "pizzaSize", "quantity"]
DATASET = Path(__file__).with_name("demand-synthetic.csv")
STUDY = Path(__file__).parents[1] / "ann-study.md"
AI_ROOT = Path(__file__).parents[1]
REPORT = AI_ROOT / "iarti-report.md"
EXAMPLES = AI_ROOT / "examples"


def generate_rows(seed: int = SEED, rows: int = DEFAULT_ROWS) -> list[list[str | int]]:
    start = date(2026, 1, 1)
    result: list[list[str | int]] = []
    for offset in range(rows):
        current = start + timedelta(days=offset)
        weekly_effect = 4 if current.weekday() in (4, 5) else -1
        seasonal_effect = 2 * math.sin(offset * 2 * math.pi / 28)
        for sku, size, base, size_effect in (
            ("PRD-PIZZA-MARG", "Medium", 12, 0),
            ("PRD-PIZZA-MARG", "Large", 5, 1),
        ):
            noise = ((seed + offset * 31 + len(result) * 17) % 5) - 2
            quantity = max(0, round(base + weekly_effect + seasonal_effect + size_effect + noise))
            result.append([current.isoformat(), sku, size, quantity])
    return result


def write_dataset(path: Path = DATASET) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        handle.write("# SYNTHETIC - not derived from real customers\n")
        writer = csv.writer(handle)
        writer.writerow(HEADER)
        writer.writerows(generate_rows())


def validate() -> None:
    if not STUDY.is_file():
        raise SystemExit(f"Missing study: {STUDY}")
    text = STUDY.read_text(encoding="utf-8")
    required_headings = (
        "## 4. Application A - Demand Forecasting",
        "### 4.1. Problem",
        "### 4.5. Limitations",
        "## 5. Application B - Stock-related Decision Support",
        "### 5.1. Problem",
        "### 5.5. Limitations",
        "## 6. Data quality discussion",
        "## 7. Risks of unsuitable predictions and mitigations",
        "## 8. Tooling and AI-assisted work disclosure",
        "### 8.1. Tools used",
        "### 8.3. Rejected or corrected AI output",
        "## 9. Conclusions",
        "## Appendix B - Candidate scoring table",
        "## Appendix C - Redacted prompt log",
    )
    missing = [heading for heading in required_headings if heading not in text]
    if missing:
        raise SystemExit(f"Missing AI03 headings: {', '.join(missing)}")
    if not DATASET.is_file():
        raise SystemExit(f"Missing dataset: {DATASET}")
    with DATASET.open(newline="", encoding="utf-8") as handle:
        first_line = handle.readline().strip()
        if first_line != "# SYNTHETIC - not derived from real customers":
            raise SystemExit("Dataset is missing its synthetic-data declaration")
        if next(csv.reader(handle)) != HEADER:
            raise SystemExit(f"Dataset header must be: {','.join(HEADER)}")
    if "tensorflow" in text.lower() or "pytorch" in text.lower():
        raise SystemExit("AI03 must not claim a runtime ANN dependency")
    prohibited = (
        r"customers\.[A-Za-z_]+\s*[:=]",
        r"users\.[A-Za-z_]+\s*[:=]",
        r"user_dietary_restrictions\.[A-Za-z_]+\s*[:=]",
        r"\b(?:password|email|phone|address|dietary)\s*:\s*\S+",
    )
    ai_files = Path(__file__).parents[1].rglob("*")
    for path in ai_files:
        if path.is_file() and path.suffix in {".md", ".csv", ".py"}:
            contents = path.read_text(encoding="utf-8")
            if any(re.search(pattern, contents, re.IGNORECASE) for pattern in prohibited):
                raise SystemExit(f"Possible personal-data value found in {path}")
    validate_iarti_report()
    print("AI03 documentation, AI04 report and dataset validation passed")


def validate_iarti_report() -> None:
    if not REPORT.is_file():
        raise SystemExit(f"Missing AI04 report: {REPORT}")
    report = REPORT.read_text(encoding="utf-8")
    required_headings = (
        "## 4. Bill of Materials (AI01)",
        "## 5. Requirements Planning (AI02)",
        "## 6. Artificial Neural Networks study (AI03)",
        "## 7. Service endpoints (AI05)",
        "## 8. Backend data and Prolog knowledge base (AI06)",
        "## 9. What the plan does and does not change",
        "## 10. Examples",
        "## 11. Assumptions",
        "## 12. Limitations",
        "## 13. References",
        "## 14. AI-generated content disclosure",
    )
    missing = [heading for heading in required_headings if heading not in report]
    if missing:
        raise SystemExit(f"Missing AI04 headings: {', '.join(missing)}")
    for endpoint in ("/planning/bom-executions", "/planning/executions"):
        if endpoint not in report:
            raise SystemExit(f"AI04 report does not document endpoint {endpoint}")
    if not (AI_ROOT / "prolog-kb.md").is_file():
        raise SystemExit("Missing AI06 mapping document: docs/ai/prolog-kb.md")
    if not EXAMPLES.is_dir():
        raise SystemExit("Missing AI04 examples directory")
    index = (EXAMPLES / "index.md").read_text(encoding="utf-8")
    example_files = sorted(EXAMPLES.glob("*.http"))
    for path in example_files:
        if path.name not in index or path.name not in report:
            raise SystemExit(f"AI04 example is not indexed and reported: {path.name}")
    if "POST http://" not in "\n".join(path.read_text(encoding="utf-8") for path in example_files):
        raise SystemExit("AI04 examples contain no HTTP requests")
    normalized = re.sub(r"\s+", " ", re.sub(r"[`*]", "", report.lower()))
    proposal_is_recommendation = re.search(
        r"proposal(?:s)?[^.\n]{0,100}(?:recommendation|suggestion)|"
        r"(?:recommendation|suggestion)[^.\n]{0,100}proposal(?:s)?",
        normalized,
    )
    if "does not confirm purchase orders" not in normalized or not proposal_is_recommendation:
        raise SystemExit("AI04 must distinguish planning proposals from purchase-order confirmation")
    if "purchase_orders" in normalized and not re.search(
        r"no\s+purchaseorder\s+aggregate|no\s+purchase_orders\s+table|purchase_orders table.{0,30}no",
        normalized,
    ):
        raise SystemExit("AI04 must document that purchase orders are absent from the baseline")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="validate the committed artefacts")
    parser.add_argument("--write", action="store_true", help="regenerate the committed dataset")
    args = parser.parse_args()
    if args.write:
        write_dataset()
    if args.check:
        validate()
    if not args.write and not args.check:
        parser.error("choose --write or --check")


if __name__ == "__main__":
    main()
