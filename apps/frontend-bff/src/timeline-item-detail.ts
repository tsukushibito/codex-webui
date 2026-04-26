import type { PublicTimelineItem } from "./thread-types";

export interface TimelineDetailEntry {
  label: string;
  value: string;
  href?: string;
}

export interface TimelineDetailSection {
  title: string;
  items: string[];
  code?: boolean;
}

export interface TimelineItemDetail {
  actionLabel: string;
  title: string;
  summary: string | null;
  sections: TimelineDetailSection[];
  fields: TimelineDetailEntry[];
  hasContext: boolean;
}

const COMMAND_KEYS = ["command", "commands", "command_line", "command_lines", "cmd", "argv"];
const FILE_KEYS = [
  "file",
  "files",
  "path",
  "paths",
  "file_path",
  "file_paths",
  "changed_files",
  "touched_files",
  "modified_files",
  "created_files",
  "deleted_files",
];
const TEST_KEYS = ["test", "tests", "test_path", "test_paths", "test_file", "test_files"];
const DIFF_KEYS = ["diff", "diffs", "patch", "patches", "diff_excerpt", "diff_summary"];
const OUTPUT_KEYS = [
  "output",
  "outputs",
  "generated_output",
  "generated_outputs",
  "artifact",
  "artifacts",
  "result",
  "results",
];
const ISSUE_PR_LINK_KEYS = [
  "issue_url",
  "issue_urls",
  "pr_url",
  "pr_urls",
  "pull_request_url",
  "pull_request_urls",
];
const REQUEST_ID_KEYS = ["request_id", "request_ids"];
const ERROR_KEYS = ["error", "errors", "stderr", "failure_reason", "failure", "exception"];
const OPERATION_KEYS = ["operation", "operations", "operation_summary"];
const TARGET_KEYS = ["target", "targets"];
const CONSEQUENCE_KEYS = ["consequence", "consequences"];

function asNonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function flattenStrings(value: unknown, seen = new Set<unknown>()): string[] {
  if (value === null || value === undefined || seen.has(value)) {
    return [];
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return [String(value)];
  }

  if (Array.isArray(value)) {
    seen.add(value);
    return value.flatMap((entry) => flattenStrings(entry, seen));
  }

  if (typeof value === "object") {
    seen.add(value);
    return Object.values(value).flatMap((entry) => flattenStrings(entry, seen));
  }

  return [];
}

function collectItems(payload: Record<string, unknown>, keys: string[]) {
  const items = keys.flatMap((key) => flattenStrings(payload[key]));
  return Array.from(new Set(items));
}

function findFirstString(payload: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = asNonEmptyString(payload[key]);
    if (value) {
      return value;
    }
  }

  return null;
}

function firstIssueOrPrLink(payload: Record<string, unknown>) {
  const explicit = collectItems(payload, ISSUE_PR_LINK_KEYS);
  if (explicit.length > 0) {
    return explicit[0];
  }

  const generic = flattenStrings(payload.url);
  return generic.find((item) => /\/(issues|pull)\//.test(item)) ?? null;
}

function dedupeEntries(entries: TimelineDetailEntry[]) {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const key = `${entry.label}:${entry.value}:${entry.href ?? ""}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function detailActionLabel(kind: string, payload: Record<string, unknown>) {
  if (
    kind.includes("error") ||
    kind.includes("failed") ||
    collectItems(payload, ERROR_KEYS).length > 0
  ) {
    return "Inspect failure";
  }

  if (
    kind.includes("approval") ||
    kind.includes("request") ||
    collectItems(payload, REQUEST_ID_KEYS).length > 0
  ) {
    return "Inspect request";
  }

  if (kind.includes("command") || kind.includes("tool") || kind.includes("file")) {
    return "Inspect artifacts";
  }

  return "Inspect details";
}

function detailTitle(actionLabel: string) {
  switch (actionLabel) {
    case "Inspect request":
      return "Request detail";
    case "Inspect failure":
      return "Failure detail";
    case "Inspect artifacts":
      return "Artifact detail";
    default:
      return "Timeline detail";
  }
}

export function getTimelineItemDetail(item: PublicTimelineItem): TimelineItemDetail {
  const summary =
    findFirstString(item.payload, ["summary", "content", "message", "delta"]) ?? item.kind;
  const commands = collectItems(item.payload, COMMAND_KEYS);
  const filePaths = collectItems(item.payload, FILE_KEYS);
  const tests = collectItems(item.payload, TEST_KEYS);
  const diffs = collectItems(item.payload, DIFF_KEYS);
  const outputs = collectItems(item.payload, OUTPUT_KEYS);
  const requestIds = collectItems(item.payload, REQUEST_ID_KEYS);
  const errors = collectItems(item.payload, ERROR_KEYS);
  const operations = collectItems(item.payload, OPERATION_KEYS);
  const targets = collectItems(item.payload, TARGET_KEYS);
  const consequences = collectItems(item.payload, CONSEQUENCE_KEYS);
  const issueOrPrLink = firstIssueOrPrLink(item.payload);

  const sections: TimelineDetailSection[] = [];
  if (commands.length > 0) {
    sections.push({ title: "Commands", items: commands, code: true });
  }
  if (filePaths.length > 0) {
    sections.push({ title: "Files", items: filePaths, code: true });
  }
  if (tests.length > 0) {
    sections.push({ title: "Tests", items: tests, code: true });
  }
  if (diffs.length > 0) {
    sections.push({ title: "Diffs", items: diffs, code: true });
  }
  if (outputs.length > 0) {
    sections.push({ title: "Generated outputs", items: outputs });
  }
  if (errors.length > 0) {
    sections.push({ title: "Errors", items: errors });
  }

  const fields = dedupeEntries(
    [
      ...requestIds.map((value) => ({ label: "Request ID", value })),
      ...operations.map((value) => ({ label: "Operation", value })),
      ...targets.map((value) => ({ label: "Target", value })),
      ...consequences.map((value) => ({ label: "Consequence", value })),
      ...(issueOrPrLink
        ? [
            {
              label: /\/pull\//.test(issueOrPrLink) ? "Pull request" : "Issue",
              value: issueOrPrLink,
              href: issueOrPrLink,
            },
          ]
        : []),
    ].filter((entry) => entry.value.length > 0),
  );

  const actionLabel = detailActionLabel(item.kind, item.payload);
  const structuralSignal =
    sections.length > 0 ||
    fields.length > 0 ||
    item.kind.includes("approval") ||
    item.kind.includes("request") ||
    item.kind.includes("error") ||
    item.kind.includes("failed") ||
    item.kind.includes("command") ||
    item.kind.includes("tool") ||
    item.kind.includes("file");

  return {
    actionLabel,
    title: detailTitle(actionLabel),
    summary,
    sections,
    fields,
    hasContext: structuralSignal,
  };
}
