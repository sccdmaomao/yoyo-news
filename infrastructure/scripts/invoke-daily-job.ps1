# Invoke the DailyJob Lambda to generate today's digest.
# Requires: AWS CLI configured, region ca-central-1 (or set AWS_REGION).
# Usage: ./scripts/invoke-daily-job.ps1   or  npm run invoke-daily

$ErrorActionPreference = "Stop"
$Region = if ($env:AWS_REGION) { $env:AWS_REGION } else { "ca-central-1" }

Write-Host "Finding DailyJob Lambda in $Region..."
$Name = aws lambda list-functions --region $Region `
  --query "Functions[?contains(FunctionName, 'DailyJob')].FunctionName" --output text 2>$null
if (-not $Name -or $Name -eq "None") {
  Write-Error "DailyJob Lambda not found. Deploy the stack first: npx cdk deploy"
  exit 1
}

$Name = $Name.Trim()
$OutFile = Join-Path $PSScriptRoot ".." "lambda-out.json"

Write-Host "Invoking $Name..."
$result = aws lambda invoke --region $Region --function-name $Name `
  --payload "{}" --cli-binary-format raw-in-base64-out $OutFile 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Error $result
  exit 1
}

$response = Get-Content $OutFile -Raw
Write-Host "Response: $response"
if ($response -match '"FunctionError"') {
  Write-Host "Lambda reported an error. Check CloudWatch Logs for the function." -ForegroundColor Yellow
  exit 1
}
Write-Host "Done. Refresh the app to see the new digest." -ForegroundColor Green
