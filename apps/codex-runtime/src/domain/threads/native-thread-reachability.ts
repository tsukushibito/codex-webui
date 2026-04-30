import type { RuntimeError } from "../../errors.js";

function serializeErrorSignal(value: unknown) {
  if (typeof value === "string") {
    return value.toLowerCase();
  }

  if (value === null || value === undefined) {
    return "";
  }

  try {
    return JSON.stringify(value).toLowerCase();
  } catch {
    return String(value).toLowerCase();
  }
}

export function indicatesMissingNativeThread(error: RuntimeError) {
  if (
    error.code !== "app_server_request_failed" ||
    !["turn/start", "thread/resume"].includes(String(error.details?.rpc_method ?? ""))
  ) {
    return false;
  }

  const messageSignal = error.message.toLowerCase();
  const codeSignal = serializeErrorSignal(error.details?.rpc_error_code);
  const dataSignal = serializeErrorSignal(error.details?.rpc_error_data);
  const signals = [messageSignal, codeSignal, dataSignal];

  return (
    signals.some((signal) => signal.includes("thread_not_found")) ||
    (signals.some((signal) => signal.includes("not_found")) &&
      signals.some((signal) => signal.includes("thread") || signal.includes("session"))) ||
    signals.some(
      (signal) =>
        (signal.includes("thread") || signal.includes("session")) &&
        (signal.includes("not found") || signal.includes("missing")),
    )
  );
}
