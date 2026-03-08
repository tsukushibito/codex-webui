import { ApprovalsSection } from './ApprovalsSection';
import { UserInputsSection } from './UserInputsSection';
import type { ApprovalDecision, ApprovalRequest, UserInputRequest } from '../types';

interface ActionQueueProps {
  approvals: ApprovalRequest[];
  onResolveApproval: (approval: ApprovalRequest, decision: ApprovalDecision) => Promise<void>;
  onSkipUserInput: (request: UserInputRequest) => Promise<void>;
  onSubmitUserInput: (request: UserInputRequest, answers: Record<string, string[]>) => Promise<void>;
  requests: UserInputRequest[];
  showEmpty?: boolean;
}

export function ActionQueue(props: ActionQueueProps) {
  const {
    approvals,
    onResolveApproval,
    onSkipUserInput,
    onSubmitUserInput,
    requests,
    showEmpty = false,
  } = props;
  const totalActions = approvals.length + requests.length;

  if (totalActions === 0 && !showEmpty) {
    return null;
  }

  return (
    <section className={`action-queue${totalActions === 0 ? ' is-empty' : ''}`}>
      <header className="action-queue-header">
        <div>
          <p className="eyebrow">Action Queue</p>
          <h2>Needs your attention</h2>
        </div>
        <div className="action-queue-counts" aria-label="Pending action counts">
          <span className="action-count">{approvals.length} approval{approvals.length === 1 ? '' : 's'}</span>
          <span className="action-count">{requests.length} input{requests.length === 1 ? '' : 's'}</span>
        </div>
      </header>

      {totalActions === 0 ? (
        <p className="action-queue-empty">No pending approvals or browser input requests.</p>
      ) : (
        <div className="action-queue-sections">
          {approvals.length > 0 ? (
            <section className="action-queue-section">
              <div className="section-heading">
                <h3>Approvals</h3>
                <p>Review tool or file-change requests before Codex can continue.</p>
              </div>
              <ApprovalsSection approvals={approvals} onResolveApproval={onResolveApproval} />
            </section>
          ) : null}

          {requests.length > 0 ? (
            <section className="action-queue-section">
              <div className="section-heading">
                <h3>User Input</h3>
                <p>Answer follow-up questions that need browser-side input.</p>
              </div>
              <UserInputsSection
                onSkipUserInput={onSkipUserInput}
                onSubmitUserInput={onSubmitUserInput}
                requests={requests}
              />
            </section>
          ) : null}
        </div>
      )}
    </section>
  );
}
