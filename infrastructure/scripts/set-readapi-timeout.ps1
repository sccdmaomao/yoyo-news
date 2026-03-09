# Set Read API Lambda timeout to 60 seconds (default is 3s; digest generation needs more).
# Run after deploy if refresh still times out: .\scripts\set-readapi-timeout.ps1
$ErrorActionPreference = "Stop"
$Region = if ($env:AWS_REGION) { $env:AWS_REGION } else { "ca-central-1" }
$Name = aws lambda list-functions --region $Region `
  --query "Functions[?contains(FunctionName, 'ReadApi')].FunctionName" --output text 2>$null
if (-not $Name -or $Name -eq "None") {
  Write-Error "ReadApi Lambda not found. Deploy first: npx cdk deploy"
  exit 1
}
$Name = $Name.Trim()
Write-Host "Setting timeout to 60s for $Name..."
aws lambda update-function-configuration --region $Region --function-name $Name --timeout 60
Write-Host "Done. Try 'Digest' again." -ForegroundColor Green
