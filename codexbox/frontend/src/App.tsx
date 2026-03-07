import { Shell } from './components/Shell';
import { useShellSession } from './hooks/use-shell-session';

export function App() {
  const shell = useShellSession();

  return (
    <Shell
      activePane={shell.activePane}
      messages={shell.messages}
      onSelectPane={shell.setActivePane}
      onSend={shell.sendTurn}
      sending={shell.sending}
      sessionId={shell.sessionId}
      sessionReady={shell.sessionReady}
      statusText={shell.statusText}
    />
  );
}
