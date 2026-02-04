# E2E 전체 흐름 테스트 - 발견된 문제점

## 테스트 개요
- 날짜: 2026-01-21
- 테스트 범위: Teacher 시험 생성 → Student 시험 응시 → Student 결과 확인 → Teacher 결과 확인
- 계정: testteacher2, teststudent_pr132
- 테스트 도구: Playwright (자동화), Chrome Extension (수동 확인)

---

## 요약

### 발견된 문제 (총 7개)
- 🔴 Critical: 3개 (Issue #1, #2, #3)
- 🟡 High: 4개 (Issue #4, #6, #7, ~~#5~~ 해결됨)

### 주요 발견 사항
1. **PR #132 Backend API 미구현**: Frontend 구현은 완료되었으나 Backend API가 없어 결과 조회 기능 사용 불가
2. **결과 조회 버튼 미구현**: ExaminationDetailPage에 "결과 조회" 버튼이 표시되지 않아 사용자가 기능에 접근 불가
3. **시간 Validation 부재**: 논리적으로 불가능한 시험 (종료 시간 < 시작 시간) 생성 가능
4. **NaN 문제 해결 확인**: 이전에 보고된 NaN 표시 문제가 현재 버전에서 수정된 것으로 확인됨

---

## Issue 1: PR #132 Backend API 미구현

**우선순위**: 🔴 Critical

### 문제 설명
Teacher 결과 조회 페이지(`/examinations/{id}/results`)에서 필요한 Backend API가 구현되지 않아 404 오류 발생

### 재현 방법
1. Teacher 계정으로 로그인
2. `/examinations/41/results` URL로 직접 접근
3. 콘솔에서 404 오류 확인

### 오류 내용
```
Failed to load resource: the server responded with a status of 404 (Not Found)
```

### 영향받는 API
- `GET /api/scores/exam/{exam_id}` - 시험 점수 목록 조회
- `GET /api/scores/exam/{exam_id}/statistics` - 시험 통계 조회

### 예상 동작
- 시험에 등록된 학생들의 점수 목록 반환
- 평균, 최고점, 합격률 등 통계 데이터 반환

### 관련 파일
- `frontend/src/api/score.ts`
- `frontend/src/features/examinations/ExamResultsListPage.tsx`

---

## Issue 2: ExaminationDetailPage에 결과 조회 버튼 미구현

**우선순위**: 🔴 Critical

### 문제 설명
시험 상세 페이지에서 결과 조회 페이지로 이동할 수 있는 버튼이 표시되지 않음

### 재현 방법
1. Teacher 계정으로 로그인
2. 시험 관리 → 시험 상세 페이지 접근
3. "결과 조회" 버튼 확인 → 표시되지 않음

### 현재 상태 (2026-01-21 Chrome Extension 테스트 결과)
시험 상세 페이지(/examinations/43)에 다음 버튼만 표시됨:
- "목록" 버튼
- "수정" 버튼
- "게시하기" 버튼
- "학생 추가" 버튼

**"결과 조회" 버튼 미표시 확인됨**

### 예상 동작
- 시험 생성자에게만 "결과 조회" 버튼 표시
- 클릭 시 `/examinations/{id}/results` 페이지로 이동

### 관련 파일
- `frontend/src/features/examinations/ExaminationDetailPage.tsx`

---

## Issue 3: 시험 생성 실패 (Backend 400 오류)

**우선순위**: 🔴 Critical

### 문제 설명
새로운 시험 생성 시 Backend에서 400 Bad Request 응답 반환

### 재현 방법
1. Teacher 계정으로 로그인
2. 시험 관리 → 시험 생성 클릭
3. 시험명, 시험지, 시작/종료 시간 입력
4. "시험 생성" 버튼 클릭 → "시험 생성에 실패했습니다" 메시지 표시

### 오류 내용
```
Failed to load resource: the server responded with a status of 400 (Bad Request)
```

### 입력 데이터
- 시험명: "E2E 전체 흐름 테스트 시험"
- 시험지 ID: 44 (E2E 전체 흐름 시험지)
- 시작 시간: 2026-01-21T13:56
- 종료 시간: 2026-01-21T14:56

### 영향
신규 시험 생성 불가

---

## Issue 4: 학생 등록 실패

**우선순위**: 🟡 High

### 문제 설명
시험에 학생을 추가하려고 할 때 "학생 등록에 실패했습니다" 메시지 표시

### 재현 방법
1. Teacher 계정으로 로그인
2. 시험 상세 페이지 접근
3. "학생 추가" 버튼 클릭
4. 학생 선택 후 "등록" 버튼 클릭 → 실패 메시지 표시

### 영향
신규 학생 등록 불가 (기존에 등록된 학생은 정상 동작)

---

## Issue 5: NaN 오류 메시지 노출

**우선순위**: ~~🟡 High~~ ✅ 해결됨 (2026-01-21 Chrome Extension 테스트 결과)

### 문제 설명
문제 생성 페이지에서 과목 선택 전 "NaN" 텍스트가 사용자에게 그대로 노출됨

### 재현 방법
1. Teacher 계정으로 로그인
2. 문제 관리 → 문제 생성 클릭
3. 과목 선택 전 배점 필드 확인

### 현재 동작 (2026-01-21 확인)
배점 필드를 비워도 빈 칸으로 표시되며, NaN이 노출되지 않음

### 테스트 결과
- Chrome Extension을 통해 문제 생성 페이지 테스트
- 배점 필드 값 삭제 후 확인: NaN 미노출
- JavaScript로 페이지 내 "NaN" 텍스트 검색: 발견되지 않음
- 현재 버전에서는 이 문제가 수정된 것으로 확인됨

---

## Issue 6: 에러 메시지 상세 정보 부족

**우선순위**: 🟡 High

### 문제 설명
시험 생성 실패 시 단순히 "시험 생성에 실패했습니다"만 표시되어 사용자가 원인을 파악할 수 없음

### 재현 방법
1. Teacher 계정으로 로그인
2. 시험 생성 시도
3. 실패 시 토스트 메시지 확인

### 현재 메시지
```
시험 생성에 실패했습니다.
```

### 2026-01-21 추가 테스트 결과
1. **클라이언트 측 Validation 동작 확인**:
   - 필수 필드 누락 시: "시험명을 입력해주세요", "시험지를 선택해주세요" 메시지 표시
   - 클라이언트 측 validation은 정상 동작함

2. **시간 Validation 문제 발견**:
   - 시작 시간을 종료 시간보다 나중으로 설정해도 제출 가능 (validation 없음)
   - 예: 시작 2026-01-21T18:00, 종료 2026-01-21T17:00 → 시험 생성 성공
   - 이는 논리적 오류를 발생시킬 수 있음

### 개선 방향
- Backend 응답의 에러 메시지를 사용자에게 표시
- 클라이언트 측 시간 validation 추가 (종료 시간 > 시작 시간 검증)
- 예: "시작 시간은 현재 시간 이후여야 합니다", "종료 시간은 시작 시간 이후여야 합니다" 등
- 개발자 콘솔에는 상세 에러 로그 출력

### 영향
사용자가 문제 원인을 파악하고 수정할 수 없음, 논리적으로 잘못된 시험 생성 가능

---

## Issue 7: 시험 시간 Validation 미구현

**우선순위**: 🟡 High

### 문제 설명
시험 생성 시 시작 시간과 종료 시간의 논리적 validation이 수행되지 않음

### 재현 방법
1. Teacher 계정으로 로그인
2. 시험 관리 → 시험 생성 클릭
3. 시작 시간: 2026-01-21T18:00 입력
4. 종료 시간: 2026-01-21T17:00 입력 (시작 시간보다 이른 시간)
5. "시험 생성" 버튼 클릭

### 현재 동작 (2026-01-21 확인)
- 종료 시간이 시작 시간보다 빨라도 시험 생성 성공
- Validation 에러 없이 제출됨

### 예상 동작
- 종료 시간이 시작 시간보다 빠른 경우 클라이언트 측 validation 에러 표시
- 에러 메시지: "종료 시간은 시작 시간 이후여야 합니다"

### 영향
- 논리적으로 불가능한 시험 생성 가능
- 학생이 시험 응시 불가능한 시험 생성 가능
- 데이터 무결성 문제

### 관련 파일
- `frontend/src/features/examinations/ExaminationForm.tsx`

---

## 테스트 통과 기능

### ✅ Phase 1: Teacher 시험 생성
- Teacher 로그인
- 문제 생성 (객관식)
- 시험지 생성
- 시험 게시

### ✅ Phase 2-3: Student 시험 응시 및 결과
- Student 로그인
- 시험 응시
- 답안 제출
- Student 결과 확인 (100점, 합격)

### ✅ PR #132 Frontend 구현
- ExamResultsListPage.tsx: Select 컴포넌트 사용
- Skeleton 로딩 UI
- 정렬 기능 UI (점수, 이름, 제출시간)
- 필터 기능 UI (전체/제출/미제출)

---

## 권장 조치사항

### Backend (우선순위: Critical)
1. **Score API 엔드포인트 구현** (Issue #1)
   - `GET /api/scores/exam/{exam_id}` - 시험 점수 목록 조회
   - `GET /api/scores/exam/{exam_id}/statistics` - 시험 통계 조회
   - PR #132 Frontend 구현이 완료되었으나 Backend API가 없어 사용 불가

2. **시험 생성 API 400 오류 원인 파악 및 수정** (Issue #3)
   - 유효한 입력 데이터에도 400 Bad Request 응답
   - 상세 에러 로그 확인 필요

3. **학생 등록 API 오류 수정** (Issue #4)
   - 신규 학생 등록 시 실패
   - 기존 등록 학생은 정상 동작

4. **API 에러 응답에 상세한 메시지 포함** (Issue #6)
   - 현재: 단순 실패 메시지만 반환
   - 개선: 구체적인 실패 원인 포함 (예: "시작 시간은 현재 시간 이후여야 합니다")

### Frontend (우선순위: High)
1. **ExaminationDetailPage에 "결과 조회" 버튼 추가** (Issue #2) 🔴 Critical
   - 파일: `frontend/src/features/examinations/ExaminationDetailPage.tsx`
   - 시험 생성자에게만 버튼 표시
   - 클릭 시 `/examinations/{id}/results` 페이지로 이동

2. ~~**NaN 표시 문제 수정**~~ ✅ 해결됨 (Issue #5)
   - 현재 버전에서 수정 완료 확인

3. **시험 시간 Validation 추가** (Issue #7) 🟡 High
   - 파일: `frontend/src/features/examinations/ExaminationForm.tsx`
   - 종료 시간 > 시작 시간 검증
   - 에러 메시지: "종료 시간은 시작 시간 이후여야 합니다"

4. **에러 핸들링 개선** (Issue #6)
   - Backend 에러 메시지를 사용자에게 표시
   - Toast 메시지에 구체적인 실패 원인 표시
   - 개발자 콘솔에 상세 에러 로그 출력
