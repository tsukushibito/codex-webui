# No Stream Capture

- case_name: `p4-initial-history-only-load`
- reason: Connection B did not subscribe to stream, and only `thread/read(includeTurns=true)` was observed for the first time. 
- setup_note: A pending approval thread was created in connection A, but the notification group is not saved as the original stream for this case. 
- consequence: The approval request payload and event sequence target only the range that can be reconstructed from the history-only load.
