function parseDebugFlag(rawValue: string | undefined) {
  if (!rawValue) {
    return false;
  }

  const normalized = rawValue.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function isServerLiveChatDebugEnabled() {
  return parseDebugFlag(process.env.CODEX_WEBUI_DEBUG_LIVE_CHAT);
}

function isBrowserLiveChatDebugEnabled() {
  return parseDebugFlag(process.env.NEXT_PUBLIC_CODEX_WEBUI_DEBUG_LIVE_CHAT);
}

export function logLiveChatDebug(
  scope: string,
  message: string,
  details?: Record<string, unknown>,
) {
  const enabled =
    typeof window === "undefined"
      ? isServerLiveChatDebugEnabled()
      : isBrowserLiveChatDebugEnabled();

  if (!enabled) {
    return;
  }

  const surface = typeof window === "undefined" ? "bff" : "browser";
  if (!details) {
    console.log(`[live-chat][${surface}][${scope}] ${message}`);
    return;
  }

  console.log(`[live-chat][${surface}][${scope}] ${message}`, details);
}
