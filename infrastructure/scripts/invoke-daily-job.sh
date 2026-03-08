#!/usr/bin/env bash
# Invoke the DailyJob Lambda to generate today's digest.
# Requires: AWS CLI configured, region ca-central-1 (or set AWS_REGION).
# Usage: ./scripts/invoke-daily-job.sh   or  npm run invoke-daily

set -e
REGION="${AWS_REGION:-ca-central-1}"

echo "Finding DailyJob Lambda in $REGION..."
NAME=$(aws lambda list-functions --region "$REGION" \
  --query "Functions[?contains(FunctionName, 'DailyJob')].FunctionName" --output text)
if [ -z "$NAME" ] || [ "$NAME" = "None" ]; then
  echo "DailyJob Lambda not found. Deploy the stack first: npx cdk deploy" >&2
  exit 1
fi

OUT_FILE="$(dirname "$0")/../lambda-out.json"
echo "Invoking $NAME..."
aws lambda invoke --region "$REGION" --function-name "$NAME" \
  --payload '{}' --cli-binary-format raw-in-base64-out "$OUT_FILE"
echo "Response: $(cat "$OUT_FILE")"
if grep -q FunctionError "$OUT_FILE" 2>/dev/null; then
  echo "Lambda reported an error. Check CloudWatch Logs for the function." >&2
  exit 1
fi
echo "Done. Refresh the app to see the new digest."
