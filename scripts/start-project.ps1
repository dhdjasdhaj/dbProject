# Restart existing images and wait for every long-running service to be ready.
# Source-code changes should be compiled with deploy-employment.ps1 first.
$ErrorActionPreference = 'Stop'
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
Push-Location -LiteralPath $projectRoot
try {
    & docker compose up -d --no-build --wait --wait-timeout 180
    if ($LASTEXITCODE -ne 0) { throw 'Project startup failed. Check docker compose ps -a and service logs.' }
    $employmentHealth = Invoke-RestMethod -Uri 'http://127.0.0.1:18181/api/course/health' -TimeoutSec 10
    if ($employmentHealth.code -ne 200 -or $employmentHealth.data.status -ne 'UP') {
        throw 'Employment module is not ready at the website proxy.'
    }
    Write-Output 'Project ready: http://localhost:18181/employment'
} finally { Pop-Location }
