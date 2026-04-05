function parseDebugFlag(rawValue: string | undefined) {
  if (!rawValue) {
    return false;
  }

  const normalized = rawValue.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

export function isLiveChatDebugEnabled() {
  return parseDebugFlag(process.env.CODEX_WEBUI_DEBUG_LIVE_CHAT);
}

export function logLiveChatDebug(
  scope: string,
  message: string,
  details?: Record<string, unknown>,
) {
  if (!isLiveChatDebugEnabled()) {
    return;
  }

  if (!details) {
    console.log(`[live-chat][runtime][${scope}] ${message}`);
    return;
  }

  console.log(`[live-chat][runtime][${scope}] ${message}`, details);
}
