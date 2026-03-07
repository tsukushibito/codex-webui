import { Shell } from './components/Shell';
import { useShellSession } from './hooks/use-shell-session';

export function App() {
  const shell = useShellSession();

  return (
    <Shell
      activePane={shell.activePane}
      approvals={shell.approvals}
      diffError={shell.diffError}
      filePreviewError={shell.filePreviewError}
      loadingSelection={shell.loadingSelection}
      loadingWorkspaceTree={shell.loadingWorkspaceTree}
      messages={shell.messages}
      onResolveApproval={shell.onResolveApproval}
      onSelectPane={shell.setActivePane}
      onSelectPath={shell.onSelectPath}
      onSend={shell.sendTurn}
      onSkipUserInput={shell.onSkipUserInput}
      onSubmitUserInput={shell.onSubmitUserInput}
      selectedDiff={shell.selectedDiff}
      selectedFile={shell.selectedFile}
      selectedPath={shell.selectedPath}
      sending={shell.sending}
      sessionId={shell.sessionId}
      sessionReady={shell.sessionReady}
      statusText={shell.statusText}
      userInputs={shell.userInputs}
      workspaceTree={shell.workspaceTree}
    />
  );
}
