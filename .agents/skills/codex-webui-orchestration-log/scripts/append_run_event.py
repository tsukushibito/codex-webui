#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


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
    parser.add_argument(
        "--token-thread-id",
        help=(
            "Thread id to inspect for token usage. Defaults to the CODEX_THREAD_ID "
            "environment variable."
        ),
    )
    parser.add_argument(
        "--sessions-root",
        help="Override the Codex sessions root. Defaults to ~/.codex/sessions.",
    )
    parser.add_argument(
        "--no-token-usage",
        action="store_true",
        help="Skip automatic token usage snapshot enrichment.",
    )
    return parser.parse_args()


def repo_root() -> Path:
    return Path(__file__).resolve().parents[4]


def artifact_root(path_arg: str | None) -> Path:
    if path_arg:
        return Path(path_arg).resolve()
    return repo_root() / "artifacts" / "execution_orchestrator"


def sessions_root(path_arg: str | None) -> Path:
    if path_arg:
        return Path(path_arg).resolve()
    return Path.home() / ".codex" / "sessions"


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


def parse_jsonl_line(raw_line: str) -> dict[str, Any] | None:
    line = raw_line.strip()
    if not line:
        return None
    try:
        value = json.loads(line)
    except json.JSONDecodeError:
        return None
    if not isinstance(value, dict):
        return None
    return value


def find_session_file(root: Path, thread_id: str) -> Path | None:
    matches = sorted(root.rglob(f"*{thread_id}.jsonl"))
    if not matches:
        return None
    return matches[-1]


def read_session_meta(session_path: Path) -> dict[str, Any] | None:
    with session_path.open("r", encoding="utf-8") as handle:
        first_line = handle.readline()
    record = parse_jsonl_line(first_line)
    if not record:
        return None
    payload = record.get("payload")
    if not isinstance(payload, dict):
        return None
    return payload


def latest_token_count(session_path: Path) -> dict[str, Any] | None:
    last_record: dict[str, Any] | None = None
    with session_path.open("r", encoding="utf-8") as handle:
        for raw_line in handle:
            record = parse_jsonl_line(raw_line)
            if not record or record.get("type") != "event_msg":
                continue
            payload = record.get("payload")
            if not isinstance(payload, dict) or payload.get("type") != "token_count":
                continue
            info = payload.get("info")
            if info is None:
                continue
            if not isinstance(info, dict):
                continue
            last_record = {
                "event_timestamp": record.get("timestamp"),
                "info": info,
            }
    return last_record


def direct_child_session_files(root: Path, parent_thread_id: str) -> list[Path]:
    matches: list[Path] = []
    for session_path in root.rglob("*.jsonl"):
        meta = read_session_meta(session_path)
        if not meta:
            continue
        source = meta.get("source")
        if not isinstance(source, dict):
            continue
        subagent = source.get("subagent")
        if not isinstance(subagent, dict):
            continue
        thread_spawn = subagent.get("thread_spawn")
        if not isinstance(thread_spawn, dict):
            continue
        if thread_spawn.get("parent_thread_id") == parent_thread_id:
            matches.append(session_path)
    return sorted(matches)


def usage_totals(info: dict[str, Any]) -> dict[str, int] | None:
    totals = info.get("total_token_usage")
    if not isinstance(totals, dict):
        return None
    normalized: dict[str, int] = {}
    for key, value in totals.items():
        if isinstance(value, int):
            normalized[key] = value
    return normalized or None


def accumulate_usage(usages: list[dict[str, int]]) -> dict[str, int] | None:
    if not usages:
        return None
    aggregate: dict[str, int] = {}
    for usage in usages:
        for key, value in usage.items():
            aggregate[key] = aggregate.get(key, 0) + value
    return aggregate


def build_thread_snapshot(session_path: Path) -> dict[str, Any] | None:
    meta = read_session_meta(session_path)
    token_count = latest_token_count(session_path)
    if not meta or not token_count:
        return None

    info = token_count["info"]
    snapshot: dict[str, Any] = {
        "thread_id": meta.get("id"),
        "session_path": str(session_path),
        "snapshot_recorded_at_utc": token_count.get("event_timestamp"),
        "total_token_usage": info.get("total_token_usage"),
        "last_token_usage": info.get("last_token_usage"),
    }
    if meta.get("agent_role"):
        snapshot["agent_role"] = meta["agent_role"]
    if meta.get("agent_nickname"):
        snapshot["agent_nickname"] = meta["agent_nickname"]
    model_context_window = info.get("model_context_window")
    if isinstance(model_context_window, int):
        snapshot["model_context_window"] = model_context_window
    return snapshot


def token_usage_snapshot(args: argparse.Namespace) -> dict[str, Any]:
    thread_id = args.token_thread_id or os.environ.get("CODEX_THREAD_ID")
    snapshot: dict[str, Any] = {
        "available": False,
        "source": "codex_cli_session_log",
        "scope": "thread_cumulative",
        "thread_id": thread_id,
    }
    if not thread_id:
        snapshot["unavailable_reason"] = "thread_id_unavailable"
        return snapshot

    root = sessions_root(args.sessions_root)
    if not root.exists():
        snapshot["unavailable_reason"] = "sessions_root_missing"
        snapshot["sessions_root"] = str(root)
        return snapshot

    current_session = find_session_file(root, thread_id)
    if current_session is None:
        snapshot["unavailable_reason"] = "session_file_not_found"
        snapshot["sessions_root"] = str(root)
        return snapshot

    current_thread = build_thread_snapshot(current_session)
    if current_thread is None:
        snapshot["unavailable_reason"] = "token_count_unavailable"
        snapshot["session_path"] = str(current_session)
        return snapshot

    child_snapshots: list[dict[str, Any]] = []
    aggregate_inputs: list[dict[str, int]] = []

    current_totals = usage_totals(current_thread)
    if current_totals:
        aggregate_inputs.append(current_totals)

    for child_session in direct_child_session_files(root, thread_id):
        child_snapshot = build_thread_snapshot(child_session)
        if not child_snapshot:
            continue
        child_snapshots.append(child_snapshot)
        child_totals = usage_totals(child_snapshot)
        if child_totals:
            aggregate_inputs.append(child_totals)

    snapshot["available"] = True
    snapshot["sessions_root"] = str(root)
    snapshot["current_thread"] = current_thread
    snapshot["direct_subagents"] = child_snapshots

    aggregate_totals = accumulate_usage(aggregate_inputs)
    if aggregate_totals:
        snapshot["aggregate_total_token_usage"] = aggregate_totals
    return snapshot


def build_event(args: argparse.Namespace, sequence: int, details: dict | None) -> dict:
    event_details = dict(details) if details else {}
    if not args.no_token_usage:
        event_details["token_usage_snapshot"] = token_usage_snapshot(args)

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
    if event_details:
        event["details"] = event_details
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
