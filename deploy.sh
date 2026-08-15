#!/usr/bin/env bash
# Deploy mle-tools to Garage S3 (garage:dev-toolbox)
set -euo pipefail

cd "$(dirname "$0")"

BUCKET="garage:dev-toolbox"

echo "==> Building..."
npm run build

echo "==> Uploading dist/ to $BUCKET ..."
rclone sync dist "$BUCKET" -q

echo "==> Done. Deployed $(find dist -type f | wc -l) files to $BUCKET"
