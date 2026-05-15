# Configura variáveis de ambiente no projeto kanban-minimal na Vercel.
# Uso:
#   $env:VERCEL_TOKEN = "seu-token-em-vercel.com/account/tokens"
#   .\scripts\setup-vercel-env.ps1

$ErrorActionPreference = "Stop"
$ProjectId = "prj_pu7MyOnxNo9UGPeMdjI8A9kA5hA4"
$TeamId = "team_ZE5gi9XsuTsOrOnvJRDgx23f"
$EnvFile = Join-Path $PSScriptRoot "..\.env.local"

if (-not $env:VERCEL_TOKEN) {
  Write-Host "Defina VERCEL_TOKEN (https://vercel.com/account/tokens) e execute de novo."
  exit 1
}

if (-not (Test-Path $EnvFile)) {
  Write-Host "Ficheiro .env.local nao encontrado em $EnvFile"
  exit 1
}

$vars = @{}
Get-Content $EnvFile | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -notmatch '^([^#=]+)=(.*)$') { return }
  $vars[$matches[1].Trim()] = $matches[2].Trim()
}

$required = @("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "AUTH_SESSION_SECRET")
foreach ($key in $required) {
  if (-not $vars[$key]) {
    Write-Host "Falta $key em .env.local"
    exit 1
  }
}

function Set-VercelEnv($Name, $Value, $Target) {
  $body = @{
    key = $Name
    value = $Value
    type = "encrypted"
    target = @($Target)
  } | ConvertTo-Json
  $uri = "https://api.vercel.com/v10/projects/$ProjectId/env?teamId=$TeamId"
  $headers = @{
    Authorization = "Bearer $env:VERCEL_TOKEN"
    "Content-Type" = "application/json"
  }
  try {
    Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -Body $body | Out-Null
    Write-Host "OK $Name -> $Target"
  } catch {
  $status = $_.Exception.Response.StatusCode.value__
    if ($status -eq 409) {
      Write-Host "Ja existe: $Name ($Target) — atualize manualmente no painel se o valor mudou."
    } else {
      throw
    }
  }
}

foreach ($key in $required) {
  Set-VercelEnv $key $vars[$key] "production"
  Set-VercelEnv $key $vars[$key] "preview"
}

Write-Host ""
Write-Host "Concluido. No Google Cloud, adicione o redirect:"
Write-Host "  https://kanban-minimal-psi.vercel.app/api/auth/google/callback"
Write-Host ""
Write-Host "Depois: Vercel -> kanban-minimal -> Deployments -> Redeploy (production)."
