const migrationSteps = [
  { issue: '#43', title: 'Define typed frontend contracts and shared state models' },
  { issue: '#44', title: 'Port current WebUI shell and layout to Preact components' },
  { issue: '#45', title: 'Port interactive session, approval, and file-inspection flows' },
  { issue: '#46', title: 'Rework frontend tests for Preact + TypeScript' },
  { issue: '#47', title: 'Finalize cutover and retire legacy vanilla frontend entrypoints' },
];

export function App() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Preact + TypeScript Bridge</p>
        <h1>Frontend toolchain is ready for the WebUI migration.</h1>
        <p className="lede">
          This route proves the new frontend stack can build and be served by the existing backend
          without cutting over the shipped legacy UI.
        </p>
        <div className="actions">
          <a className="primary" href="/">Open legacy UI</a>
          <a className="secondary" href="https://github.com/tsukushibito/codex-webui/issues/41">
            View migration umbrella
          </a>
        </div>
      </section>

      <section className="grid" aria-label="Bridge status">
        <article>
          <h2>Current state</h2>
          <ul>
            <li>Legacy WebUI remains at <code>/</code>.</li>
            <li>Preact build output is served at <code>/app</code>.</li>
            <li>Frontend assets are emitted under <code>/static/preact/</code>.</li>
          </ul>
        </article>
        <article>
          <h2>Next migration steps</h2>
          <ol>
            {migrationSteps.map((step) => (
              <li key={step.issue}>
                <strong>{step.issue}</strong> {step.title}
              </li>
            ))}
          </ol>
        </article>
      </section>
    </main>
  );
}
