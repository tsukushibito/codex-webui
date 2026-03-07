import { useMemo, useState } from 'preact/hooks';
import { splitAnswerText } from '../lib/workspace';
import type { UserInputQuestion, UserInputRequest } from '../types';

interface UserInputsSectionProps {
  onSkipUserInput: (request: UserInputRequest) => Promise<void>;
  onSubmitUserInput: (request: UserInputRequest, answers: Record<string, string[]>) => Promise<void>;
  requests: UserInputRequest[];
}

function UserInputQuestionView(props: {
  initialValue?: string;
  onChange: (value: string) => void;
  question: UserInputQuestion;
}) {
  const { initialValue = '', onChange, question } = props;
  const [value, setValue] = useState(initialValue);
  const options = Array.isArray(question.options) ? question.options : [];

  function update(nextValue: string) {
    setValue(nextValue);
    onChange(nextValue);
  }

  return (
    <section className="user-input-question">
      <h3 className="user-input-question-title">{question.header || question.id || 'Question'}</h3>
      {question.question ? <p className="user-input-question-body">{question.question}</p> : null}
      {options.length > 0 ? (
        <div className="user-input-options">
          {options.map((option) => (
            <button
              className="user-input-option"
              key={option.label}
              onClick={() => update(option.label || '')}
              title={option.description}
              type="button"
            >
              {option.label || 'Option'}
            </button>
          ))}
        </div>
      ) : null}
      <textarea
        className="user-input-answer"
        onInput={(event) => update((event.currentTarget as HTMLTextAreaElement).value)}
        placeholder="Enter one answer per line"
        rows={3}
        value={value}
      />
    </section>
  );
}

function UserInputCard(props: {
  onSkipUserInput: (request: UserInputRequest) => Promise<void>;
  onSubmitUserInput: (request: UserInputRequest, answers: Record<string, string[]>) => Promise<void>;
  request: UserInputRequest;
}) {
  const { onSkipUserInput, onSubmitUserInput, request } = props;
  const questions = useMemo(() => (Array.isArray(request.params?.questions) ? request.params.questions : []), [request]);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});

  return (
    <article className="user-input-card">
      <p className="user-input-method">{request.method}</p>
      <form
        className="user-input-form"
        onSubmit={async (event) => {
          event.preventDefault();
          await onSubmitUserInput(request, answers);
        }}
      >
        {questions.length > 0 ? questions.map((question, index) => (
          <UserInputQuestionView
            key={`${question.id || 'question'}-${index}`}
            onChange={(value) => {
              const nextAnswers = {
                ...answers,
                ...(question.id ? { [question.id]: splitAnswerText(value) } : {}),
              };
              setAnswers(nextAnswers);
            }}
            question={question}
          />
        )) : (
          <p className="user-input-empty">No structured questions were provided. Submit to acknowledge the request.</p>
        )}
        <div className="user-input-actions">
          <button className="user-input-submit" type="submit">Submit</button>
          <button className="user-input-skip" onClick={async () => onSkipUserInput(request)} type="button">Skip</button>
        </div>
      </form>
    </article>
  );
}

export function UserInputsSection(props: UserInputsSectionProps) {
  const { onSkipUserInput, onSubmitUserInput, requests } = props;

  if (requests.length === 0) {
    return <div className="user-inputs empty">No pending user input requests.</div>;
  }

  return (
    <div className="user-inputs">
      {requests.map((request) => (
        <UserInputCard
          key={request.requestId}
          onSkipUserInput={onSkipUserInput}
          onSubmitUserInput={onSubmitUserInput}
          request={request}
        />
      ))}
    </div>
  );
}
