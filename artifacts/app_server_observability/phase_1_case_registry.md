# Phase 1 Case Registry

Fix the reserved case names and responsibilities below as of the completion of Phase 1.  
Store the raw evidence for each case using the structure defined in [artifacts/app_server_observability/observations/README.md](./observations/README.md).

## tasks Phase 2

| case_name | Purpose | Minimum artifacts to retain |
| --- | --- | --- |
| `p2-normal-turn-complete` | Observe item / signal / status behavior for a normal single-turn completion | request, response, stream, history, judgment |
| `p2-no-assistant-message` | Observe a turn that does not produce an assistant message | request, response, stream, history, judgment |
| `p2-multi-turn-follow-up` | Observe thread reuse and status return behavior in a follow-up turn | request, response, stream, history, judgment |
| `p2-create-start-semantics` | Observe the initial semantics of create / start | request, response, history, judgment |

## tasks Phase 3

| case_name | Purpose | Minimum artifacts to retain |
| --- | --- | --- |
| `p3-approval-approve` | Observe an approval request and the changes after approve | request, response, stream, history, judgment |
| `p3-approval-deny` | Observe an approval request and the changes after deny | request, response, stream, history, judgment |
| `p3-approval-stop` | Observe the difference introduced by stop during approval | request, response, stream, history, judgment |
| `p3-stop-during-running` | Observe the difference introduced by stop during normal execution | request, response, stream, history, judgment |
| `p3-transient-failure` | Observe the evidence needed to distinguish transient failure from terminal failure | request, response, stream, history, judgment |
| `p3-stop-close-to-approval-resolve` | Observe conflicts when stop and approval resolve occur close together | request, response, stream, history, judgment |

## tasks Phase 4

| case_name | Purpose | Minimum artifacts to retain |
| --- | --- | --- |
| `p4-stream-disconnect-reload` | Observe reload consistency after SSE disconnection and re-fetch | request, response, stream, history, judgment |
| `p4-initial-history-only-load` | Observe initial restoration without ever connecting to the stream | request, response, history, judgment |

## Common Rules

- Treat this registry as the source of truth for case names
- Do not change the case name when rerunning a case
- If you add a derived case, assign a new case name instead of reusing an existing one
- Start each case judgment note from [artifacts/app_server_observability/phase_1_judgment_template.md](./phase_1_judgment_template.md)
