# Manual Docker Verification For Issue #153

## Purpose

This note records the manual Docker verification steps that remain before Issue `#153` can be treated as fully validated.

Use this from the active worktree:

- `/workspace/.worktrees/issue-153-ngrok-prereqs-doctor`

## Preconditions

- Run the commands from `/workspace/.worktrees/issue-153-ngrok-prereqs-doctor`
- Docker and `docker compose` must be available on the host
- The worktree should still contain the local changes for:
  - `Dockerfile`
  - `docker-compose.yml`
  - `scripts/doctor.sh`
- `scripts/start-codex-webui.sh` must remain unchanged in this slice

## What This Verification Must Prove

1. The dev image builds with the new `ngrok` prerequisite surface.
2. The built container resolves both `ngrok` and `devtunnel`.
3. `scripts/doctor.sh` fails when `NGROK_AUTHTOKEN` and `NGROK_BASIC_AUTH` are missing.
4. `scripts/doctor.sh` passes when `NGROK_AUTHTOKEN` and `NGROK_BASIC_AUTH` are provided.
5. The unchanged launcher still has its legacy dependency surface available.

## Commands

### 1. Build the dev image

```bash
docker compose -f docker-compose.yml build dev
```

Expected result:

- exits `0`
- completes without removing the legacy `devtunnel` install

### 2. Confirm the container sees both CLIs and that doctor fails without ngrok env

```bash
docker compose -f docker-compose.yml run --rm dev bash -lc 'command -v ngrok && command -v devtunnel && scripts/doctor.sh'
```

Expected result:

- `command -v ngrok` succeeds
- `command -v devtunnel` succeeds
- `scripts/doctor.sh` exits non-zero
- failure output points at missing `NGROK_AUTHTOKEN` and/or `NGROK_BASIC_AUTH`
- failure must not be because `devtunnel` is missing

### 3. Confirm doctor passes when ngrok env is provided

```bash
docker compose -f docker-compose.yml run --rm \
  -e NGROK_AUTHTOKEN=test-token \
  -e NGROK_BASIC_AUTH=user:pass \
  dev \
  bash -lc 'command -v ngrok && command -v devtunnel && scripts/doctor.sh'
```

Expected result:

- exits `0`
- output ends with `doctor: PASS`

### 4. Confirm the unchanged launcher still has its dependency surface

```bash
docker compose -f docker-compose.yml run --rm dev bash -lc 'scripts/start-codex-webui.sh --help >/dev/null'
```

Expected result:

- exits `0`

## Evidence To Record

- Exit code for each command
- Any failing command output
- Confirmation that the failure mode in step 2 is specifically the missing `NGROK_*` inputs
- Confirmation that step 3 reaches `doctor: PASS`

## After Verification

If all commands behave as expected:

1. Update `tasks/issue-153-ngrok-prereqs-doctor/README.md` to note that manual Docker verification is complete.
2. Continue to the dedicated pre-push validation gate.
3. Then archive the package and move into PR / merge / cleanup flow.

If any command does not behave as expected:

1. Keep Issue `#153` open and the package active.
2. Record the failing step and output in the task package notes or an `artifacts/` log.
3. Fix the implementation on `issue-153-ngrok-prereqs-doctor` before any publish-oriented handoff.
