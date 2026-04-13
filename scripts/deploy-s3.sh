#!/bin/bash
# S3 프론트엔드 배포 스크립트
# 사용법: BUCKET_NAME=your-bucket ./scripts/deploy-s3.sh

set -e

if [ -z "$BUCKET_NAME" ]; then
  echo "❌ BUCKET_NAME 환경변수를 설정해주세요."
  echo "   예: BUCKET_NAME=bunggae-frontend ./scripts/deploy-s3.sh"
  exit 1
fi

echo "📦 프론트엔드 빌드 중..."
pnpm run build

echo "🚀 S3에 배포 중... (s3://$BUCKET_NAME)"
aws s3 sync dist/ "s3://$BUCKET_NAME" --delete \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "index.html"

aws s3 cp dist/index.html "s3://$BUCKET_NAME/index.html" \
  --cache-control "no-cache, no-store, must-revalidate"

echo "✅ 배포 완료!"
echo "   https://$BUCKET_NAME.s3.ap-northeast-2.amazonaws.com/index.html"
