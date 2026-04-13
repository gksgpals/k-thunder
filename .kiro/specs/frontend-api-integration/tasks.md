# Implementation Plan: Frontend API Integration

## Overview

기존 App.tsx의 모놀리식 UI를 react-router v7 기반 3개 페이지(CreatePage, JoinPage, ResultPage)로 분리하고, api.ts의 API 클라이언트를 연동하여 모임 생성 → 공유 → 참여 → AI 결과 조회 플로우를 완성한다. 기존 날짜/시간 선택 UI 코드를 최대한 재활용하며, 네오 브루탈리즘 디자인을 유지한다.

## Tasks

- [x] 1. BrowserRouter 설정 및 라우트 정의
  - [x] 1.1 main.tsx에 BrowserRouter 래핑 추가
    - `react-router`에서 `BrowserRouter`를 import하여 `<App />`을 감싼다
    - _Requirements: 1.3_
  - [x] 1.2 App.tsx를 Routes 정의로 리팩토링
    - 기존 App.tsx의 UI 코드를 제거하고 `Routes`, `Route`, `Navigate` 기반 라우트 정의만 남긴다
    - 경로: `/` → CreatePage, `/m/:id` → JoinPage, `/m/:id/result` → ResultPage, `/*` → Navigate to `/`
    - _Requirements: 1.1, 1.2_

- [x] 2. CreatePage 구현 (모임 생성 + 공유)
  - [x] 2.1 CreatePage.tsx 생성 및 기존 App.tsx UI 이동
    - `src/app/pages/CreatePage.tsx` 파일 생성
    - 기존 App.tsx의 날짜 선택, 시간 선택, 이름/장소 입력 UI를 그대로 이동
    - step 상태에 `"share"` 단계 추가
    - _Requirements: 2.1, 2.6_
  - [x] 2.2 createMeeting API 연동 및 공유 화면 구현
    - "번개 치기" 버튼 클릭 시 `createMeeting({ creator: name, location, dates })` 호출
    - 호출 중 버튼 비활성화 + 로딩 상태 표시
    - 성공 시 `step = "share"` 전환, 반환된 ID로 `/m/{id}` 형태의 공유 링크 생성
    - 공유 화면에 링크 복사 버튼, "내 모임 참여하기" 링크(`/m/{id}`), 생성자 이름/장소 정보 표시
    - 실패 시 오류 메시지 표시 및 재시도 허용
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 6.1, 6.2, 6.3, 6.4_
  - [ ]* 2.3 Write property tests for CreatePage
    - **Property 1: Share link format** — 임의의 meeting ID에 대해 공유 링크가 `{origin}/m/{id}` 형식인지 검증
    - **Validates: Requirements 2.2, 6.3**
    - **Property 2: createMeeting data integrity** — 임의의 creator/location/dates 조합에 대해 API 호출 데이터가 정확히 전달되는지 검증
    - **Validates: Requirements 2.1, 2.6**
    - **Property 13: Share message content** — 임의의 creator/location에 대해 공유 메시지에 두 값이 포함되는지 검증
    - **Validates: Requirements 6.4**

- [x] 3. Checkpoint - 모임 생성 플로우 확인
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. JoinPage 구현 (모임 참여)
  - [x] 4.1 JoinPage.tsx 생성 및 모임 데이터 로드
    - `src/app/pages/JoinPage.tsx` 파일 생성
    - `useParams()`로 `:id` 추출 → `getMeeting(id)` 호출
    - 로딩 중 스피너 표시, 실패 시 "모임을 찾을 수 없습니다" 오류 메시지 표시
    - 모임 정보(생성자 이름, 장소, 후보 날짜, 참여자 수)를 읽기 전용 표시
    - _Requirements: 1.4, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
  - [x] 4.2 시간 선택 그리드 및 참여자 입력 폼 구현
    - 이름 입력 필드, 선호 장소 입력 필드(플레이스홀더 예시, 선택사항), 시간 선택 그리드 제공
    - 시간 선택 그리드는 기존 App.tsx의 드래그 선택 UI 재활용 (후보 날짜 고정, 날짜 추가/삭제 불가)
    - 이름 비어있거나 시간 선택 0개이면 제출 버튼 비활성화
    - _Requirements: 4.1, 4.7, 7.1, 7.2, 7.3_
  - [x] 4.3 joinMeeting API 연동 및 결과 페이지 이동
    - 제출 시 `joinMeeting(id, { name, selections: Array.from(selected), preferredPlace })` 호출
    - 호출 중 제출 버튼 비활성화 + 로딩 상태 표시
    - 성공 시 `navigate(`/m/${id}/result`)` 이동
    - 실패 시 오류 메시지 표시 및 재시도 허용
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.6, 7.4_
  - [ ]* 4.4 Write property tests for JoinPage
    - **Property 3: joinMeeting data integrity** — 임의의 name/selections/preferredPlace 조합에 대해 API 호출 데이터 검증
    - **Validates: Requirements 4.2, 4.3, 7.4**
    - **Property 6: URL parameter extraction and data loading** — 임의의 meeting ID에 대해 getMeeting이 정확한 ID로 호출되는지 검증
    - **Validates: Requirements 1.4, 1.5, 3.1, 5.1**
    - **Property 8: Submit button validation** — 임의의 name/selection count 조합에 대해 버튼 활성화 상태 검증
    - **Validates: Requirements 4.7, 7.3**
    - **Property 9: JoinPage displays meeting info** — 임의의 Meeting 데이터에 대해 creator, location, dates, participant count가 렌더링되는지 검증
    - **Validates: Requirements 3.3, 3.6**
    - **Property 10: Navigation after joinMeeting success** — 임의의 meeting ID에 대해 성공 후 `/m/{id}/result`로 이동하는지 검증
    - **Validates: Requirements 4.5**

- [x] 5. Checkpoint - 모임 참여 플로우 확인
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. ResultPage 구현 (AI 결과)
  - [x] 6.1 ResultPage.tsx 생성 및 MeetingResult 연동
    - `src/app/pages/ResultPage.tsx` 파일 생성
    - `useParams()`로 `:id` 추출 → `getMeeting(id)` 호출
    - 로딩 중 로딩 상태 표시, 실패 시 오류 메시지 표시
    - 성공 시 `<MeetingResult meetingId={id} meeting={meeting} />` 렌더링
    - `/m/{id}` (JoinPage)로 돌아가는 링크 제공
    - _Requirements: 1.5, 5.1, 5.2, 5.3, 5.4, 5.5_
  - [ ]* 6.2 Write property tests for ResultPage
    - **Property 11: ResultPage renders MeetingResult with correct props** — 임의의 Meeting 데이터에 대해 MeetingResult가 올바른 props를 받는지 검증
    - **Validates: Requirements 5.2**
    - **Property 12: ResultPage back link** — 임의의 meeting ID에 대해 `/m/{id}` 링크가 존재하는지 검증
    - **Validates: Requirements 5.5**

- [x] 7. 공통 Property 테스트
  - [ ]* 7.1 Write property tests for loading and error states
    - **Property 4: Loading state during API calls** — API 호출 진행 중 버튼 비활성화 및 로딩 인디케이터 표시 검증
    - **Validates: Requirements 2.4, 3.2, 4.4, 5.3**
    - **Property 5: Error display on API failure** — API 실패 시 오류 메시지 표시 및 재시도 가능 검증
    - **Validates: Requirements 2.5, 3.5, 4.6, 5.4**
  - [ ]* 7.2 Write property test for unknown route redirect
    - **Property 7: Unknown route redirect** — 정의되지 않은 경로가 `/`로 리다이렉트되는지 검증
    - **Validates: Requirements 1.2**

- [x] 8. Final checkpoint - 전체 통합 확인
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- 기존 App.tsx의 날짜/시간 선택 UI 코드를 CreatePage와 JoinPage에서 재활용
- JoinPage의 시간 그리드는 날짜 추가/삭제 기능을 제거하고 읽기 전용 날짜 헤더로 변경
- 네오 브루탈리즘 디자인(두꺼운 보더, 그림자, 비비드 컬러)을 모든 페이지에서 일관되게 유지
- Property tests는 fast-check + Vitest + React Testing Library로 구현
- API 모킹은 `vi.mock`으로 `api.ts` 모듈을 모킹하여 처리
