#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path


RUN_ID_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*$")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Append one orchestration event to a run-scoped NDJSON log."
    )
    parser.add_argument("--run-id", required=True, help="Path-safe orchestration run id.")
    parser.add_argument("--event-type", required=True, help="Event type to append.")
    parser.add_argument("--stage", required=True, help="Workflow stage, for example intake or handoff.")
    parser.add_argument("--status", required=True, help="Event status, for example info, success, failure, or blocked.")
    parser.add_argument("--summary", required=True, help="Concise factual summary for the event.")
    parser.add_argument("--actor", default="orchestrator", help="Actor responsible for the event.")
    parser.add_argument("--routing-goal", help="Current routing goal for the run.")
    parser.add_argument("--target", help="Current target identifier, for example issue-130.")
    parser.add_argument("--skill", help="Skill name associated with the event.")
    parser.add_argument("--issue", type=int, help="Issue number associated with the event.")
    parser.add_argument(
        "--details-json",
        help="Optional JSON object with structured details for the event.",
    )
    parser.add_argument(
        "--artifact-root",
        help="Override artifact root. Defaults to <repo>/artifacts/execution_orchestrator.",
    )
    return parser.parse_args()


def repo_root() -> Path:
    return Path(__file__).resolve().parents[4]


def artifact_root(path_arg: str | None) -> Path:
    if path_arg:
        return Path(path_arg).resolve()
    return repo_root() / "artifacts" / "execution_orchestrator"


def parse_details(raw: str | None) -> dict | None:
    if raw is None:
        return None
    try:
        value = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise SystemExit(f"--details-json must be valid JSON: {exc}") from exc
    if not isinstance(value, dict):
        raise SystemExit("--details-json must decode to a JSON object.")
    return value


def next_sequence(events_path: Path) -> int:
    if not events_path.exists():
        return 1
    with events_path.open("r", encoding="utf-8") as handle:
        return sum(1 for _ in handle) + 1


def validate_args(args: argparse.Namespace) -> None:
    if not RUN_ID_PATTERN.match(args.run_id):
        raise SystemExit(
            "--run-id must be path-safe and match [A-Za-z0-9][A-Za-z0-9._-]*."
        )
    if not args.summary.strip():
        raise SystemExit("--summary must not be empty.")


def build_event(args: argparse.Namespace, sequence: int, details: dict | None) -> dict:
    event = {
        "recorded_at_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "sequence": sequence,
        "run_id": args.run_id,
        "stage": args.stage,
        "event_type": args.event_type,
        "status": args.status,
        "actor": args.actor,
        "summary": args.summary.strip(),
    }
    if args.routing_goal:
        event["routing_goal"] = args.routing_goal
    if args.target:
        event["target"] = args.target
    if args.skill:
        event["skill"] = args.skill
    if args.issue is not None:
        event["issue"] = args.issue
    if details:
        event["details"] = details
    return event


def main() -> int:
    args = parse_args()
    validate_args(args)
    details = parse_details(args.details_json)

    root = artifact_root(args.artifact_root)
    run_dir = root / "runs" / args.run_id
    run_dir.mkdir(parents=True, exist_ok=True)
    events_path = run_dir / "events.ndjson"

    event = build_event(args, next_sequence(events_path), details)
    with events_path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(event, ensure_ascii=False) + "\n")

    print(events_path)
    return 0


if __name__ == "__main__":
    sys.exit(main())
