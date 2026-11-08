# Start n8n locally with optimal settings
Set-Location $PSScriptRoot
$env:N8N_PORT = "5678"
$env:GENERIC_TIMEZONE = "Asia/Riyadh"
$env:TZ = "Asia/Riyadh"
$env:EXECUTIONS_DATA_PRUNE = "true"
$env:EXECUTIONS_DATA_MAX_AGE = "168"
$env:NODE_FUNCTION_ALLOW_BUILTIN = "*"
$env:NODE_FUNCTION_ALLOW_EXTERNAL = "*"

Write-Host "Starting n8n on port 5678..."
& ".\node_modules\.bin\n8n.cmd" start
