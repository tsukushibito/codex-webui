"use client";

import { useEffect, useState } from "react";

import { createWorkspaceFromHome, fetchHomeData } from "./home-data";
import { HomeView } from "./home-view";
import type { HomeResponse } from "./public-types";
import type { PublicNotificationEvent } from "./thread-types";

function chooseDefaultWorkspaceId(home: HomeResponse | null) {
  const newestWorkspace = home?.workspaces.toSorted(
    (left, right) => Date.parse(right.updated_at) - Date.parse(left.updated_at),
  )[0];

  return home?.resume_candidates[0]?.workspace_id ?? newestWorkspace?.workspace_id ?? "";
}

export function HomePageClient() {
  const [home, setHome] = useState<HomeResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState("");

  async function loadHome() {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const nextHome = await fetchHomeData();
      setHome(nextHome);
      setSelectedWorkspaceId((currentWorkspaceId) => {
        if (
          nextHome.workspaces.some((workspace) => workspace.workspace_id === currentWorkspaceId)
        ) {
          return currentWorkspaceId;
        }

        return chooseDefaultWorkspaceId(nextHome);
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load Home data.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadHome();
  }, []);

  useEffect(() => {
    const notifications = new EventSource("/api/v1/notifications/stream");

    notifications.onmessage = (messageEvent) => {
      const event = JSON.parse(messageEvent.data) as PublicNotificationEvent;
      setStatusMessage(
        event.high_priority
          ? "High-priority background thread needs attention."
          : "Thread notification received. Refreshing Home.",
      );
      void loadHome();
    };

    notifications.onerror = () => {
      notifications.close();
    };

    return () => {
      notifications.close();
    };
  }, []);

  async function handleCreateWorkspace() {
    const trimmedName = workspaceName.trim();
    if (trimmedName.length === 0) {
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      await createWorkspaceFromHome(trimmedName);
      setWorkspaceName("");
      setStatusMessage(`Workspace "${trimmedName}" created.`);
      const nextHome = await fetchHomeData();
      setHome(nextHome);
      setSelectedWorkspaceId(
        nextHome.workspaces.find((workspace) => workspace.workspace_name === trimmedName)
          ?.workspace_id ?? chooseDefaultWorkspaceId(nextHome),
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to create workspace.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <HomeView
      errorMessage={errorMessage}
      home={home}
      isLoading={isLoading}
      isSubmitting={isSubmitting}
      onCreateWorkspace={handleCreateWorkspace}
      onSelectedWorkspaceIdChange={setSelectedWorkspaceId}
      onWorkspaceNameChange={setWorkspaceName}
      selectedWorkspaceId={selectedWorkspaceId}
      statusMessage={statusMessage}
      workspaceName={workspaceName}
    />
  );
}
