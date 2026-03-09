# Open CloudWatch Logs for the Read API Lambda (handles /digests and /digests/refresh).
# Requires: AWS CLI configured.
# Usage: ./scripts/view-readapi-logs.ps1   or  .\view-readapi-logs.ps1 -Tail
#   -Tail  Optional. Stream recent logs and keep tailing (Ctrl+C to stop).

param([switch]$Tail)

$ErrorActionPreference = "Stop"
$Region = if ($env:AWS_REGION) { $env:AWS_REGION } else { "ca-central-1" }

Write-Host "Finding ReadApi Lambda in $Region..."
$Name = aws lambda list-functions --region $Region `
  --query "Functions[?contains(FunctionName, 'ReadApi')].FunctionName" --output text 2>$null
if (-not $Name -or $Name -eq "None") {
  Write-Error "ReadApi Lambda not found. Deploy the stack first: npx cdk deploy"
  exit 1
}
$Name = $Name.Trim()
$LogGroup = "/aws/lambda/$Name"

Write-Host "Log group: $LogGroup"
if ($Tail) {
  Write-Host "Tailing logs (Ctrl+C to stop)..."
  aws logs tail $LogGroup --region $Region --follow --format short
} else {
  Write-Host "Last 50 log events (use -Tail to stream live):"
  aws logs tail $LogGroup --region $Region --since 1h --format short
  Write-Host ""
  Write-Host "Open in AWS Console:"
  $Encoded = [uri]::EscapeDataString($LogGroup)
  Write-Host "  https://$Region.console.aws.amazon.com/cloudwatch/home?region=$Region#logsV2:log-groups/log-group/$Encoded"
  Write-Host ""
  Write-Host "Stream live: .\view-readapi-logs.ps1 -Tail"
}
