import type { ApprovalDecision, ApprovalRequest } from '../types';

interface ApprovalsSectionProps {
  approvals: ApprovalRequest[];
  onResolveApproval: (approval: ApprovalRequest, decision: ApprovalDecision) => Promise<void>;
}

const decisions: ApprovalDecision[] = ['allow', 'deny', 'cancel'];

export function ApprovalsSection(props: ApprovalsSectionProps) {
  const { approvals, onResolveApproval } = props;

  if (approvals.length === 0) {
    return <div className="approvals empty">No pending approvals.</div>;
  }

  return (
    <div className="approvals">
      {approvals.map((approval) => (
        <article className="approval-card" key={approval.requestId}>
          <p className="approval-method">{approval.method}</p>
          <pre className="approval-body">{JSON.stringify(approval.params || {}, null, 2)}</pre>
          <div className="approval-actions">
            {decisions.map((decision) => (
              <button
                data-decision={decision}
                key={decision}
                onClick={async () => {
                  await onResolveApproval(approval, decision);
                }}
                type="button"
              >
                {decision.charAt(0).toUpperCase() + decision.slice(1)}
              </button>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}
