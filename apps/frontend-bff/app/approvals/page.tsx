import Link from "next/link";

export default function ApprovalPlaceholderPage() {
  return (
    <main className="placeholder-shell">
      <div className="placeholder-card">
        <p className="eyebrow">Phase 4B-3</p>
        <h1>Approval screen placeholder</h1>
        <p>
          The Approval experience will land in a later UI slice. This route
          keeps the Home approval navigation live in the meantime.
        </p>
        <Link className="text-link" href="/">
          Back to Home
        </Link>
      </div>
    </main>
  );
}
