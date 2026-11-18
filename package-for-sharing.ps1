$sourceDir = $PSScriptRoot
$zipFileName = "ASAAS_AI_Project_Portable.zip"
$destinationZip = Join-Path $sourceDir $zipFileName

Write-Host "Preparing Vibe-Coded ASAAS Agent zip package..." -ForegroundColor Cyan

if (Test-Path $destinationZip) {
    Remove-Item $destinationZip -Force
}

$tempStage = Join-Path $env:TEMP ("asaas_stage_" + [System.Guid]::NewGuid().ToString().Substring(0, 8))
New-Item -ItemType Directory -Path $tempStage -Force | Out-Null

Write-Host "Copying files excluding node_modules, .venv, data, and cache..." -ForegroundColor Yellow

$excludeDirs = @("node_modules", ".git", "__pycache__", ".vscode", ".idea", ".venv", "venv")
$excludeFiles = @("*.zip", "*.pyc", ".env", "*.db", "*.db-wal", "*.db-shm", "*.log")

Get-ChildItem -Path $sourceDir -Force | Where-Object {
    $item = $_
    $skip = $false
    foreach ($ex in $excludeDirs) {
        if ($item.PSIsContainer -and $item.Name -ieq $ex) { $skip = $true; break }
    }
    foreach ($exFile in $excludeFiles) {
        if (-not $item.PSIsContainer -and $item.Name -like $exFile) { $skip = $true; break }
    }
    -not $skip
} | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination $tempStage -Recurse -Force
}

# Recursively clean internal virtualenvs, node_modules, .git, __pycache__, runtime db
Get-ChildItem -Path $tempStage -Recurse -Directory -Force | Where-Object {
    $_.Name -in @('.git', '__pycache__', 'node_modules', '.venv', 'venv', 'dist')
} | ForEach-Object {
    Remove-Item -Path $_.FullName -Recurse -Force
}
Get-ChildItem -Path $tempStage -Recurse -File -Force | Where-Object {
    $_.Extension -in @('.db', '.db-wal', '.db-shm', '.log', '.pyc') -or $_.Name -eq '.env'
} | ForEach-Object {
    Remove-Item -Path $_.FullName -Force
}

Write-Host "Compressing archive to $zipFileName ..." -ForegroundColor Yellow
Compress-Archive -Path "$tempStage\*" -DestinationPath $destinationZip -CompressionLevel Optimal

Remove-Item -Path $tempStage -Recurse -Force

$zipSizeMB = [math]::Round((Get-Item $destinationZip).Length / 1MB, 2)

Write-Host ""
Write-Host "======================================================" -ForegroundColor Green
Write-Host "SUCCESS: Portable Vibe-Coded package created!" -ForegroundColor Green
Write-Host "File Name: $zipFileName" -ForegroundColor White
Write-Host "File Size: $zipSizeMB MB" -ForegroundColor White
Write-Host "Location : $destinationZip" -ForegroundColor Gray
Write-Host "======================================================" -ForegroundColor Green
