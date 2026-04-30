$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $scriptDir "..")

$composeFile = if ($env:TAILSCALE_BROWSER_COMPOSE_FILE) {
    $env:TAILSCALE_BROWSER_COMPOSE_FILE
} else {
    Join-Path $repoRoot "docker-compose.tailscale-browser.yml"
}

$envFile = if ($env:TAILSCALE_BROWSER_ENV_FILE) {
    $env:TAILSCALE_BROWSER_ENV_FILE
} else {
    Join-Path $repoRoot ".env.tailscale-browser"
}

$remainingArgs = New-Object System.Collections.Generic.List[string]

foreach ($arg in $args) {
    switch ($arg) {
        "--example-env" {
            $envFile = Join-Path $repoRoot ".env.tailscale-browser.example"
            continue
        }
        "--help" {
            $remainingArgs.Add($arg)
            continue
        }
        "-h" {
            $remainingArgs.Add($arg)
            continue
        }
        default {
            $remainingArgs.Add($arg)
        }
    }
}

if ($remainingArgs.Count -gt 0 -and ($remainingArgs[0] -eq "--help" -or $remainingArgs[0] -eq "-h")) {
    @"
Usage:
  scripts\tailscale-browser-compose.ps1 [--example-env] [docker compose args...]

Options:
  --example-env  Use .env.tailscale-browser.example instead of .env.tailscale-browser
  --help         Show this help text

Examples:
  scripts\tailscale-browser-compose.ps1 up -d
  scripts\tailscale-browser-compose.ps1 ps
  scripts\tailscale-browser-compose.ps1 logs -f
  scripts\tailscale-browser-compose.ps1 exec tailscale tailscale status
  scripts\tailscale-browser-compose.ps1 down

Environment overrides:
  TAILSCALE_BROWSER_COMPOSE_FILE  Compose file path
  TAILSCALE_BROWSER_ENV_FILE      Env file path
"@
    exit 0
}

if (-not (Test-Path -LiteralPath $composeFile -PathType Leaf)) {
    Write-Error "[tailscale-browser-compose] error: compose file not found: $composeFile"
    exit 1
}

if (-not (Test-Path -LiteralPath $envFile -PathType Leaf)) {
    Write-Error "[tailscale-browser-compose] error: env file not found: $envFile; create it with: Copy-Item .env.tailscale-browser.example .env.tailscale-browser"
    exit 1
}

& docker compose -f $composeFile --env-file $envFile @remainingArgs
exit $LASTEXITCODE
