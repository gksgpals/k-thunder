# Requirements Document

## Introduction

"번개 만남" 일정 조율 웹앱의 프론트엔드를 백엔드 Express API에 연동하는 기능이다. 현재 App.tsx에 모놀리식으로 구현된 UI를 react-router 기반 페이지로 분리하고, 각 페이지에서 api.ts의 API 클라이언트 함수를 호출하여 모임 생성, 참여, AI 결과 조회 플로우를 완성한다.

## Glossary

- **App**: 번개 만남 웹 애플리케이션의 프론트엔드 React SPA
- **Router**: react-router v7 기반 클라이언트 사이드 라우팅 시스템
- **CreatePage**: 모임 생성 페이지 (`/` 경로), 날짜 선택 → 시간 선택 → 번개 치기 플로우를 담당
- **JoinPage**: 모임 참여 페이지 (`/m/:id` 경로), 기존 모임에 참여자가 응답을 제출하는 페이지
- **ResultPage**: AI 결과 페이지 (`/m/:id/result` 경로), 히트맵과 AI 추천을 표시하는 페이지
- **API_Client**: src/app/api.ts에 정의된 createMeeting, getMeeting, joinMeeting, getMeetingResult 함수 집합
- **Meeting**: 모임 데이터 객체 (id, creator, location, dates, participants 포함)
- **Participant**: 모임 참여자 데이터 (name, selections, preferred_place 포함)
- **ShareLink**: 모임 참여를 위한 공유 URL (`/m/:id` 형태)
- **TimeSlot**: 날짜와 시간의 조합 (`"4/15 화|14:00"` 형태)

## Requirements

### Requirement 1: 라우터 기반 페이지 분리

**User Story:** As a 사용자, I want 각 기능별로 독립된 URL을 가진 페이지에 접근하고 싶다, so that 모임 생성, 참여, 결과 확인을 각각의 고유 URL로 공유하고 북마크할 수 있다.

#### Acceptance Criteria

1. THE Router SHALL 세 개의 경로를 정의한다: `/` (CreatePage), `/m/:id` (JoinPage), `/m/:id/result` (ResultPage)
2. WHEN 사용자가 정의되지 않은 경로에 접근하면, THE Router SHALL `/` 경로로 리다이렉트한다
3. THE App SHALL BrowserRouter를 사용하여 클라이언트 사이드 라우팅을 제공한다
4. WHEN 사용자가 `/m/:id` 경로에 접근하면, THE JoinPage SHALL URL 파라미터에서 모임 ID를 추출하여 해당 모임 데이터를 로드한다
5. WHEN 사용자가 `/m/:id/result` 경로에 접근하면, THE ResultPage SHALL URL 파라미터에서 모임 ID를 추출하여 AI 결과 데이터를 로드한다

### Requirement 2: 모임 생성 및 공유 링크 생성

**User Story:** As a 모임 생성자, I want 날짜와 시간을 선택한 후 "번개 치기" 버튼을 눌러 모임을 생성하고 공유 링크를 받고 싶다, so that 친구들에게 링크를 보내 참여를 요청할 수 있다.

#### Acceptance Criteria

1. WHEN 생성자가 이름, 날짜, 시간 선택을 완료하고 "번개 치기" 버튼을 클릭하면, THE CreatePage SHALL API_Client의 createMeeting 함수를 호출하여 모임을 생성한다
2. WHEN createMeeting API 호출이 성공하면, THE CreatePage SHALL 반환된 모임 ID를 사용하여 `/m/{id}` 형태의 ShareLink를 생성한다
3. WHEN 모임 생성이 성공하면, THE CreatePage SHALL 생성된 ShareLink를 사용자에게 표시하고 클립보드 복사 기능을 제공한다
4. WHILE createMeeting API 호출이 진행 중이면, THE CreatePage SHALL "번개 치기" 버튼을 비활성화하고 로딩 상태를 표시한다
5. IF createMeeting API 호출이 실패하면, THEN THE CreatePage SHALL 사용자에게 오류 메시지를 표시하고 재시도를 허용한다
6. THE CreatePage SHALL createMeeting 호출 시 creator(이름), location(장소), dates(선택된 날짜 배열)를 전송한다

### Requirement 3: 모임 참여 페이지 데이터 로드

**User Story:** As a 참여자, I want 공유 링크를 통해 모임 정보를 확인하고 싶다, so that 어떤 모임인지 파악한 후 가능한 시간을 선택할 수 있다.

#### Acceptance Criteria

1. WHEN JoinPage가 마운트되면, THE JoinPage SHALL API_Client의 getMeeting 함수를 호출하여 모임 정보를 로드한다
2. WHILE getMeeting API 호출이 진행 중이면, THE JoinPage SHALL 로딩 스피너를 표시한다
3. WHEN 모임 정보 로드가 성공하면, THE JoinPage SHALL 모임 생성자 이름, 장소, 후보 날짜를 읽기 전용으로 표시한다
4. WHEN 모임 정보 로드가 성공하면, THE JoinPage SHALL 후보 날짜를 고정 표시하고 시간 선택 그리드만 인터랙티브하게 제공한다
5. IF getMeeting API 호출이 실패하면, THEN THE JoinPage SHALL "모임을 찾을 수 없습니다" 오류 메시지를 표시한다
6. WHEN 모임 정보 로드가 성공하면, THE JoinPage SHALL 기존 참여자 수를 표시한다

### Requirement 4: 참여자 응답 제출

**User Story:** As a 참여자, I want 이름, 선호 장소, 가능한 시간을 입력하고 제출하고 싶다, so that 내 응답이 모임 일정 조율에 반영된다.

#### Acceptance Criteria

1. THE JoinPage SHALL 참여자 이름 입력 필드, 선호 장소 입력 필드, 시간 선택 그리드를 제공한다
2. WHEN 참여자가 이름과 시간 선택을 완료하고 제출 버튼을 클릭하면, THE JoinPage SHALL API_Client의 joinMeeting 함수를 호출한다
3. THE JoinPage SHALL joinMeeting 호출 시 name(이름), selections(선택된 TimeSlot 배열), preferredPlace(선호 장소)를 전송한다
4. WHILE joinMeeting API 호출이 진행 중이면, THE JoinPage SHALL 제출 버튼을 비활성화하고 로딩 상태를 표시한다
5. WHEN joinMeeting API 호출이 성공하면, THE JoinPage SHALL `/m/{id}/result` 경로로 이동한다
6. IF joinMeeting API 호출이 실패하면, THEN THE JoinPage SHALL 사용자에게 오류 메시지를 표시하고 재시도를 허용한다
7. THE JoinPage SHALL 참여자 이름이 비어있거나 시간 선택이 0개인 경우 제출 버튼을 비활성화한다

### Requirement 5: AI 결과 페이지

**User Story:** As a 사용자, I want 모임의 AI 분석 결과를 확인하고 싶다, so that 최적의 만남 시간과 장소를 알 수 있다.

#### Acceptance Criteria

1. WHEN ResultPage가 마운트되면, THE ResultPage SHALL URL 파라미터에서 모임 ID를 추출하고 getMeeting 함수로 모임 정보를 로드한다
2. THE ResultPage SHALL MeetingResult 컴포넌트에 meetingId와 meeting 데이터를 전달하여 렌더링한다
3. WHILE 모임 정보 로드가 진행 중이면, THE ResultPage SHALL 로딩 상태를 표시한다
4. IF 모임 정보 로드가 실패하면, THEN THE ResultPage SHALL 오류 메시지를 표시한다
5. THE ResultPage SHALL 모임 참여 페이지(`/m/{id}`)로 돌아가는 링크를 제공한다

### Requirement 6: 모임 생성 후 공유 화면

**User Story:** As a 모임 생성자, I want 모임 생성 직후 공유 링크를 쉽게 복사하고 싶다, so that 빠르게 친구들에게 전달할 수 있다.

#### Acceptance Criteria

1. WHEN 모임 생성이 성공하면, THE CreatePage SHALL 공유 링크와 복사 버튼이 포함된 공유 화면을 표시한다
2. WHEN 사용자가 복사 버튼을 클릭하면, THE CreatePage SHALL ShareLink를 클립보드에 복사하고 복사 완료 피드백을 표시한다
3. THE CreatePage SHALL 공유 화면에서 "내 모임 참여하기" 링크를 제공하여 JoinPage로 이동할 수 있게 한다
4. THE CreatePage SHALL 공유 메시지에 모임 생성자 이름과 장소 정보를 포함한다

### Requirement 7: 선호 장소 입력 필드

**User Story:** As a 참여자, I want 선호하는 만남 장소를 입력하고 싶다, so that AI가 장소 추천 시 내 선호를 반영할 수 있다.

#### Acceptance Criteria

1. THE JoinPage SHALL 참여자 이름 입력 필드 아래에 선호 장소 입력 필드를 제공한다
2. THE JoinPage SHALL 선호 장소 입력 필드에 플레이스홀더 텍스트로 예시 장소를 표시한다
3. THE JoinPage SHALL 선호 장소 입력을 선택 사항으로 처리하여 빈 값도 허용한다
4. WHEN 참여자가 응답을 제출하면, THE JoinPage SHALL 선호 장소 값을 joinMeeting API의 preferredPlace 파라미터로 전달한다
