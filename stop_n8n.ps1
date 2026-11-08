# Stop n8n process and tunnel
Get-Process -Name node | Where-Object { $_.CommandLine -like "*n8n*" } | Stop-Process -Force -ErrorAction SilentlyContinue
docker stop n8n-public-tunnel -ErrorAction SilentlyContinue
Write-Host "n8n stopped."
