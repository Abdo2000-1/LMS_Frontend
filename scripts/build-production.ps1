# Builds production static assets locally.
# Usage:
#   .\scripts\build-production.ps1 -ApiBaseUrl "https://your-api.azurewebsites.net"

param(
    [Parameter(Mandatory = $true)]
    [string]$ApiBaseUrl,

    [string]$BasePath = "/"
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

Push-Location $projectRoot
try {
    $env:VITE_API_BASE_URL = $ApiBaseUrl.TrimEnd("/")
    $env:VITE_BASE_PATH = $BasePath

    Write-Host "Building with VITE_API_BASE_URL=$($env:VITE_API_BASE_URL)" -ForegroundColor Cyan
    Write-Host "Building with VITE_BASE_PATH=$($env:VITE_BASE_PATH)" -ForegroundColor Cyan

    npm ci
    npm run build:prod

    Write-Host "Build complete. Output: $projectRoot\dist" -ForegroundColor Green
}
finally {
    Pop-Location
}
