# Create private configuration for a new checkout. Never overwrite existing secrets.
$ErrorActionPreference = 'Stop'
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$configPath = Join-Path $projectRoot '.env'
if (Test-Path -LiteralPath $configPath) {
    Write-Output 'Existing .env preserved. Configure it locally if needed.'
    return
}
$examplePath = Join-Path $projectRoot '.env.example'
$config = [System.IO.File]::ReadAllText($examplePath)
function New-LocalSecret {
    $secretBytes = New-Object byte[] 32
    $random = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $random.GetBytes($secretBytes) } finally { $random.Dispose() }
    return [Convert]::ToBase64String($secretBytes).Replace('+','-').Replace('/','_').TrimEnd('=')
}
$initialValues = @{
    COURSE_MYSQL_PASSWORD = New-LocalSecret
    COURSE_MYSQL_ROOT_PASSWORD = New-LocalSecret
    APP_ADMIN_USERNAME = 'site_admin'
    APP_ADMIN_PASSWORD = New-LocalSecret
}
foreach ($configKey in $initialValues.Keys) {
    $pattern = '(?m)^' + [regex]::Escape($configKey) + '=.*$'
    if ($config -notmatch $pattern) { throw "Missing $configKey in .env.example" }
    $config = [regex]::Replace($config, $pattern, ($configKey + '=' + $initialValues[$configKey]))
}
# CreateNew also protects against a second process creating .env meanwhile.
$configStream = [System.IO.File]::Open($configPath, [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::Write)
try {
    $configBytes = [System.Text.UTF8Encoding]::new($false).GetBytes($config)
    $configStream.Write($configBytes, 0, $configBytes.Length)
} finally { $configStream.Dispose() }
Write-Output 'Created private .env with unique MySQL and administrator credentials. View them locally in .env; do not upload this file.'
