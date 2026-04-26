import type { RefObject } from "react";

export interface ChatViewComposerProps {
  composerDraft: string;
  composerGuidance: string | null;
  composerLabel: string;
  composerPlaceholder: string;
  composerSubmitLabel: string;
  defaultGuidance: string;
  isComposerDisabled: boolean;
  isStartingThread: boolean;
  isTextareaDisabled: boolean;
  onComposerDraftChange: (value: string) => void;
  onSubmitComposer: () => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}

export function ChatViewComposer({
  composerDraft,
  composerGuidance,
  composerLabel,
  composerPlaceholder,
  composerSubmitLabel,
  defaultGuidance,
  isComposerDisabled,
  isStartingThread,
  isTextareaDisabled,
  onComposerDraftChange,
  onSubmitComposer,
  textareaRef,
}: ChatViewComposerProps) {
  return (
    <div className="chat-composer" data-composer-mode={isStartingThread ? "start" : "send"}>
      <label className="form-label" htmlFor="thread-composer-input">
        {composerLabel}
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
      </label>
      {composerGuidance ? (
        <p className="composer-guidance" role="status">
          {composerGuidance}
        </p>
      ) : (
        <p className="composer-guidance" role="status">
          {defaultGuidance}
        </p>
      )}
      <button
        className="submit-button"
        disabled={isComposerDisabled}
        onClick={onSubmitComposer}
        type="button"
      >
        {composerSubmitLabel}
      </button>
    </div>
  );
}
