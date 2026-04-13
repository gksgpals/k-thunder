# ⚡ K-Thunder (번개 만남)

> 친구들과 번개 모임 일정을 조율하는 웹앱. AI가 최적의 시간과 장소를 추천해줍니다.

---

## 📌 앱 소개

K-Thunder는 "번개 모임"을 위한 일정 조율 서비스입니다.
모임 생성자가 후보 날짜를 정하면, 참여자들이 가능한 시간대를 드래그로 선택하고,
AI(Bedrock Claude)가 모든 응답을 분석하여 최적의 만남 시간과 장소를 추천합니다.

### 주요 기능
- 캘린더에서 후보 날짜 선택 → 시간대 드래그 선택 → 모임 생성
- 공유 링크로 참여자 초대 → 참여자별 시간/선호 장소 입력
- AI 기반 결과 분석: 추천 시간, 추천 장소, 한줄 요약
- 스마트 조정 제안: "1명만 30분 조정하면 전원 참석 가능" 같은 구체적 안내
- 시간대별 히트맵에 참여자 이름 표시
- "이 날짜 다 안 돼요" 피드백 기능

### 직접 기획한 요소
- 네오 브루탈리즘 디자인 (두꺼운 보더, 비비드 컬러, 3D 그림자)
- 드래그 기반 시간 선택 UI (마킹 중 플로팅 인디케이터)
- AI 스마트 조정 제안 (near-miss 분석)
- 참여자별 선호 장소 수집 → AI 종합 장소 추천

---

## 🏗️ AWS 리소스 활용

| AWS 서비스 | 역할 | 상세 |
|-----------|------|------|
| **EC2** | API 서버 | Express.js REST API. 모임 CRUD, 참여자 응답 처리. `server/` 폴더 |
| **RDS (MySQL)** | 데이터 저장소 | meetings, participants, ai_results 3개 테이블. `server/src/db/migrate.js` |
| **S3** | 프론트엔드 호스팅 | React 빌드 결과물 정적 배포. `scripts/deploy-s3.sh` |
| **Lambda + Bedrock** | AI 분석 | 참여자 응답 집계 → Bedrock Claude로 시간/장소 추천 생성. `lambda/aggregate/index.mjs` |

### 아키텍처

```
사용자 브라우저
    │
    ▼
┌─────────┐     ┌──────────────┐     ┌───────────┐
│   S3    │     │   EC2        │     │   RDS     │
│ 프론트엔드│────▶│ Express API  │────▶│  MySQL    │
└─────────┘     └──────┬───────┘     └───────────┘
                       │
                       ▼
                ┌──────────────┐
                │   Lambda     │
                │ + Bedrock    │
                │  (AI 분석)   │
                └──────────────┘
```

### API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/meetings` | 모임 생성 |
| GET | `/api/meetings/:id` | 모임 정보 + 참여자 조회 |
| POST | `/api/meetings/:id/join` | 참여자 응답 제출 |
| GET | `/api/meetings/:id/result` | AI 분석 결과 조회 |

---

## 🚀 실행 방법

### 로컬 실행 (Mock 모드 — 백엔드 없이 동작)

```bash
# 1. 의존성 설치
npm install

# 2. 개발 서버 실행
npm run dev
```

브라우저에서 `http://localhost:5173` 접속.
Mock 모드가 자동 활성화되어 localStorage 기반으로 전체 플로우를 테스트할 수 있습니다.

### 테스트 방법

1. `/` 에서 날짜 선택 → 시간 드래그 → 이름 입력 → "번개 치기" 클릭
2. 공유 화면에서 "내 모임 참여하기" 클릭
3. `/m/:id` 에서 다른 이름으로 시간 선택 → "참여하기" 클릭
4. `/m/:id/result` 에서 AI 결과 확인 (히트맵 + 추천 시간/장소)

> Mock 모드에서는 같은 브라우저에서 여러 참여자를 시뮬레이션할 수 있습니다.

### AWS 배포 시 (운영 모드)

```bash
# 1. 서버 환경변수 설정
cd server
cp .env.example .env
# .env 파일에 RDS 엔드포인트, 비밀번호 등 입력

# 2. DB 마이그레이션
npm install
npm run migrate

# 3. 서버 실행
npm start

# 4. 프론트엔드 빌드 & S3 배포
cd ..
echo "VITE_API_URL=http://<EC2_IP>:3000/api" > .env
npm run build
BUCKET_NAME=<S3_BUCKET> ./scripts/deploy-s3.sh

# 5. Lambda 배포
cd lambda/aggregate
npm install
zip -r function.zip .
# AWS CLI로 Lambda 함수 생성/업데이트
```

자세한 인프라 설정은 [INFRA.md](./INFRA.md)를 참고하세요.

---

## 📁 프로젝트 구조

```
├── src/                          # 프론트엔드 (React + Vite)
│   ├── app/
│   │   ├── App.tsx               # 라우터 정의
│   │   ├── api.ts                # API 클라이언트 + Mock 모드
│   │   ├── pages/
│   │   │   ├── CreatePage.tsx    # 모임 생성 페이지
│   │   │   ├── JoinPage.tsx      # 모임 참여 페이지
│   │   │   └── ResultPage.tsx    # AI 결과 페이지
│   │   └── components/
│   │       └── MeetingResult.tsx  # AI 결과 + 히트맵 컴포넌트
│   └── styles/                   # Tailwind CSS
├── server/                       # 백엔드 (Express.js — EC2용)
│   ├── src/
│   │   ├── index.js              # 서버 엔트리포인트
│   │   ├── routes/meetings.js    # API 라우트
│   │   ├── db/pool.js            # RDS 연결 풀
│   │   ├── db/migrate.js         # DB 마이그레이션
│   │   └── lambda/invoke.js      # Lambda 호출
│   └── .env.example              # 환경변수 템플릿
├── lambda/aggregate/             # Lambda 함수 (AI 분석)
│   ├── index.mjs                 # Bedrock Claude 연동
│   └── package.json
├── scripts/deploy-s3.sh          # S3 배포 스크립트
├── INFRA.md                      # AWS 인프라 설정 가이드
└── .gitignore                    # .env, node_modules 등 제외
```

---

## 🔒 보안

- `.env` 파일은 `.gitignore`에 포함되어 GitHub에 업로드되지 않습니다
- 모든 민감 정보(DB 비밀번호, API 키 등)는 환경변수로 관리합니다
- `server/.env.example`에는 플레이스홀더만 포함되어 있습니다

---

## 🛠️ 기술 스택

- **프론트엔드**: React 18, react-router v7, Tailwind CSS 4, Motion (Framer Motion)
- **백엔드**: Express.js, MySQL (mysql2)
- **AI**: AWS Bedrock (Claude 3 Haiku)
- **인프라**: EC2, RDS, S3, Lambda
