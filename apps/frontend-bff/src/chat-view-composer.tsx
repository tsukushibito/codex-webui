import type { RefObject } from "react";

export interface ChatViewComposerProps {
  composerDraft: string;
  composerFeedback: {
    message: string;
    tone: "info" | "success" | "warning" | "error";
  } | null;
  composerInputLabel: string;
  composerPlaceholder: string;
  composerStatusSegments: string[];
  composerSubmitLabel: string;
  isComposerDisabled: boolean;
  isStartingThread: boolean;
  isTextareaDisabled: boolean;
  onComposerDraftChange: (value: string) => void;
  onSubmitComposer: () => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}

export function ChatViewComposer({
  composerDraft,
  composerFeedback,
  composerInputLabel,
  composerPlaceholder,
  composerStatusSegments,
  composerSubmitLabel,
  isComposerDisabled,
  isStartingThread,
  isTextareaDisabled,
  onComposerDraftChange,
  onSubmitComposer,
  textareaRef,
}: ChatViewComposerProps) {
  const composerSubmitTitle = isComposerDisabled
    ? isStartingThread
      ? "Start thread unavailable"
      : "Send message unavailable"
    : composerSubmitLabel;

  return (
    <div className="chat-composer" data-composer-mode={isStartingThread ? "start" : "send"}>
      <label className="composer-input-frame" htmlFor="thread-composer-input">
        <span className="sr-only">{composerInputLabel}</span>
        <textarea
          className="chat-textarea"
          disabled={isTextareaDisabled}
          id="thread-composer-input"
          name="thread-composer-input"
          onChange={(event) => onComposerDraftChange(event.target.value)}
          placeholder={composerPlaceholder}
          ref={textareaRef}
          rows={4}
          value={composerDraft}
        />
        <button
          aria-label={composerSubmitLabel}
          className="submit-button composer-submit-button"
          disabled={isComposerDisabled}
          onClick={onSubmitComposer}
          title={composerSubmitTitle}
          type="button"
        >
          <svg
            aria-hidden="true"
            className="composer-submit-icon"
            fill="none"
            height="18"
            viewBox="0 0 24 24"
            width="18"
          >
            <path
              d="M3 11.5 20.5 4 16 20l-4.5-6-8.5-2.5Z"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
            <path
              d="m11.5 14 9-10"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
          </svg>
        </button>
      </label>
      <div className="chat-composer-status-rail">
        {composerStatusSegments.length > 0 ? (
          <div className="chat-composer-status" role="status">
            {composerStatusSegments.map((segment) => (
              <span className="chat-composer-status-segment" key={segment}>
                {segment}
              </span>
            ))}
          </div>
        ) : (
          <div aria-hidden="true" className="chat-composer-status chat-composer-status-empty" />
        )}
        <div className="chat-composer-feedback-slot">
          {composerFeedback ? (
            <p
              aria-live={composerFeedback.tone === "error" ? "assertive" : "polite"}
              className={`feedback-note composer-feedback-note ${composerFeedback.tone}`}
              role={composerFeedback.tone === "error" ? "alert" : "status"}
            >
              {composerFeedback.message}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
