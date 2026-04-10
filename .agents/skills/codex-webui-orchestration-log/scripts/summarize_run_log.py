#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from pathlib import Path
from typing import Any


TERMINAL_EVENTS = {"run_completed", "run_blocked"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Read an orchestration run log and print concise operational views."
    )
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument(
        "--run-id",
        help="Run id under artifacts/execution_orchestrator/runs/<run_id>/events.ndjson.",
    )
    source.add_argument(
        "--events-path",
        help="Direct path to an events.ndjson file.",
    )
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument(
        "--anomalies",
        action="store_true",
        help="Print only anomaly events in a concise table.",
    )
    mode.add_argument(
        "--check",
        action="store_true",
        help="Print basic consistency checks for the run log.",
    )
    return parser.parse_args()


def repo_root() -> Path:
    return Path(__file__).resolve().parents[4]


def events_path(args: argparse.Namespace) -> Path:
    if args.events_path:
        return Path(args.events_path).resolve()
    root = repo_root()
    candidate = run_events_path(root, args.run_id)
    if candidate.exists():
        return candidate
    if root.parent.name == ".worktrees":
        parent_checkout = root.parent.parent
        parent_candidate = run_events_path(parent_checkout, args.run_id)
        if parent_candidate.exists():
            return parent_candidate
    return candidate


def run_events_path(root: Path, run_id: str) -> Path:
    return (
        root
        / "artifacts"
        / "execution_orchestrator"
        / "runs"
        / run_id
        / "events.ndjson"
    )


def event_value(event: dict[str, Any], key: str) -> str:
    value = event.get(key)
    if value is None:
        return "-"
    return str(value)


def read_events(path: Path) -> tuple[list[dict[str, Any]], list[str]]:
    events: list[dict[str, Any]] = []
    invalid_lines: list[str] = []
    with path.open("r", encoding="utf-8") as handle:
        for line_number, raw_line in enumerate(handle, start=1):
            line = raw_line.strip()
            if not line:
                continue
            try:
                value = json.loads(line)
            except json.JSONDecodeError as exc:
                invalid_lines.append(f"line {line_number}: invalid JSON: {exc.msg}")
                continue
            if not isinstance(value, dict):
                invalid_lines.append(f"line {line_number}: JSON value is not an object")
                continue
            events.append(value)
    return events, invalid_lines


def infer_run_id(path: Path, events: list[dict[str, Any]]) -> str:
    for event in events:
        run_id = event.get("run_id")
        if isinstance(run_id, str) and run_id:
            return run_id
    if path.name == "events.ndjson" and path.parent.name:
        return path.parent.name
    return "-"


def count_values(events: list[dict[str, Any]], key: str) -> Counter[str]:
    return Counter(event_value(event, key) for event in events)


def format_counter(counter: Counter[str]) -> str:
    if not counter:
        return "-"
    return ", ".join(f"{key}={value}" for key, value in sorted(counter.items()))


def handoff_events(events: list[dict[str, Any]], event_type: str) -> list[dict[str, Any]]:
    return [event for event in events if event.get("event_type") == event_type]


def print_summary(path: Path, events: list[dict[str, Any]], invalid_lines: list[str]) -> None:
    run_id = infer_run_id(path, events)
    sequences = [event.get("sequence") for event in events if isinstance(event.get("sequence"), int)]
    terminals = [event for event in events if event.get("event_type") in TERMINAL_EVENTS]
    anomalies = [event for event in events if event.get("event_type") == "anomaly"]
    last_event = events[-1] if events else {}

    print(f"Run: {run_id}")
    print(f"Path: {path}")
    print(f"Events: {len(events)} valid, {len(invalid_lines)} invalid")
    if sequences:
        print(f"Sequence range: {min(sequences)}..{max(sequences)}")
    else:
        print("Sequence range: -")
    print(f"Stages: {format_counter(count_values(events, 'stage'))}")
    print(f"Event types: {format_counter(count_values(events, 'event_type'))}")
    print(f"Statuses: {format_counter(count_values(events, 'status'))}")
    print(f"Current target: {event_value(last_event, 'target')}")
    print(f"Last event: {event_value(last_event, 'event_type')} ({event_value(last_event, 'status')})")
    print(f"Terminal events: {len(terminals)}")
    print(f"Anomalies: {len(anomalies)}")

    selected = handoff_events(events, "handoff_selected")
    if selected:
        print("Selected handoffs:")
        for event in selected:
            print(
                f"- seq {event_value(event, 'sequence')}: "
                f"{event_value(event, 'skill')} target={event_value(event, 'target')} "
                f"status={event_value(event, 'status')}"
            )
    else:
        print("Selected handoffs: none")


def print_anomalies(events: list[dict[str, Any]]) -> None:
    anomalies = [event for event in events if event.get("event_type") == "anomaly"]
    if not anomalies:
        print("Anomalies: none")
        return

    print(f"Anomalies: {len(anomalies)}")
    for event in anomalies:
        print(
            f"- seq {event_value(event, 'sequence')}: "
            f"stage={event_value(event, 'stage')} "
            f"status={event_value(event, 'status')} "
            f"target={event_value(event, 'target')} "
            f"skill={event_value(event, 'skill')} "
            f"issue={event_value(event, 'issue')} - "
            f"{event_value(event, 'summary')}"
        )


def duplicate_sequences(events: list[dict[str, Any]]) -> list[int]:
    counts = Counter(
        event.get("sequence") for event in events if isinstance(event.get("sequence"), int)
    )
    return sorted(sequence for sequence, count in counts.items() if count > 1)


def handoff_key(event: dict[str, Any]) -> tuple[str, str]:
    return (event_value(event, "skill"), event_value(event, "target"))


def handoff_mismatches(events: list[dict[str, Any]]) -> list[str]:
    started = Counter(handoff_key(event) for event in handoff_events(events, "handoff_started"))
    completed = Counter(handoff_key(event) for event in handoff_events(events, "handoff_completed"))
    keys = sorted(set(started) | set(completed))
    mismatches: list[str] = []
    for key in keys:
        if started[key] == completed[key]:
            continue
        skill, target = key
        mismatches.append(
            f"{skill} target={target}: started={started[key]} completed={completed[key]}"
        )
    return mismatches


def print_check(events: list[dict[str, Any]], invalid_lines: list[str]) -> None:
    findings: list[str] = []

    for invalid_line in invalid_lines:
        findings.append(invalid_line)

    duplicates = duplicate_sequences(events)
    if duplicates:
        findings.append(
            "duplicate sequence values: " + ", ".join(str(sequence) for sequence in duplicates)
        )

    terminals = [event for event in events if event.get("event_type") in TERMINAL_EVENTS]
    if not terminals:
        findings.append("missing terminal event: expected run_completed or run_blocked")
    elif len(terminals) > 1:
        terminal_refs = ", ".join(
            f"seq {event_value(event, 'sequence')} {event_value(event, 'event_type')}"
            for event in terminals
        )
        findings.append(f"multiple terminal events: {terminal_refs}")

    for mismatch in handoff_mismatches(events):
        findings.append(f"handoff started/completed mismatch: {mismatch}")

    if findings:
        print(f"Check result: issues found ({len(findings)})")
        for finding in findings:
            print(f"- {finding}")
        return

    print("Check result: ok")


def main() -> int:
    args = parse_args()
    path = events_path(args)
    if not path.exists():
        print(f"events file not found: {path}", file=sys.stderr)
        return 2

    events, invalid_lines = read_events(path)
    if args.anomalies:
        print_anomalies(events)
    elif args.check:
        print_check(events, invalid_lines)
    else:
        print_summary(path, events, invalid_lines)
    return 0


if __name__ == "__main__":
    sys.exit(main())
