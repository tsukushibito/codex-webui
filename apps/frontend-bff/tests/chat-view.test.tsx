import type React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ChatView } from "../src/chat-view";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    className,
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) => (
    <a className={className} href={href}>
      {children}
    </a>
  ),
}));

describe("ChatView", () => {
  it("renders the chat transcript, activity log, and approval waiting signal", () => {
    const markup = renderToStaticMarkup(
      <ChatView
        connectionState="live"
        createSessionTitle=""
        draftAssistantMessages={[
          {
            message_id: "draft_001",
            content: "Streaming update",
          },
        ]}
        errorMessage={null}
        events={[
          {
            event_id: "evt_001",
            session_id: "thread_001",
            event_type: "approval.requested",
            sequence: 3,
            occurred_at: "2026-03-27T05:18:00Z",
            payload: {
              approval_id: "apr_001",
              title: "Run git push",
            },
          },
        ]}
        isCreatingSession={false}
        isLoadingSession={false}
        isLoadingSessions={false}
        isSendingMessage={false}
        isStartingSession={false}
        isStoppingSession={false}
        messageDraft=""
        messages={[
          {
            message_id: "msg_user_001",
            session_id: "thread_001",
            role: "user",
            content: "Please explain the diff.",
            created_at: "2026-03-27T05:14:00Z",
          },
        ]}
        onCreateSession={() => {}}
        onCreateSessionTitleChange={() => {}}
        onMessageDraftChange={() => {}}
        onSelectSession={() => {}}
        onSendMessage={() => {}}
        onStartSession={() => {}}
        onStopSession={() => {}}
        selectedSession={{
          session_id: "thread_001",
          workspace_id: "ws_alpha",
          title: "Fix build error",
          status: "waiting_approval",
          created_at: "2026-03-27T05:12:34Z",
          updated_at: "2026-03-27T05:22:00Z",
          started_at: "2026-03-27T05:13:00Z",
          last_message_at: "2026-03-27T05:21:40Z",
          active_approval_id: "apr_001",
          can_send_message: false,
          can_start: false,
          can_stop: true,
        }}
        selectedSessionId="thread_001"
        sessions={[
          {
            session_id: "thread_001",
            workspace_id: "ws_alpha",
            title: "Fix build error",
            status: "waiting_approval",
            created_at: "2026-03-27T05:12:34Z",
            updated_at: "2026-03-27T05:22:00Z",
            started_at: "2026-03-27T05:13:00Z",
            last_message_at: "2026-03-27T05:21:40Z",
            active_approval_id: "apr_001",
            can_send_message: false,
            can_start: false,
            can_stop: true,
          },
        ]}
        statusMessage="Approval requested."
        workspaceId="ws_alpha"
      />,
    );

    expect(markup).toContain("Fix build error");
    expect(markup).toContain("Approval waiting: apr_001");
    expect(markup).toContain("Please explain the diff.");
    expect(markup).toContain("Streaming update");
    expect(markup).toContain("approval.requested");
  });

  it("renders transient feedback in a dedicated layout row before the chat panels", () => {
    const markup = renderToStaticMarkup(
      <ChatView
        connectionState="live"
        createSessionTitle=""
        draftAssistantMessages={[]}
        errorMessage="Failed to stop the session."
        events={[]}
        isCreatingSession={false}
        isLoadingSession={false}
        isLoadingSessions={false}
        isSendingMessage={false}
        isStartingSession={false}
        isStoppingSession={false}
        messageDraft=""
        messages={[]}
        onCreateSession={() => {}}
        onCreateSessionTitleChange={() => {}}
        onMessageDraftChange={() => {}}
        onSelectSession={() => {}}
        onSendMessage={() => {}}
        onStartSession={() => {}}
        onStopSession={() => {}}
        selectedSession={null}
        selectedSessionId={null}
        sessions={[]}
        statusMessage="Session started."
        workspaceId="ws_alpha"
      />,
    );

    expect(markup).toContain("chat-feedback-stack");
    expect(markup).toContain("Session started.");
    expect(markup).toContain("Failed to stop the session.");
    expect(markup.indexOf("chat-feedback-stack")).toBeLessThan(
      markup.indexOf("chat-panel create-card"),
    );
  });
});
