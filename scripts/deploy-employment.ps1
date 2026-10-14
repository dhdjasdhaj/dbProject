param([switch]$SkipBackup)
$ErrorActionPreference = 'Stop'
$courseRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
Set-Location -LiteralPath $courseRoot
function Invoke-Checked {
    param([string]$Program, [string[]]$Arguments)
    & $Program @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Program exited with $LASTEXITCODE" }
}
Invoke-Checked 'docker' @('info','--format','{{.ServerVersion}}')
if (-not (Test-Path -LiteralPath (Join-Path $courseRoot '.env'))) {
    & (Join-Path $PSScriptRoot 'init-local-config.ps1')
}
# Never display environment values or put database credentials into command arguments.
$courseEnvFile = Join-Path $courseRoot '.env'
$courseEnvContent = [System.IO.File]::ReadAllText($courseEnvFile)
$courseAppend = ''
foreach ($courseKey in @('COURSE_MYSQL_PASSWORD','COURSE_MYSQL_ROOT_PASSWORD')) {
    if ($courseEnvContent -notmatch ('(?m)^' + $courseKey + '=')) {
        $courseAppend += "`n$courseKey=$([guid]::NewGuid().ToString('N'))$([guid]::NewGuid().ToString('N'))"
    }
}
if ($courseAppend) { [System.IO.File]::AppendAllText($courseEnvFile,$courseAppend+"`n",[System.Text.UTF8Encoding]::new($false)) }
$courseJavaReady = $false
if ($env:JAVA_HOME -and (Test-Path -LiteralPath (Join-Path $env:JAVA_HOME 'release'))) {
    $courseJavaReady = [System.IO.File]::ReadAllText((Join-Path $env:JAVA_HOME 'release')) -match '(?m)^JAVA_VERSION="21[."]'
}
if (-not $courseJavaReady) {
    $courseJdk = Get-ChildItem -LiteralPath (Join-Path $env:USERPROFILE '.gradle/jdks') -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -match '21' -and (Test-Path -LiteralPath (Join-Path $_.FullName 'bin/java.exe')) } | Select-Object -First 1
    if (-not $courseJdk) { throw 'Install JDK 21 and set JAVA_HOME.' }
    $env:JAVA_HOME = $courseJdk.FullName
}
if (-not $SkipBackup) {
    New-Item -ItemType Directory -Path 'verification/employment/backup' -Force | Out-Null
    foreach ($courseImage in @('interview-submit-app','interview-submit-frontend')) {
        & docker image inspect "${courseImage}:before-employment" *> $null
        if ($LASTEXITCODE -ne 0) { Invoke-Checked 'docker' @('tag',"${courseImage}:latest","${courseImage}:before-employment") }
    }
    if (-not (Test-Path -LiteralPath 'verification/employment/backup/postgres-before.dump')) {
        Invoke-Checked 'docker' @('exec','interview-submit-postgres','pg_dump','-U','postgres','-d','interview_guide','--format=custom','--file=/tmp/employment-before.dump')
        Invoke-Checked 'docker' @('cp','interview-submit-postgres:/tmp/employment-before.dump','verification/employment/backup/postgres-before.dump')
    }
}
Invoke-Checked '.\gradlew.bat' @(':course-app:bootJar',':app:bootJar','--no-daemon')
Push-Location -LiteralPath 'frontend'
try {
    if (-not (Test-Path -LiteralPath 'node_modules')) { Invoke-Checked 'npm.cmd' @('ci','--no-audit','--no-fund') }
    Invoke-Checked 'npm.cmd' @('run','build')
} finally { Pop-Location }
$courseStage = Join-Path $courseRoot '.deployment/employment'
New-Item -ItemType Directory -Path $courseStage -Force | Out-Null
$courseJar = Get-ChildItem -LiteralPath 'course-app/build/libs' -Filter '*.jar' | Where-Object Name -NotLike '*-plain.jar' | Select-Object -First 1
$courseLegacyJar = Get-ChildItem -LiteralPath 'app/build/libs' -Filter '*.jar' | Where-Object Name -NotLike '*-plain.jar' | Select-Object -First 1
Copy-Item -LiteralPath $courseJar.FullName -Destination (Join-Path $courseStage 'course.jar') -Force
Copy-Item -LiteralPath $courseLegacyJar.FullName -Destination (Join-Path $courseStage 'legacy.jar') -Force
$courseWebStage = Join-Path $courseStage 'web'
# Verify the complete target before removing old compiled assets; source files are never removed.
if ([System.IO.Path]::GetFullPath($courseWebStage) -ne [System.IO.Path]::GetFullPath((Join-Path $courseRoot '.deployment/employment/web'))) { throw 'Unexpected web staging path' }
if (Test-Path -LiteralPath $courseWebStage) { Remove-Item -LiteralPath $courseWebStage -Recurse -Force }
Copy-Item -LiteralPath 'frontend/dist' -Destination $courseWebStage -Recurse -Force
Copy-Item -LiteralPath 'frontend/nginx.conf' -Destination (Join-Path $courseStage 'nginx.conf') -Force
foreach ($courseBuild in @(@('course-runtime','interview-submit-course-app:latest'),@('legacy-runtime','interview-submit-app:latest'),@('web-runtime','interview-submit-frontend:latest'))) {
    Invoke-Checked 'docker' @('build','-f','docker/employment/Dockerfile.runtime','--target',$courseBuild[0],'-t',$courseBuild[1],$courseStage)
}
Invoke-Checked 'docker' @('compose','up','-d','--wait','--wait-timeout','180','--no-build','course-mysql','course-app','app','frontend')
Write-Output 'Employment module deployed. Website: http://localhost:18181/employment'
