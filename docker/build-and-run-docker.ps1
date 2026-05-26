param(
    [string]$SessionSecret = $(Read-Host -Prompt 'Enter SESSION_SECRET (recommended long random string)')
)

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error 'Docker is not installed or not in PATH.'; exit 1
}

if (-not $SessionSecret) {
    Write-Error 'SESSION_SECRET must be provided.'; exit 1
}

$env:SESSION_SECRET = $SessionSecret
docker compose up -d --build

Write-Host 'Container started, use "docker compose logs -f" to view logs.'
