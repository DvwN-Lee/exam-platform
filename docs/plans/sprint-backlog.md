# Sprint Backlog: AI Exam Agent

> **Source**: [BRD v1.0](./2026-03-02-ai-exam-agent-brd.md)
> **Sprint Duration**: 1주 (Day 1-7)
> **Sprint Goal**: Silver Tier — F1(AI 생성) + F2(Self-critique) + 기본 UI
> **Worktree 전략**: Frontend/Backend 완전 분리 (2개 worktree 비동기 병렬)

---

## 1. Sprint Context

### 1.1 프로젝트 현황

기존 exam-platform은 Django 5.2 + React 19 풀스택 시험 플랫폼이다.
- Backend: 5개 Django 앱 (user, testquestion, testpaper, examination, operation)
- Frontend: 10개 feature 디렉토리 (questions, testpapers, examinations, exams 등)
- 테스트: 957개 (Backend 317 + Frontend 142 + E2E + Infra)
- 인프라: GCP K3s + Terraform + ArgoCD + Prometheus/Grafana/Loki

AI 레이어는 현재 **0%**. 이번 Sprint에서 AI 출제 파이프라인을 추가한다.

### 1.2 Scope Ladder

| Tier | 범위 | 판정 기준 |
|------|------|-----------|
| **Bronze** (최소) | F1 동작 + 기존 테스트 100% | AI가 문제를 생성하고 DB에 저장 |
| **Silver** (목표) | F1 + F2 + 기본 UI | Multi-Agent Self-critique 동작 + 교사 리뷰 UI |
| **Gold** (이상적) | F1 + F2 + F3 + 대시보드 + 50개 테스트 | 피드백 루프 + 품질 개선 추이 시각화 |

> F2(Self-critique)가 포트폴리오 핵심 차별점. 시간 부족 시 F3보다 F2에 집중.

### 1.3 기술 제약 (구현 시 필수 준수)

1. **Celery worker 필수**: Django 뷰는 sync 유지, LangGraph는 Celery에서 실행
2. **AI import lazy 처리**: apps/ai/apps.py의 ready()에서 heavy import 금지
3. **pgvector >= 0.8.2**: CVE-2026-3172 수정 버전 핀 필수
4. **기존 테스트 957개 무중단**: 기존 모델/API 변경 0건
5. **Gemini API Free Tier 제약** (v1.1 추가):
   - 10 RPM / 250K TPM / 500 RPD — Rate Limiter 필수
   - 배치 프롬프트 필수 (개별 문제 호출 금지)
   - 전 Agent 동일 모델(gemini-2.5-flash) — Critic에 경량 모델 사용 금지
   - Context Caching: Bronze/Silver optional, Gold 적용

---

## 2. Epic & User Story 목록

### Epic 1: AI 문제 자동 생성 (F1)

BRD Section 4 F1 참조. 교사가 과목/범위/난이도를 지정하면 AI가 문제를 자동 생성.

| ID | User Story | 구현 위치 | 우선순위 | Story Point |
|----|-----------|-----------|----------|-------------|
| US-1.1a | 교사로서 과목과 챕터 범위를 선택하여 문제 생성 요청을 제출할 수 있다 | Backend + Frontend | P0 | 3 |
| US-1.1b | 교사로서 요청 제출 후 RAG가 교재에서 관련 컨텍스트를 자동 수집한 결과를 확인할 수 있다 | Backend + Frontend | P0 | 5 |
| US-1.1c | 교사로서 수집된 컨텍스트 기반으로 지정한 수(5-20개)의 문제가 생성된 결과를 확인할 수 있다 | Backend + Frontend | P0 | 5 |
| US-1.2 | 교사로서 생성할 문제의 유형(객관식/주관식/빈칸채우기) 비율을 지정할 수 있다 | Backend + Frontend | P1 | 2 |
| US-1.3 | 교사로서 난이도(쉬움/보통/어려움) 분포를 지정할 수 있다 | Backend + Frontend | P1 | 2 |
| US-1.4 | 교사로서 교재 PDF를 업로드하면 벡터화 진행 상태를 확인할 수 있다 | Backend + Frontend | P0 | 5 |
| US-1.5 | 교사로서 생성된 문제가 교재의 어느 부분을 참조했는지 출처를 확인할 수 있다 | Frontend | P1 | 2 |

**F1 Total: 24 SP**

### Epic 2: Multi-Agent 품질 보증 — Self-critique (F2)

BRD Section 4 F2 참조. Critic Agent가 생성된 문제를 자동 검수.

| ID | User Story | 구현 위치 | 우선순위 | Story Point |
|----|-----------|-----------|----------|-------------|
| US-2.1 | 교사로서 품질 검사를 통과한 문제만 검토 목록에서 볼 수 있다 | Backend + Frontend | P0 | 5 |
| US-2.2 | 교사로서 AI가 검수한 품질 점수와 상세 평가를 확인할 수 있다 | Frontend | P1 | 3 |
| US-2.3 | 교사로서 품질 기준을 조정할 수 있다 | Backend + Frontend | P2 | 3 |

**F2 Total: 11 SP**

### Epic 3: 교사 피드백 학습 루프 (F3)

BRD Section 4 F3 참조. 교사 승인/거부/수정 → 향후 생성 품질 반영.

| ID | User Story | 구현 위치 | 우선순위 | Story Point |
|----|-----------|-----------|----------|-------------|
| US-3.1 | 교사로서 AI 생성 문제를 한 줄씩 검토하며 승인/거부/수정할 수 있다 | Backend + Frontend | P1 | 5 |
| US-3.2 | 교사로서 거부 시 사유를 선택하거나 직접 입력할 수 있다 | Backend + Frontend | P1 | 2 |
| US-3.3 | 교사로서 수정 후 승인하면 원본과 수정본이 모두 저장된다 | Backend | P1 | 3 |
| US-3.4 | 교사로서 AI 생성 품질의 개선 추이를 대시보드에서 확인할 수 있다 | Frontend | P2 | 5 |
| US-3.5 | 교사로서 이전에 거부/수정한 유형의 문제가 다음 생성 시 피드백 기반 프롬프트에 반영된 것을 확인할 수 있다 | Backend | P2 | 5 |

**F3 Total: 20 SP**

### Infrastructure Stories (Sprint 전제 조건)

| ID | Story | 구현 위치 | 우선순위 | Story Point |
|----|-------|-----------|----------|-------------|
| INF-1 | apps/ai/ Django 앱 스캐폴딩 + INSTALLED_APPS 등록 | Backend | P0 | 1 |
| INF-2 | pgvector extension 설치 + Django migration | Backend | P0 | 2 |
| INF-3 | Celery + Redis 설정 (docker-compose 포함) | Backend | P0 | 3 |
| INF-4 | LLM Provider 어댑터 (Ollama ↔ Gemini 전환) + Rate Limiter + 배치 프롬프트 | Backend | P0 | 5 |
| INF-5 | pyproject.toml 의존성 추가 (langgraph, pgvector, pdfplumber, celery 등) | Backend | P0 | 1 |
| INF-6 | AI 테스트 fixture (conftest.py, LLM mock, pgvector 테스트 DB) | Backend | P0 | 2 |
| INF-7 | Prometheus 메트릭 (14개) + `/metrics` 엔드포인트 + Grafana 대시보드 | Backend | P0 (Bronze) | 3 |
| INF-8 | LangFuse CallbackHandler 통합 (graceful degradation) | Backend | P1 (Silver) | 2 |

**Infra Total: 19 SP** (INF-4 확장 + INF-7/8 Observability 추가)

---

## 3. Worktree별 Task 분배

### Worktree A: `feature/ai-backend` (examonline/ 전용)

담당 범위: 모든 Backend 구현 (F1+F2+F3 Backend + Infrastructure)

| Day | Task | 관련 Story | AC |
|-----|------|-----------|-----|
| 1 | apps/ai/ 스캐폴딩 + 모델 정의 + migration | INF-1, INF-2, INF-5 | `python manage.py migrate` 성공 |
| 1 | Celery + Redis 설정 | INF-3 | Celery worker가 task를 수신/실행 |
| 1 | LLM Provider 어댑터 구현 (Ollama ↔ Gemini) | INF-4 | `LLM_PROVIDER=ollama\|gemini` 환경변수 전환 확인. `GEMINI_API_KEY`, `GEMINI_MODEL`, `OLLAMA_BASE_URL` 환경변수 지원 |
| 1 | Rate Limiter + 배치 프롬프트 유틸리티 | INF-4 | 10 RPM 한도 존중하는 요청 큐 + exponential backoff. 배치 프롬프트 헬퍼 (N개 문제 1회 호출) |
| 2 | 교재 업로드 API + PDF 파싱 + 청킹 | US-1.4 | PDF 업로드 → 청크 생성 → pgvector 저장 |
| 2 | RAG 검색 서비스 구현 | US-1.1b | 쿼리 → 관련 청크 top-k 반환 |
| 3 | LangGraph 파이프라인 (Generator 노드) | US-1.1c | 컨텍스트 → 문제 JSON 생성 |
| 3 | 문제 생성 API (`POST /api/v1/ai/generate/`) | US-1.1a | 비동기 생성 요청 → generation_id 반환 |
| 3 | 생성 상태 조회 API (`GET /api/v1/ai/generate/{id}/`) | US-1.1c | polling으로 생성 결과 확인 |
| 4 | Critic Agent 노드 구현 | US-2.1 | 4개 기준 독립 평가, 점수 JSON 반환 |
| 4 | Quality Gate + Refiner 루프 | US-2.1 | Score < 14 → Refiner → 재평가 (최대 3회) |
| 5 | 교사 피드백 API (`POST /api/v1/ai/feedback/`) | US-3.1, US-3.2, US-3.3 | approve/reject/edit 액션 처리 |
| 5 | 피드백 → 프롬프트 반영 로직 | US-3.5 | few-shot 예시 삽입 확인 |
| 5 | 피드백 통계 API (`GET /api/v1/ai/feedback/stats/`) | US-3.4 | 승인율/거부율/추이 반환 |
| 6 | Prometheus 메트릭 14개 + `/metrics` 엔드포인트 | INF-7 | prometheus_client 설치, 메트릭 SSOT 파일, Django endpoint 노출 |
| 6 | Grafana 대시보드 JSON (llm-overview 기반) | INF-7 | LLM Overview + Gemini RPM/RPD + Quality Gate 패널 |
| 6 | LangFuse CallbackHandler 통합 | INF-8 | 3단계 graceful degradation, LangGraph config 주입 |
| 6 | AI 테스트 fixture + Unit Test 작성 | INF-6 | pytest apps/ai/ 통과 |
| 7 | 기존 테스트 전체 실행 확인 | — | 957개 전체 통과 |

### Worktree B: `feature/ai-frontend` (frontend/ 전용)

담당 범위: 모든 Frontend 구현 (F1+F2+F3 UI)

| Day | Task | 관련 Story | AC |
|-----|------|-----------|-----|
| 1 | AI 타입 정의 (`types/ai.ts`) | — | API Contract 기반 TypeScript 타입 |
| 1 | AI API 클라이언트 (`api/ai.ts`) | — | MSW mock 기반 독립 동작 |
| 1 | AI 라우트 등록 + 사이드바 메뉴 추가 | — | `/ai/generate`, `/ai/review` 라우트 |
| 2 | 교재 업로드 UI | US-1.4 | PDF 드래그앤드롭 + 업로드 진행률 |
| 2 | 교재 목록/관리 UI | US-1.4 | 업로드된 교재 목록 표시 |
| 3 | 문제 생성 요청 폼 | US-1.1a, US-1.2, US-1.3 | 과목/범위/유형비율/난이도 설정 UI |
| 3 | 생성 진행 상태 UI (polling) | US-1.1c | 생성 중 → 검토 중 → 완료 상태 표시 |
| 4 | 생성 결과 목록 UI | US-1.1c, US-1.5 | 문제 목록 + 교재 출처 표시 |
| 4 | 품질 점수 표시 UI | US-2.2 | 4개 기준 점수 + 총점 + pass/fail 뱃지 |
| 5 | 교사 리뷰 UI (승인/거부/수정) | US-3.1, US-3.2 | 문제별 액션 버튼 + 거부 사유 모달 |
| 5 | 문제 수정 에디터 | US-3.1 | 인라인 수정 + 저장 |
| 6 | 피드백 대시보드 (승인율 추이 차트) | US-3.4 | Recharts 기반 추이 차트 |
| 6 | MSW mock → 실제 API 전환 준비 | — | 환경변수로 mock/real 전환 |
| 7 | Vitest 테스트 작성 | — | 주요 컴포넌트 테스트 통과 |

---

## 4. API Contract 요약

PO가 Frontend/Backend 간 인터페이스를 확인할 때 참조. 상세는 BRD Section 5.3.

| Endpoint | Method | 용도 |
|----------|--------|------|
| `/api/v1/ai/materials/upload/` | POST | 교재 PDF 업로드 |
| `/api/v1/ai/materials/` | GET | 교재 목록 조회 |
| `/api/v1/ai/materials/{id}/` | GET | 교재 상세 조회 |
| `/api/v1/ai/materials/{id}/` | DELETE | 교재 삭제 |
| `/api/v1/ai/generate/` | POST | 문제 생성 요청 (비동기) |
| `/api/v1/ai/generate/{id}/` | GET | 생성 상태/결과 조회 (polling) |
| `/api/v1/ai/feedback/` | POST | 교사 피드백 (approve/reject/edit) |
| `/api/v1/ai/feedback/stats/` | GET | 피드백 통계 + 승인율 추이 |

---

## 5. Data Model 요약

PO가 데이터 흐름을 이해할 때 참조. 상세는 BRD Section 6.

```
신규 모델 (apps/ai/):
  MaterialInfo        → 교재 파일 메타데이터
  MaterialChunk       → 교재 청크 + 벡터 임베딩 (pgvector)
  GenerationRequest   → AI 생성 요청 (비동기 상태 관리)
  GeneratedQuestion   → AI 생성 문제 (임시, 교사 검토 전)
  TeacherFeedback     → 교사 피드백 (approve/reject/edit + 사유)

데이터 흐름:
  교재 PDF → MaterialInfo → MaterialChunk (벡터화)
  생성 요청 → GenerationRequest → GeneratedQuestion (AI 생성)
  교사 검토 → TeacherFeedback → TestQuestionInfo (기존 모델로 변환, 승인 시)
```

기존 모델 변경: **0건**. 승인된 문제만 기존 TestQuestionInfo로 변환.

---

## 6. Acceptance Criteria 체크리스트

### Bronze (최소 완료 기준)
- [ ] apps/ai/ Django 앱이 정상 동작 (migrate, runserver)
- [ ] 교재 PDF 업로드 → 청킹 → pgvector 저장
- [ ] LangGraph 파이프라인으로 문제 3종(객관식/주관식/빈칸채우기) 생성
- [ ] 생성된 문제가 TestQuestionInfo와 호환 가능한 형태
- [ ] Prometheus 14개 메트릭 + `/metrics` 엔드포인트 동작
- [ ] Grafana LLM Overview 대시보드 1개
- [ ] 기존 957개 테스트 전체 통과

### Silver (Sprint Goal)
- [ ] Bronze 전체 + 아래 항목
- [ ] Critic Agent가 4개 기준으로 품질 평가
- [ ] Quality Gate 통과/미달 자동 분류
- [ ] LangFuse CallbackHandler 통합 (graceful degradation)
- [ ] 기본 UI에서 생성 요청 → 결과 확인 가능
- [ ] 품질 점수가 UI에 표시

### Gold (이상적)
- [ ] Silver 전체 + 아래 항목
- [ ] 교사 승인/거부/수정 UI 동작
- [ ] 피드백이 다음 생성 프롬프트에 반영 (few-shot)
- [ ] 승인율 추이 대시보드
- [ ] LangFuse self-hosted K8s 배포 + 커스텀 Grafana 패널
- [ ] Prometheus Alerting rules
- [ ] 신규 AI 테스트 50개 이상

---

## 7. Definition of Done

각 User Story가 "완료"로 인정되려면:

1. Backend: API가 정상 응답하고, pytest 테스트 통과
2. Frontend: UI가 렌더링되고, Vitest 테스트 통과
3. 기존 957개 테스트에 영향 없음
4. API Contract (Section 5.3)과 일치하는 요청/응답

---

## 8. 의존성 관계

```
INF-1 (앱 스캐폴딩) ──→ 모든 Backend Story
INF-2 (pgvector)    ──→ US-1.1b (RAG), US-1.4 (교재 벡터화)
INF-3 (Celery)      ──→ US-1.1c (비동기 생성)
INF-4 (LLM 어댑터)  ──→ US-1.1c (문제 생성), US-2.1 (Critic)

US-1.4 (교재 업로드) ──→ US-1.1b (RAG 검색)
US-1.1b (RAG 검색)   ──→ US-1.1c (문제 생성)
US-1.1c (문제 생성)   ──→ US-2.1 (품질 검사)
US-2.1 (품질 검사)    ──→ US-3.1 (교사 리뷰)
US-3.1 (교사 리뷰)    ──→ US-3.5 (피드백 반영)

Frontend는 MSW mock으로 Backend 의존성 없이 독립 개발 가능.
Day 6 merge 시 실제 API 연동.
```

---

## 9. Risk & Mitigation

| Risk | 영향 | 확률 | 완화 방안 |
|------|------|------|-----------|
| Ollama 성능 부족 (M시리즈) | 생성 시간 60초 초과 | 중 | question_count 줄이기, 모델 경량화 |
| pgvector + PG18 호환 이슈 | RAG 불가 | 저 | pgvector >= 0.8.2 핀, PoC Day 1에서 검증 |
| LangGraph + Django 통합 이슈 | 파이프라인 불가 | 중 | Celery에서 실행으로 우회, sync 뷰 유지 |
| 1주 기간 초과 | Gold 미달 | 고 | Scope ladder — Silver 우선 확보 후 Gold 시도 |
| Merge 충돌 | 통합 지연 | 저 | Frontend/Backend 디렉토리 완전 분리로 충돌 0건 |
| Gemini free tier rate limit | 생성 지연/실패 | 중 | Rate Limiter(exponential backoff) + 배치 프롬프트 + Ollama fallback |
| Gemini free tier 정책 변경 | API 사용 불가 | 저 | LLM-agnostic 어댑터 패턴으로 Ollama/Claude 등 즉시 전환 가능 |
