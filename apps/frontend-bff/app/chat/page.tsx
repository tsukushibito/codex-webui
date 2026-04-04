import Link from "next/link";

export default function ChatPlaceholderPage() {
  return (
    <main className="placeholder-shell">
      <div className="placeholder-card">
        <p className="eyebrow">Phase 4B-2</p>
        <h1>Chat screen placeholder</h1>
        <p>
          The Chat experience will land in the next UI slice. This route exists
          now so Home navigation stays valid.
        </p>
        <Link className="text-link" href="/">
          Back to Home
        </Link>
      </div>
    </main>
  );
}
