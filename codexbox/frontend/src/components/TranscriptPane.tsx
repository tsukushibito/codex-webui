import { useState } from 'preact/hooks';
import type { TranscriptMessage } from '../types';

interface TranscriptPaneProps {
  canSend: boolean;
  messages: TranscriptMessage[];
  onSend: (text: string) => Promise<void>;
  sending: boolean;
}

export function TranscriptPane({ canSend, messages, onSend, sending }: TranscriptPaneProps) {
  const [prompt, setPrompt] = useState('');

  async function handleSubmit(event: Event) {
    event.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed || !canSend || sending) {
      return;
    }
    setPrompt('');
    await onSend(trimmed);
  }

  return (
    <section className="chat-panel" data-pane="chat">
      <div className="messages" aria-live="polite">
        {messages.map((message, index) => (
          <article
            key={`${message.id || message.role}-${index}`}
            className={`msg ${message.role}`}
          >
            {message.text}
          </article>
        ))}
      </div>
      <form className="composer" onSubmit={handleSubmit}>
        <textarea
          onInput={(event) => setPrompt((event.currentTarget as HTMLTextAreaElement).value)}
          placeholder="Type your prompt..."
          rows={3}
          value={prompt}
        />
        <button disabled={!canSend || sending} type="submit">
          Send
        </button>
      </form>
    </section>
  );
}
