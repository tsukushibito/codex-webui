"use strict";

function createTurnChangeService({ captureWorkspaceSnapshot, emitSessionEvent, normalizeError, nowMs }) {
  function virtualSnapshotEntry(pathname) {
    return {
      path: pathname,
      tracked: false,
      exists: false,
      kind: "missing",
      digest: null,
      gitStatus: "  ",
      indexStatus: " ",
      worktreeStatus: " ",
    };
  }

  function snapshotEntriesEqual(left, right) {
    return (
      left.tracked === right.tracked &&
      left.exists === right.exists &&
      left.kind === right.kind &&
      left.digest === right.digest &&
      left.gitStatus === right.gitStatus &&
      left.indexStatus === right.indexStatus &&
      left.worktreeStatus === right.worktreeStatus
    );
  }

  function serializeSnapshotEntry(entry) {
    return {
      exists: entry.exists,
      kind: entry.kind,
      tracked: entry.tracked,
      gitStatus: entry.gitStatus,
      indexStatus: entry.indexStatus,
      worktreeStatus: entry.worktreeStatus,
    };
  }

  function determineTurnFileChangeType(beforeEntry, afterEntry) {
    if (!beforeEntry.exists && afterEntry.exists) {
      return "created";
    }
    if (beforeEntry.exists && !afterEntry.exists) {
      return "deleted";
    }
    return "updated";
  }

  function diffWorkspaceSnapshots(beforeSnapshot, afterSnapshot) {
    const changedFiles = [];
    const paths = new Set([...beforeSnapshot.keys(), ...afterSnapshot.keys()]);

    for (const pathname of Array.from(paths).sort((left, right) => left.localeCompare(right))) {
      const beforeEntry = beforeSnapshot.get(pathname) || virtualSnapshotEntry(pathname);
      const afterEntry = afterSnapshot.get(pathname) || virtualSnapshotEntry(pathname);

      if (snapshotEntriesEqual(beforeEntry, afterEntry)) {
        continue;
      }

      changedFiles.push({
        path: pathname,
        changeType: determineTurnFileChangeType(beforeEntry, afterEntry),
        before: serializeSnapshotEntry(beforeEntry),
        after: serializeSnapshotEntry(afterEntry),
      });
    }

    return changedFiles;
  }

  function rememberCompletedTurnChanges(session, turnChanges) {
    session.completedTurnChanges.set(turnChanges.turnId, turnChanges);
    while (session.completedTurnChanges.size > 20) {
      const oldestTurnId = session.completedTurnChanges.keys().next().value;
      session.completedTurnChanges.delete(oldestTurnId);
    }
  }

  function rememberActiveTurnSnapshot(session, snapshot) {
    session.activeTurnSnapshots.set(snapshot.turnId, snapshot);
  }

  function getCompletedTurnChanges(session, turnId) {
    return session.completedTurnChanges.get(String(turnId || "").trim());
  }

  async function finalizeTurnChanges(session, params) {
    const turnId = String(params?.turn?.id || "").trim();
    if (!turnId) {
      return;
    }

    const activeTurn = session.activeTurnSnapshots.get(turnId);
    if (!activeTurn) {
      return;
    }

    try {
      const completedSnapshot = await captureWorkspaceSnapshot();
      const turnChanges = {
        turnId,
        threadId: String(params?.threadId || activeTurn.threadId || session.threadId || "").trim() || null,
        startedAt: activeTurn.startedAt,
        completedAt: nowMs(),
        changedFiles: diffWorkspaceSnapshots(activeTurn.snapshot, completedSnapshot),
      };
      session.activeTurnSnapshots.delete(turnId);
      rememberCompletedTurnChanges(session, turnChanges);
    } catch (err) {
      session.activeTurnSnapshots.delete(turnId);
      emitSessionEvent(session, "turn/changes_error", {
        turnId,
        error: normalizeError(err),
      });
    }
  }

  return {
    finalizeTurnChanges,
    getCompletedTurnChanges,
    rememberActiveTurnSnapshot,
  };
}

module.exports = {
  createTurnChangeService,
};
