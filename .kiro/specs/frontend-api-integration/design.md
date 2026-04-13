# Design Document: Frontend API Integration

## Overview

현재 `App.tsx`에 모놀리식으로 구현된 "번개 만남" 일정 조율 UI를 react-router v7 기반의 3개 페이지(CreatePage, JoinPage, ResultPage)로 분리하고, `api.ts`의 API 클라이언트 함수를 연동하여 모임 생성 → 공유 → 참여 → AI 결과 조회 플로우를 완성한다.

### 핵심 설계 결정

1. **BrowserRouter + 3 라우트 구조**: `/` (생성), `/m/:id` (참여), `/m/:id/result` (결과)
2. **기존 UI 코드 재활용**: App.tsx의 날짜/시간 선택 UI를 CreatePage와 JoinPage에서 공유
3. **비동기 상태 관리**: 각 페이지에서 `useState` + `useEffect` 패턴으로 API 호출 상태(loading, error, data) 관리
4. **네오 브루탈리즘 디자인 유지**: 두꺼운 보더, 그림자, 비비드 컬러 스타일 일관성 유지

## Architecture

```mermaid
graph TD
    subgraph Router["BrowserRouter"]
        R["/"] --> CreatePage
        J["/m/:id"] --> JoinPage
        RR["/m/:id/result"] --> ResultPage
        W["/*"] -->|redirect| R
    end

    subgraph API["api.ts"]
        CM[createMeeting]
        GM[getMeeting]
        JM[joinMeeting]
        GR[getMeetingResult]
    end

    subgraph Backend["Express Server"]
        POST_M["POST /api/meetings"]
        GET_M["GET /api/meetings/:id"]
        POST_J["POST /api/meetings/:id/join"]
        GET_R["GET /api/meetings/:id/result"]
    end

    CreatePage -->|creator, location, dates| CM
    CM --> POST_M
    POST_M -->|{ id }| CM

    JoinPage -->|id| GM
    GM --> GET_M
    GET_M -->|Meeting| GM

    JoinPage -->|name, selections, preferredPlace| JM
    JM --> POST_J

    ResultPage -->|id| GM
    ResultPage -->|id| GR
    GR --> GET_R
    GET_R -->|MeetingResult| GR

    CreatePage -->|navigate| J
    JoinPage -->|navigate| RR
```

### 페이지 플로우

```mermaid
sequenceDiagram
    actor Creator as 생성자
    participant CP as CreatePage
    participant API as api.ts
    participant Server as Backend

    Creator->>CP: 날짜 선택 → 시간 선택 → 이름/장소 입력
    Creator->>CP: "번개 치기" 클릭
    CP->>API: createMeeting({ creator, location, dates })
    API->>Server: POST /api/meetings
    Server-->>API: { id }
    API-->>CP: { id }
    CP->>CP: 공유 화면 표시 (ShareLink: /m/{id})

    actor Participant as 참여자
    Participant->>CP: 공유 링크 클릭
    CP->>API: getMeeting(id)
    Note over CP: JoinPage로 라우팅
    API->>Server: GET /api/meetings/:id
    Server-->>API: Meeting 데이터
    API-->>CP: Meeting

    Participant->>CP: 이름/장소/시간 입력 후 제출
    CP->>API: joinMeeting(id, { name, selections, preferredPlace })
    API->>Server: POST /api/meetings/:id/join
    Server-->>API: { success }
    CP->>CP: /m/{id}/result로 이동

    Note over CP: ResultPage
    CP->>API: getMeeting(id) + getMeetingResult(id)
    API->>Server: GET /api/meetings/:id + GET /api/meetings/:id/result
    Server-->>API: Meeting + MeetingResult
    CP->>CP: MeetingResult 컴포넌트 렌더링
```

## Components and Interfaces

### 파일 구조

```
src/
├── main.tsx                          # BrowserRouter 설정
├── app/
│   ├── api.ts                        # API 클라이언트 (기존 유지)
│   ├── App.tsx                       # 라우트 정의 (Routes 컴포넌트)
│   ├── pages/
│   │   ├── CreatePage.tsx            # 모임 생성 페이지
│   │   ├── JoinPage.tsx              # 모임 참여 페이지
│   │   └── ResultPage.tsx            # AI 결과 페이지
│   └── components/
│       └── MeetingResult.tsx         # AI 결과 컴포넌트 (기존 유지)
```

### 컴포넌트 인터페이스

#### main.tsx
```typescript
// BrowserRouter를 감싸는 엔트리포인트
import { BrowserRouter } from "react-router";
// <BrowserRouter><App /></BrowserRouter>
```

#### App.tsx (리팩토링)
```typescript
// Routes 정의만 담당
import { Routes, Route, Navigate } from "react-router";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<CreatePage />} />
      <Route path="/m/:id" element={<JoinPage />} />
      <Route path="/m/:id/result" element={<ResultPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
```

#### CreatePage
```typescript
interface CreatePageState {
  step: "date-selection" | "time-selection" | "share";
  dates: string[];
  name: string;
  location: string;
  selected: Set<string>;       // TimeSlot 선택
  isSubmitting: boolean;
  error: string | null;
  createdMeetingId: string | null;
}
```

- 기존 App.tsx의 날짜 선택 + 시간 선택 UI를 그대로 이동
- `step`에 `"share"` 단계 추가: 모임 생성 성공 후 공유 링크 표시
- "번개 치기" 클릭 시 `createMeeting` 호출 → 성공 시 `step = "share"` 전환
- 공유 화면에서 `/m/{id}` 링크 복사 기능 + "내 모임 참여하기" 링크 제공

#### JoinPage
```typescript
interface JoinPageState {
  meeting: Meeting | null;
  loading: boolean;
  error: string | null;
  name: string;
  preferredPlace: string;
  selected: Set<string>;       // TimeSlot 선택
  isSubmitting: boolean;
  submitError: string | null;
}
```

- `useParams()`로 `:id` 추출 → `getMeeting(id)` 호출
- 모임 정보(생성자, 장소, 날짜)를 읽기 전용 표시
- 시간 선택 그리드는 기존 App.tsx의 드래그 선택 UI 재활용
- 제출 시 `joinMeeting(id, { name, selections, preferredPlace })` 호출
- 성공 시 `navigate(`/m/${id}/result`)` 이동

#### ResultPage
```typescript
interface ResultPageState {
  meeting: Meeting | null;
  loading: boolean;
  error: string | null;
}
```

- `useParams()`로 `:id` 추출 → `getMeeting(id)` 호출
- 로드 성공 시 `<MeetingResult meetingId={id} meeting={meeting} />` 렌더링
- `/m/{id}` 로 돌아가는 링크 제공

## Data Models

### 기존 API 타입 (api.ts - 변경 없음)

```typescript
interface Meeting {
  id: string;
  creator: string;
  location: string;
  dates: string[];
  created_at: string;
  participants: Participant[];
}

interface Participant {
  id: number;
  name: string;
  selections: string[];       // TimeSlot[] (예: ["4/15 화|14:00"])
  preferred_place?: string;
  created_at: string;
}

interface AiRecommendation {
  recommendedTimes: string[];
  recommendedPlace: string;
  oneLiner: string;
  comment: string;
}

interface MeetingResult {
  meetingId: string;
  slotCounts: Record<string, number>;
  bestSlots: string[];
  ai: AiRecommendation;
  updatedAt: string;
}
```

### API 요청/응답 매핑

| 동작 | API 함수 | 요청 데이터 | 응답 데이터 |
|------|----------|------------|------------|
| 모임 생성 | `createMeeting` | `{ creator, location, dates }` | `{ id }` |
| 모임 조회 | `getMeeting` | URL param `id` | `Meeting` |
| 참여 제출 | `joinMeeting` | `{ name, selections, preferredPlace? }` | `void` |
| 결과 조회 | `getMeetingResult` | URL param `id` | `MeetingResult` |

### TimeSlot 형식

시간 슬롯은 `"날짜|시간"` 형태의 문자열로 표현된다:
- 형식: `"{month}/{day} {dayOfWeek}|{HH:MM}"`
- 예시: `"4/15 화|14:00"`, `"4/16 수|10:30"`
- 이 형식은 기존 App.tsx의 `cellKey` 함수와 동일하며, 백엔드에서도 이 형식을 그대로 저장한다.


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Share link format

*For any* meeting ID returned by `createMeeting`, the generated share link should match the pattern `{origin}/m/{id}` where `{id}` is the exact returned ID, and the "내 모임 참여하기" link should point to the same path.

**Validates: Requirements 2.2, 6.3**

### Property 2: createMeeting data integrity

*For any* combination of creator name, location, and dates array entered by the user, when "번개 치기" is clicked, the `createMeeting` API call should receive exactly `{ creator: name, location: location, dates: dates }` with no data transformation or loss.

**Validates: Requirements 2.1, 2.6**

### Property 3: joinMeeting data integrity

*For any* combination of participant name, selected time slots, and preferred place entered on JoinPage, when the submit button is clicked, the `joinMeeting` API call should receive exactly `{ name, selections: Array.from(selectedSlots), preferredPlace }` with the preferredPlace being an empty string or undefined when not provided.

**Validates: Requirements 4.2, 4.3, 7.4**

### Property 4: Loading state during API calls

*For any* page (CreatePage, JoinPage, ResultPage) while an API call is in progress, the submit/action button should be disabled and a loading indicator should be visible in the DOM.

**Validates: Requirements 2.4, 3.2, 4.4, 5.3**

### Property 5: Error display on API failure

*For any* API call (createMeeting, getMeeting, joinMeeting) that rejects with an error, the corresponding page should display an error message to the user and allow retry (button re-enabled or retry button visible).

**Validates: Requirements 2.5, 3.5, 4.6, 5.4**

### Property 6: URL parameter extraction and data loading

*For any* valid meeting ID in the URL, when JoinPage or ResultPage mounts, it should call `getMeeting` with that exact ID extracted from the URL parameters.

**Validates: Requirements 1.4, 1.5, 3.1, 5.1**

### Property 7: Unknown route redirect

*For any* path that does not match `/`, `/m/:id`, or `/m/:id/result`, the router should redirect to `/`.

**Validates: Requirements 1.2**

### Property 8: Submit button validation

*For any* state on JoinPage where the participant name is empty (or whitespace-only) or zero time slots are selected, the submit button should be disabled. Conversely, when name is non-empty and at least one slot is selected, the button should be enabled regardless of whether preferredPlace is filled.

**Validates: Requirements 4.7, 7.3**

### Property 9: JoinPage displays meeting info

*For any* meeting data returned by `getMeeting`, the JoinPage should render the creator name, location, candidate dates, and participant count such that all values are present in the rendered output.

**Validates: Requirements 3.3, 3.6**

### Property 10: Navigation after joinMeeting success

*For any* meeting ID, when `joinMeeting` resolves successfully, the page should navigate to `/m/{id}/result`.

**Validates: Requirements 4.5**

### Property 11: ResultPage renders MeetingResult with correct props

*For any* meeting data loaded on ResultPage, the `MeetingResult` component should receive `meetingId` equal to the URL parameter and `meeting` equal to the loaded meeting data.

**Validates: Requirements 5.2**

### Property 12: ResultPage back link

*For any* meeting ID on ResultPage, a link to `/m/{id}` (the JoinPage) should be present in the rendered output.

**Validates: Requirements 5.5**

### Property 13: Share message content

*For any* creator name and location, the share message displayed after meeting creation should contain both the creator name and the location string.

**Validates: Requirements 6.4**

## Error Handling

### API 오류 처리 전략

| 상황 | 처리 방식 |
|------|----------|
| `createMeeting` 실패 | 오류 메시지 표시, "번개 치기" 버튼 재활성화, 사용자 입력 유지 |
| `getMeeting` 404 | "모임을 찾을 수 없습니다" 메시지 + 홈으로 돌아가기 링크 |
| `getMeeting` 500 | 일반 오류 메시지 + 재시도 버튼 |
| `joinMeeting` 실패 | 오류 메시지 표시, 제출 버튼 재활성화, 사용자 입력 유지 |
| `getMeetingResult` 404 | "아직 AI 분석 중" 메시지 + 재시도 버튼 (기존 MeetingResult 컴포넌트 로직) |
| 네트워크 오류 | 각 페이지에서 catch 블록으로 처리, 일반 오류 메시지 표시 |

### 오류 상태 관리

각 페이지는 독립적인 `error` 상태를 관리한다:
- API 호출 시작 시 `error = null`로 초기화
- catch 블록에서 `error = "사용자 친화적 메시지"` 설정
- 오류 메시지는 네오 브루탈리즘 스타일의 배너로 표시
- 재시도 시 기존 입력 데이터를 유지하여 사용자가 다시 입력할 필요 없음

### 입력 유효성 검사

- CreatePage: `name`이 비어있거나 `dates`가 0개이거나 `selected`가 0개이면 제출 불가
- JoinPage: `name`이 비어있거나 `selected`가 0개이면 제출 불가
- 유효성 검사는 버튼 disabled 상태로 처리 (별도 오류 메시지 불필요)

## Testing Strategy

### 테스트 프레임워크

- **단위 테스트 / 컴포넌트 테스트**: Vitest + React Testing Library
- **Property-Based Testing**: [fast-check](https://github.com/dubzzz/fast-check) (Vitest와 통합)
- API 모킹: `vi.mock`으로 `api.ts` 모듈 모킹

### 단위 테스트 (Unit Tests)

구체적인 예시와 엣지 케이스를 검증:

1. **라우트 설정 테스트**: 3개 경로가 올바른 컴포넌트를 렌더링하는지 확인 (Req 1.1)
2. **공유 화면 UI 테스트**: 모임 생성 성공 후 공유 링크와 복사 버튼이 표시되는지 확인 (Req 6.1, 6.2)
3. **JoinPage UI 구조 테스트**: 이름 필드, 선호 장소 필드, 시간 그리드가 올바른 순서로 존재하는지 확인 (Req 4.1, 7.1, 7.2)
4. **JoinPage 날짜 고정 표시 테스트**: 로드된 날짜가 읽기 전용으로 표시되는지 확인 (Req 3.4)
5. **클립보드 복사 테스트**: 복사 버튼 클릭 시 올바른 텍스트가 클립보드에 복사되는지 확인 (Req 6.2)

### Property-Based Tests (fast-check)

각 Correctness Property를 fast-check 기반 테스트로 구현한다. 최소 100회 반복 실행.

각 테스트에는 다음 형식의 태그 주석을 포함한다:
```
// Feature: frontend-api-integration, Property {number}: {property_text}
```

| Property | 테스트 설명 | 생성기 |
|----------|-----------|--------|
| P1 | 임의의 meeting ID에 대해 share link가 `/m/{id}` 형식인지 검증 | `fc.string()` for ID |
| P2 | 임의의 creator/location/dates 조합에 대해 createMeeting 호출 데이터 검증 | `fc.record({ creator: fc.string(), location: fc.string(), dates: fc.array(fc.string()) })` |
| P3 | 임의의 name/selections/preferredPlace 조합에 대해 joinMeeting 호출 데이터 검증 | `fc.record(...)` |
| P4 | 임의의 API 지연 시나리오에서 로딩 상태 검증 | `fc.constant(...)` with delayed mock |
| P5 | 임의의 에러 메시지에 대해 오류 표시 검증 | `fc.string()` for error messages |
| P6 | 임의의 meeting ID에 대해 URL 파라미터 추출 및 getMeeting 호출 검증 | `fc.stringMatching(/^[a-zA-Z0-9_-]+$/)` |
| P7 | 임의의 경로에 대해 알 수 없는 경로가 `/`로 리다이렉트되는지 검증 | `fc.string()` for paths |
| P8 | 임의의 name(빈/비빈)과 selection count(0/양수) 조합에 대해 버튼 상태 검증 | `fc.tuple(fc.string(), fc.nat())` |
| P9 | 임의의 Meeting 데이터에 대해 JoinPage가 모든 필드를 렌더링하는지 검증 | `fc.record(...)` for Meeting |
| P10 | 임의의 meeting ID에 대해 joinMeeting 성공 후 `/m/{id}/result`로 이동하는지 검증 | `fc.string()` for ID |
| P11 | 임의의 Meeting 데이터에 대해 MeetingResult가 올바른 props를 받는지 검증 | `fc.record(...)` for Meeting |
| P12 | 임의의 meeting ID에 대해 ResultPage에 `/m/{id}` 링크가 존재하는지 검증 | `fc.string()` for ID |
| P13 | 임의의 creator/location에 대해 공유 메시지에 두 값이 포함되는지 검증 | `fc.tuple(fc.string(), fc.string())` |

### 테스트 실행

```bash
pnpm vitest --run
```
