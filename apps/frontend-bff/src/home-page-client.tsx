"use client";

import { useEffect, useState } from "react";

import { createWorkspaceFromHome, fetchHomeData } from "./home-data";
import { HomeView } from "./home-view";
import type { HomeResponse } from "./runtime-types";
import type { PublicNotificationEvent } from "./thread-types";

export function HomePageClient() {
  const [home, setHome] = useState<HomeResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState("");

  async function loadHome() {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      setHome(await fetchHomeData());
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
      await loadHome();
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
      onWorkspaceNameChange={setWorkspaceName}
      statusMessage={statusMessage}
      workspaceName={workspaceName}
    />
  );
}
