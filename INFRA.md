# 번개 만남 - 인프라 구성 가이드

## 아키텍처

```
[S3 + CloudFront]  →  [EC2 Express API]  →  [RDS MySQL]
       ↑                      ↓
   프론트엔드            [Lambda + Bedrock Claude]
                         (AI 시간/장소 추천)
```

## 1. RDS (MySQL)

```bash
# RDS 인스턴스 생성 후 마이그레이션
cd server
cp .env.example .env   # DB 접속 정보 입력
npm install
npm run migrate
```

- 엔진: MySQL 8.0
- 인스턴스: db.t3.micro (개발) / db.t3.small (운영)
- VPC: EC2와 같은 VPC, 보안그룹에서 3306 포트 허용

## 2. EC2 (API 서버)

```bash
# EC2에서
git clone <repo>
cd server
cp .env.example .env   # 환경변수 설정
npm install
npm start              # 또는 pm2 start src/index.js
```

- AMI: Amazon Linux 2023
- 인스턴스: t3.micro (개발) / t3.small (운영)
- 보안그룹: 3000 포트 (또는 80/443 with nginx)
- IAM Role: `lambda:InvokeFunction` 권한 필요

## 3. Lambda (AI 집계)

```bash
cd lambda/aggregate
npm install
zip -r function.zip .
aws lambda create-function \
  --function-name bunggae-aggregate \
  --runtime nodejs20.x \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --timeout 30 \
  --memory-size 256 \
  --environment "Variables={DB_HOST=...,DB_PORT=3306,DB_USER=...,DB_PASSWORD=...,DB_NAME=bunggae,AWS_REGION=ap-northeast-2}"
```

- 런타임: Node.js 20.x
- 메모리: 256MB, 타임아웃: 30초
- IAM Role 필요 권한:
  - `bedrock:InvokeModel` (Claude 3 Haiku 모델)
  - RDS 접근을 위한 VPC 설정
- Bedrock 모델 접근: `anthropic.claude-3-haiku-20240307-v1:0`
  - AWS 콘솔 → Bedrock → Model access에서 Claude 모델 활성화 필요

## 4. S3 (프론트엔드)

```bash
# 프론트엔드 .env 설정
echo "VITE_API_URL=https://your-api-domain.com/api" > .env

# 빌드 & 배포
BUCKET_NAME=bunggae-frontend ./scripts/deploy-s3.sh
```

- 정적 웹사이트 호스팅 활성화
- CloudFront 연동 권장 (HTTPS + SPA 라우팅)

## 환경변수 요약

| 위치 | 변수 | 설명 |
|------|------|------|
| server/.env | DB_HOST | RDS 엔드포인트 |
| server/.env | DB_USER / DB_PASSWORD | RDS 인증 |
| server/.env | LAMBDA_FUNCTION_NAME | Lambda 함수명 |
| server/.env | CORS_ORIGIN | 프론트엔드 도메인 |
| Lambda 환경변수 | DB_* | RDS 접속 정보 |
| 프론트엔드 .env | VITE_API_URL | API 서버 주소 |
