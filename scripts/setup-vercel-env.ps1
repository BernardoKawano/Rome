# Configura variáveis no projeto Vercel "rome" (https://rome-sage.vercel.app)
# Uso:
#   $env:VERCEL_TOKEN = "seu-token-em-vercel.com/account/tokens"
#   .\scripts\setup-vercel-env.ps1

param(
  [string]$ProjectId = "prj_2b5revZJrVu51tdJswudv8eBDPZD",
  [string]$TeamId = "team_ZE5gi9XsuTsOrOnvJRDgx23f",
  [string]$ProductionUrl = "https://rome-sage.vercel.app"
)

$ErrorActionPreference = "Stop"
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

$vars["GOOGLE_REDIRECT_URI"] = "$ProductionUrl/api/auth/google/callback"

$required = @("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "AUTH_SESSION_SECRET", "GOOGLE_REDIRECT_URI")
foreach ($key in $required) {
  if (-not $vars[$key]) {
    Write-Host "Falta $key"
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
      Write-Host "Ja existe: $Name ($Target)"
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
Write-Host "Projeto: rome -> $ProductionUrl"
Write-Host "No Google Cloud, redirect OAuth:"
Write-Host "  $($vars['GOOGLE_REDIRECT_URI'])"
Write-Host ""
Write-Host "Depois: https://vercel.com/kawanober-3866s-projects/rome/deployments -> Redeploy"
