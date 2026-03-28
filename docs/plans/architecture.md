# AI Exam Platform — Architecture Document

> **Source**: [BRD v1.3](./2026-03-02-ai-exam-agent-brd.md) + [Requirements Spec](./requirements-spec.md) + [Sprint Backlog](./sprint-backlog.md)
> **Version**: 1.0
> **Date**: 2026-03-28
> **Scope**: Silver Tier (49 SP) 기준, Gold 확장 사항 별도 표기

---

## 1. System Context Diagram

외부 시스템과 AI Exam Platform의 관계. 사용자 3종(교사, 학생, 운영자)이 시스템과 상호작용하며, 4개의 외부 시스템(Gemini API, Ollama, LangFuse, Prometheus/Grafana)과 연동된다.

```
                         ┌─────────────┐
                         │   교사       │
                         │ (Teacher)    │
                         └──────┬──────┘
                                │ HTTPS (브라우저)
                                │ - 교재 업로드
                                │ - 문제 생성 요청
                                │ - 문제 리뷰 (승인/거부/수정)
                                │ - 피드백 대시보드
                                ▼
┌─────────────┐    HTTPS    ┌──────────────────────────────────┐    HTTPS     ┌──────────────┐
│   학생       │───────────→│                                  │←────────────│   운영자      │
│ (Student)    │            │     AI Exam Platform             │             │ (Operator)    │
│              │            │                                  │             │               │
│ - 시험 응시   │            │  Django 5.2 + React 19           │             │ - Grafana     │
│ - 성적 확인   │            │  + AI Agent Pipeline             │             │   대시보드     │
│              │            │                                  │             │ - LangFuse    │
└─────────────┘            └────┬─────┬──────┬──────┬─────────┘             │   트레이싱     │
                                │     │      │      │                       └──────────────┘
                    ┌───────────┘     │      │      └───────────────┐
                    │                 │      │                      │
                    ▼                 ▼      ▼                      ▼
           ┌──────────────┐  ┌────────────────────┐  ┌──────────────────────┐
           │ Gemini API   │  │ Ollama             │  │ LangFuse Cloud/Self  │
           │ (Free Tier)  │  │ (Local Dev)        │  │ (Trace-level)        │
           │              │  │                    │  │                      │
           │ gemini-2.5-  │  │ llama3.2           │  │ trace → span →       │
           │ flash        │  │ http://localhost    │  │ generation           │
           │              │  │ :11434             │  │                      │
           │ 10 RPM       │  │                    │  │ 월 50K observations  │
           │ 500 RPD      │  │ 무제한              │  │ (무료 티어)           │
           └──────────────┘  └────────────────────┘  └──────────────────────┘

           ┌──────────────────────────────────────┐
           │ Prometheus + Grafana                  │
           │ (Aggregate-level)                     │
           │                                       │
           │ /metrics scrape → 14개 메트릭          │
           │ LLM Overview + Exam AI 대시보드        │
           └──────────────────────────────────────┘
```

**통신 프로토콜 요약**:
- 교사/학생 → Frontend: HTTPS (브라우저)
- Frontend → Backend: HTTP REST (axios, JWT Bearer)
- Backend → Gemini API: HTTPS (google-generativeai SDK)
- Backend → Ollama: HTTP (httpx, `localhost:11434`)
- Backend → LangFuse: HTTPS (langfuse SDK, graceful degradation)
- Prometheus → Backend: HTTP scrape (`/metrics`)

---

## 2. Container Diagram

시스템을 구성하는 컨테이너(프로세스/배포 단위)와 컨테이너 간 통신.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Docker Compose / K8s Cluster                     │
│                                                                         │
│  ┌─────────────────┐         HTTP/REST         ┌──────────────────────┐ │
│  │  React 19       │◄─────────────────────────►│  Django 5.2          │ │
│  │  Frontend       │    /api/v1/*              │  Backend (Gunicorn)  │ │
│  │  (Nginx :80)    │    JWT Bearer Auth        │  (:8000)             │ │
│  │                 │                           │                      │ │
│  │  SPA            │                           │  4 기존앱 + 1 AI앱    │ │
│  │  TanStack Router│                           │  DRF ViewSets        │ │
│  │  TanStack Query │                           │  /api/v1/ai/*        │ │
│  │  Zustand        │                           │  /metrics            │ │
│  └─────────────────┘                           └──────┬──┬────────────┘ │
│                                                       │  │              │
│                                    ┌──────────────────┘  │              │
│                                    │                     │              │
│                                    ▼                     ▼              │
│  ┌─────────────────────────┐    ┌──────────────────────────┐           │
│  │  Celery Worker          │    │  Redis 8                  │           │
│  │  (concurrency=2)        │◄──►│  (:6379)                  │           │
│  │                         │    │                           │           │
│  │  LangGraph Pipeline     │    │  - Celery Broker          │           │
│  │  - Generator Node       │    │  - Celery Result Backend  │           │
│  │  - Critic Node          │    │  - Django Cache (기존)     │           │
│  │  - Refiner Node         │    └───────────────────────────┘           │
│  │  - RAG Service          │                                            │
│  │                         │                                            │
│  │  LLM Provider 호출      │                                            │
│  │  Prometheus 메트릭 계측  │                                            │
│  │  LangFuse trace 전송    │                                            │
│  └────────┬────────────────┘                                            │
│           │                                                             │
│           ▼                                                             │
│  ┌──────────────────────────────────────┐                               │
│  │  PostgreSQL 18 + pgvector            │                               │
│  │  (:5432)                             │                               │
│  │                                      │                               │
│  │  기존 테이블:                          │                               │
│  │  - user_userprofile                  │                               │
│  │  - user_subjectinfo                  │                               │
│  │  - testquestion_testquestioninfo     │                               │
│  │  - testquestion_optioninfo           │                               │
│  │  - testpaper_*, examination_*        │                               │
│  │                                      │                               │
│  │  신규 테이블 (ai_*):                   │                               │
│  │  - ai_materialinfo                   │                               │
│  │  - ai_materialchunk (pgvector)       │                               │
│  │  - ai_generationrequest              │                               │
│  │  - ai_generatedquestion              │                               │
│  │  - ai_teacherfeedback                │                               │
│  │                                      │                               │
│  │  Extension: vector (pgvector >=0.8.2)│                               │
│  │  Index: HNSW (cosine similarity)     │                               │
│  └──────────────────────────────────────┘                               │
│                                                                         │
│  ┌──────────────────┐    ┌──────────────────┐                           │
│  │  Prometheus       │    │  Grafana          │                          │
│  │  scrape /metrics  │───►│  LLM Overview     │                          │
│  │  interval: 15s    │    │  대시보드          │                          │
│  └──────────────────┘    └──────────────────┘                           │
│                                                                         │
│  ┌──────────────────┐  (Silver tier: docker-compose overlay 또는 Cloud)  │
│  │  LangFuse         │                                                   │
│  │  - PostgreSQL     │                                                   │
│  │  - ClickHouse     │                                                   │
│  │  - Redis          │                                                   │
│  │  - Worker + Web   │                                                   │
│  └──────────────────┘                                                   │
└─────────────────────────────────────────────────────────────────────────┘
```

**docker-compose.yml 변경 사항** (기존 `docker-compose.yml:1-136` 대비):

| 변경 유형 | 대상 | 내용 |
|-----------|------|------|
| **제거** | `mongodb` 서비스 (`:21-37`) | API 0건, 코드 미참조 |
| **제거** | `mongodb_data` 볼륨 (`:131`) | |
| **제거** | `backend` MongoDB 환경변수 (`:76-81`) | |
| **제거** | `backend.depends_on.mongodb` (`:95-96`) | |
| **변경** | `postgres` 이미지 (`:3`) | `postgres:18-alpine` → `pgvector/pgvector:pg18` |
| **추가** | `celery-worker` 서비스 | Celery worker, LangGraph 실행 |
| **추가** | `backend` 환경변수 | `LLM_PROVIDER`, `GEMINI_API_KEY`, `CELERY_*` |

---

## 3. Component Architecture (Backend)

### 3.1 apps/ 디렉토리 구조

기존 4개 앱 + AI 1개 앱. `operation` 앱은 제거(API 0개, 참조 0건). AI 앱은 기존 앱에 대한 **단방향 FK 참조**만 갖는다.

```
examonline/apps/
├── core/                          # 공통 유틸 (기존)
│   └── api/
│       ├── pagination.py          # StandardResultsSetPagination (config/api.py:15)
│       ├── permissions.py         # IsTeacher, IsQuestionOwner (line 8-99)
│       ├── exceptions.py          # custom_exception_handler (line 9-24)
│       └── validators.py          # image validators
│
├── user/                          # 사용자 관리 (기존, 변경 0건)
│   ├── models.py                  # UserProfile, SubjectInfo, StudentsInfo, TeacherInfo
│   └── api/                       # 인증, 프로필 API
│
├── testquestion/                  # 문제 관리 (기존, 변경 0건)
│   ├── models.py                  # TestQuestionInfo (:13-56), OptionInfo (:60-73)
│   └── api/
│       ├── views.py               # QuestionViewSet (:42-193)
│       ├── serializers.py         # Read/Write 분리 패턴
│       ├── filters.py             # QuestionFilter (django_filters)
│       └── urls.py                # DefaultRouter (:1-14)
│
├── testpaper/                     # 시험지 관리 (기존, 변경 0건)
├── examination/                   # 시험 관리 (기존, 변경 0건)
│
└── ai/                            # AI 출제 시스템 (신규)
    ├── __init__.py
    ├── apps.py                    # AiConfig (heavy import 금지 — BRD 제약 #2)
    ├── models.py                  # 5개 모델 (requirements-spec.md A절)
    ├── admin.py
    ├── tasks.py                   # Celery tasks (requirements-spec.md C.3)
    │
    ├── api/                       # DRF API 레이어
    │   ├── urls.py                # DefaultRouter + APIView path
    │   ├── views.py               # MaterialViewSet, GenerateView, FeedbackView
    │   ├── serializers.py         # Read/Write 분리 (기존 패턴 동일)
    │   ├── filters.py             # MaterialFilter (django_filters)
    │   ├── throttles.py           # AIGenerateThrottle (30/hour)
    │   └── metrics_view.py        # /metrics (Prometheus scrape)
    │
    ├── llm/                       # LLM Provider 어댑터
    │   ├── base.py                # LLMProvider Protocol (PEP 544)
    │   ├── ollama.py              # OllamaProvider (httpx)
    │   ├── gemini.py              # GeminiProvider (google-generativeai)
    │   ├── rate_limiter.py        # Redis 기반 분산 Rate Limiter (INCR + TTL) + exponential backoff
    │   └── factory.py             # get_llm_provider() — 환경변수 기반
    │
    ├── services/                  # 비즈니스 로직 레이어
    │   ├── pipeline.py            # LangGraph StateGraph (Generator→Critic→Refiner)
    │   ├── rag.py                 # 교재 처리: 청킹 → 임베딩 → pgvector 저장/검색
    │   └── feedback.py            # 피드백 서비스: approve→TestQuestionInfo 변환, 통계
    │
    ├── observability/             # 관측성 레이어
    │   ├── metrics.py             # Prometheus 14개 메트릭 정의
    │   └── langfuse_handler.py    # LangFuse 3단계 graceful degradation
    │
    ├── migrations/
    │   └── 0001_initial.py        # CREATE EXTENSION vector + 모델 + HNSW index
    │
    └── tests/                     # 테스트
        ├── conftest.py            # LLM mock, pgvector fixture
        ├── test_models.py
        ├── test_views.py
        ├── test_serializers.py
        ├── test_services.py
        ├── test_pipeline.py
        ├── test_llm_adapters.py
        └── test_tasks.py
```

### 3.2 의존성 방향 (단방향: AI → 기존)

```
┌─────────────────────────────────────────────────┐
│                  apps/ai/                        │
│                                                  │
│  models.py ───FK(PROTECT)──→ user.SubjectInfo   │
│  models.py ───FK(SET_NULL)──→ user.UserProfile   │
│  models.py ───FK(SET_NULL)──→ testquestion       │
│             .TestQuestionInfo                    │
│                                                  │
│  api/views.py ──import──→ core.api.permissions   │
│             .IsTeacher                           │
│                                                  │
│  services/feedback.py ──ORM write──→ testquestion│
│             .TestQuestionInfo, .OptionInfo        │
└─────────────────────────────────────────────────┘
          │
          │ (단방향. 기존 코드에서 역참조 사용 0건
          │  — Django ORM 자동 역참조는 존재하나 기존 앱에서 미사용)
          ▼
┌─────────────────────────────────────────────────┐
│  기존 앱 (user, testquestion, testpaper,         │
│          examination)                            │
│                                                  │
│  AI 앱에 대한 import/FK 참조 0건                   │
│  기존 모델 변경 0건                                │
│  기존 957개 테스트 영향 0건                         │
└─────────────────────────────────────────────────┘
```

참조: `testquestion/models.py:13-56` (TestQuestionInfo), `testquestion/models.py:60-73` (OptionInfo)

### 3.3 Service Layer 패턴

기존 앱은 View에서 직접 ORM 호출하는 패턴(`testquestion/api/views.py:56-78`). AI 앱은 복잡도가 높으므로 **Service Layer**를 분리한다:

```
View (API 계층)                    Service (비즈니스 로직)             Model (데이터)
───────────────                    ──────────────────────             ──────────────
GenerateView.post()
  ├─ serializer.validate()
  ├─ serializer.save()             ──→ GenerationRequest.create()
  └─ run_generation_pipeline
       .delay()                    ──→ Celery task
                                        └─ pipeline.run_pipeline()
                                             ├─ rag.search()         ──→ MaterialChunk
                                             ├─ llm.generate_json()  ──→ Gemini/Ollama
                                             └─ save_results()       ──→ GeneratedQuestion

FeedbackView.post()
  └─ serializer.save()             ──→ FeedbackService
                                        ├─ .approve()               ──→ TestQuestionInfo
                                        │    └─ OptionInfo.create()
                                        ├─ .reject()                ──→ TeacherFeedback
                                        └─ .get_stats()             ──→ aggregate query
```

---

## 4. Component Architecture (Frontend)

### 4.1 features/ai/ 내부 구조

```
frontend/src/
├── types/ai.ts                            [신규] API 타입 정의
├── api/ai.ts                              [신규] AI API 클라이언트 (apiClient 기반)
│
├── features/ai/                           [신규]
│   ├── MaterialUploadPage.tsx             교재 업로드 + 목록
│   ├── GeneratePage.tsx                   문제 생성 요청 폼
│   ├── GenerationStatusPage.tsx           생성 상태 polling
│   ├── ReviewPage.tsx                     문제 리뷰 (승인/거부/수정)
│   └── components/
│       ├── QualityScoreBadge.tsx          품질 점수 시각화
│       ├── RejectReasonModal.tsx          거부 사유 입력 모달
│       └── EditQuestionModal.tsx          문제 수정 모달
│
├── features/dashboard/
│   └── TeacherDashboard.tsx               [수정] AI 통계 섹션 추가
│
├── components/layout/
│   └── Sidebar.tsx                        [수정] AI 출제 메뉴 추가
│
└── App.tsx                                [수정] AI 라우트 4개 추가
```

### 4.2 기존 features와의 관계

```
App.tsx (라우트 정의)
├── authenticatedLayoutRoute               (기존: App.tsx:42-52)
│   ├── /dashboard     → DashboardPage     (기존, 변경 0건)
│   │   ├── TeacherDashboard               [수정] AI 통계 위젯 추가
│   │   └── StudentDashboard               (기존, 변경 0건)
│   ├── /questions/*   → 기존 문제 CRUD      (변경 0건)
│   ├── /testpapers/*  → 기존 시험지          (변경 0건)
│   ├── /examinations/*→ 기존 시험            (변경 0건)
│   │
│   ├── /ai/materials  → MaterialUploadPage [신규, 교사 전용]
│   ├── /ai/generate   → GeneratePage       [신규, 교사 전용]
│   ├── /ai/status     → GenerationStatusPage [신규, ?generationId=uuid]
│   └── /ai/review     → ReviewPage         [신규, ?generationId=uuid]
```

교사 전용 라우트 보호는 기존 패턴(`App.tsx:92-103`, `useAuthStore.getState().user?.user_type !== 'teacher'` 체크) 동일 적용.

### 4.3 상태 관리 흐름

```
서버 상태: TanStack Query
─────────────────────────
useQuery(['ai-materials'])              → GET /api/v1/ai/materials/
useQuery(['ai-generation', id])         → GET /api/v1/ai/generate/{id}/  (3초 polling)
useQuery(['ai-feedback-stats'])         → GET /api/v1/ai/feedback/stats/
useMutation → aiApi.uploadMaterial()    → POST /api/v1/ai/materials/upload/
useMutation → aiApi.startGeneration()   → POST /api/v1/ai/generate/
useMutation → aiApi.submitFeedback()    → POST /api/v1/ai/feedback/

라우트 상태: URL Search Params
────────────────────────────
generationId → /ai/status?generationId=uuid
             → /ai/review?generationId=uuid

전역 상태: Zustand 추가 불필요
──────────────────────────────
generationId는 URL params로 충분. authStore(기존)만 유지.
```

참조: `frontend/src/api/client.ts:147-154` (axios 인스턴스), `frontend/src/api/client.ts:157-168` (JWT interceptor)

---

## 5. LangGraph Pipeline Architecture

### 5.1 StateGraph 상세 다이어그램

```
                    ┌─────────────────────────────────────────┐
                    │           PipelineState                  │
                    │                                         │
                    │  subject_id, material_ids, question_count│
                    │  type_distribution, difficulty_distribution│
                    │  generation_id                          │
                    │  context_chunks: list[dict]             │
                    │  generated_questions: list[dict]        │
                    │  quality_scores: list[dict]             │
                    │  passed_questions, failed_questions      │
                    │  current_round: int (0→3)              │
                    │  max_rounds: 3                          │
                    │  recent_feedback: list[dict] (US-3.5L)  │
                    └─────────────────────────────────────────┘

    ┌─────────┐
    │  START   │
    └────┬────┘
         │
         ▼
┌──────────────────┐     context_chunks     ┌──────────────────────┐
│ retrieve_context  │─────────────────────→│ generate_questions     │
│                  │                       │                        │
│ pgvector cosine  │                       │ 배치 프롬프트 (N개 1회) │
│ similarity       │                       │ + recent_feedback      │
│ top-k=10         │                       │   few-shot (US-3.5L)  │
│                  │                       │                        │
│ M: llm_request_  │                       │ M: llm_request_        │
│    duration_sec  │                       │    duration_seconds    │
│ L: span(retrieve)│                       │ L: span(generator)     │
└──────────────────┘                       └───────────┬────────────┘
                                                       │
                                                       │ generated_questions
                                                       ▼
                                           ┌──────────────────────┐
                                           │ critique_questions    │
                                           │                      │
                                           │ 배치 평가 (N개 1회)    │
                                           │ 4기준 스코어링:        │
                                           │  accuracy (5 필수)    │
                                           │  pedagogical (≥3)     │
                                           │  difficulty (≥3)      │
                                           │  clarity (≥3)         │
                                           │  total (≥14)          │
                                           │                      │
                                           │ M: exam_quality_gate_ │
                                           │    total              │
                                           │ L: span(critic)       │
                                           └───────────┬───────────┘
                                                       │
                                           ┌───────────▼───────────┐
                                           │  quality_gate_router   │
                                           │  (조건부 라우팅)        │
                                           └───┬──────┬──────┬─────┘
                                               │      │      │
                              all_passed ──────┘      │      └────── max_rounds_reached
                              (failed=0)              │              (round >= 3)
                                  │                   │                  │
                                  │       needs_refinement               │
                                  │       (failed>0 && round<3)          │
                                  │                   │                  │
                                  │                   ▼                  │
                                  │       ┌──────────────────┐          │
                                  │       │ refine_questions  │          │
                                  │       │                  │          │
                                  │       │ failed 문제만     │          │
                                  │       │ + Critic 피드백   │          │
                                  │       │ 배치 재생성       │          │
                                  │       │ current_round++  │          │
                                  │       │                  │          │
                                  │       │ M: llm_request_  │          │
                                  │       │    duration_sec  │          │
                                  │       │ L: span(refiner) │          │
                                  │       └────────┬─────────┘          │
                                  │                │                    │
                                  │                └──→ critique_questions│
                                  │                    (루프 백)         │
                                  │                                     │
                                  ▼                                     ▼
                           ┌──────────────────┐
                           │ save_results     │
                           │                  │
                           │ passed → DB      │
                           │   (passed_quality │
                           │    _gate=True)   │
                           │ failed → DB      │
                           │   (passed_quality │
                           │    _gate=False)  │
                           │ status=completed │
                           │                  │
                           │ M: exam_generation│
                           │    _duration_sec │
                           │ L: trace.end()   │
                           └────────┬─────────┘
                                    │
                                    ▼
                              ┌──────────┐
                              │   END    │
                              └──────────┘

M = Prometheus 메트릭 수집 포인트
L = LangFuse trace/span 포인트
```

### 5.2 LLM 호출 횟수 분석 (Gemini free tier 10 RPM)

```
최적 경로 (all_passed):
  retrieve_context → generate_questions → critique_questions → save_results
  LLM 호출: Generator(1) + Critic(1) = 2회
  시간: 12초 (6초/호출 × 2)

중간 경로 (1회 refinement):
  → generate → critique → refine → critique → save
  LLM 호출: Generator(1) + Critic(1) + Refiner(1) + Critic(1) = 4회
  시간: 24초

최악 경로 (3회 refinement):
  → generate → (critique → refine) × 3 → critique → save
  LLM 호출: Generator(1) + (Critic+Refiner) × 3 = 7회
  시간: 42초

10 RPM 내 안전: 최악 7회/42초 < 10회/60초
```

### 5.3 Celery Task와의 관계

```
Django View (sync)                Celery Worker (async)
─────────────────                 ────────────────────
POST /api/v1/ai/generate/
  │
  ├─ GenerationRequest.create()
  ├─ run_generation_pipeline
  │    .delay(generation_id)  ──→  Celery Task 시작
  ├─ generation.celery_task_id     │
  │    = task.id                   │
  └─ return 202 (generation_id)    │
                                   ├─ pipeline.invoke(initial_state)
GET /api/v1/ai/generate/{id}/     │     ├─ retrieve_context
  │                                │     ├─ generate_questions
  └─ GenerationRequest.status     │     ├─ critique_questions
     = "generating" ← polling      │     ├─ (refine → critique) × N
                                   │     └─ save_results
                                   │
GET /api/v1/ai/generate/{id}/     │  DB 업데이트:
  │                                │  GenerationRequest.status = "completed"
  └─ status = "completed"         │  GeneratedQuestion.objects.bulk_create()
     + questions 반환               │
                                   └─ Task 종료

soft_time_limit = 180초 (3분)
time_limit = 210초 (3.5분, hard limit)
max_retries = 2, retry_delay = 30초

GenerationRequest 상태 전이:
  pending → generating → completed | failed
  ※ "reviewing" 상태는 교수자가 생성된 문제를 검토 중인 상태 (프론트엔드 전용).
     Celery task와 무관하며, completed 이후 교수자 액션으로 전환됨.
```

참조: `requirements-spec.md` C.3절 (Celery Task 정의), BRD Section 8.0 제약 #1

---

## 6. Data Flow Diagrams

### Flow 1: 교재 업로드 → 청킹 → 벡터화 (비동기)

```
교사                Frontend              Backend (View)        Celery Worker          PostgreSQL
─────               ────────              ──────────────        ─────────────          ──────────
  │                    │                       │                      │                     │
  │ PDF 업로드          │                       │                      │                     │
  ├──────────────────→│                       │                      │                     │
  │                    │ POST /ai/materials/   │                      │                     │
  │                    │   upload/             │                      │                     │
  │                    ├─────────────────────→│                      │                     │
  │                    │                       │ MaterialInfo.create() │                     │
  │                    │                       │ status="processing"  │                     │
  │                    │                       ├─────────────────────────────────────────→│
  │                    │                       │                      │                     │
  │                    │                       │ process_material_task │                     │
  │                    │                       │   .delay(material_id) │                     │
  │                    │                       ├────────────────────→│                     │
  │                    │                       │                      │                     │
  │                    │   201 Created         │                      │                     │
  │                    │◄─────────────────────┤                      │                     │
  │                    │                       │                      │ pdfplumber.parse()   │
  │  "처리 중" 표시     │                       │                      │ sentence_transformer │
  │◄──────────────────┤                       │                      │   .encode()          │
  │                    │                       │                      │                     │
  │                    │                       │                      │ [M] llm_request_     │
  │                    │                       │                      │     duration_seconds │
  │                    │                       │                      │                     │
  │                    │                       │                      │ MaterialChunk        │
  │                    │                       │                      │   .bulk_create()     │
  │                    │                       │                      ├───────────────────→│
  │                    │                       │                      │                     │
  │                    │                       │                      │ MaterialInfo.status  │
  │                    │                       │                      │   = "ready"          │
  │                    │                       │                      ├───────────────────→│
  │                    │                       │                      │                     │
  │  polling (목록)     │                       │                      │                     │
  ├──────────────────→│ GET /ai/materials/    │                      │                     │
  │                    ├─────────────────────→│                      │                     │
  │                    │   status: "ready"     │                      │                     │
  │◄──────────────────┤◄─────────────────────┤                      │                     │
```

### Flow 2: 문제 생성 요청 → RAG → Generator → Critic → (Refiner) → 결과

```
교사         Frontend              Backend            Celery Worker         LLM Provider    DB
─────        ────────              ───────            ─────────────         ────────────    ──
  │             │                     │                     │                    │           │
  │ 생성 요청    │                     │                     │                    │           │
  ├───────────→│ POST /ai/generate/  │                     │                    │           │
  │             ├───────────────────→│                     │                    │           │
  │             │                     │ GenRequest.create() │                    │           │
  │             │                     ├──────────────────────────────────────────────────→│
  │             │                     │                     │                    │           │
  │             │                     │ task.delay()        │                    │           │
  │             │                     ├───────────────────→│                    │           │
  │             │  202 {generation_id}│                     │                    │           │
  │             │◄───────────────────┤                     │                    │           │
  │             │                     │                     │                    │           │
  │             │ GET /ai/generate/   │                     │ [L] trace.start()  │           │
  │             │  {id}/ (3초 polling)│                     │                    │           │
  │             ├───────────────────→│                     │ retrieve_context    │           │
  │             │  status:generating  │                     │ pgvector cosine    │           │
  │             │◄───────────────────┤                     │   similarity       │           │
  │             │                     │                     ├──────────────────────────────→│
  │             │                     │                     │◄─────────────────────────────┤
  │             │                     │                     │                    │           │
  │             │                     │                     │ [L] span(generator)│           │
  │             │                     │                     │ [M] llm_active_req │           │
  │             │                     │                     │ generate_questions │           │
  │             │                     │                     ├──────────────────→│           │
  │             │                     │                     │ [M] llm_request_   │           │
  │             │                     │                     │     duration_sec   │           │
  │             │                     │                     │◄─────────────────┤           │
  │             │                     │                     │ [M] llm_input/     │           │
  │             │                     │                     │     output_tokens  │           │
  │             │                     │                     │                    │           │
  │             │                     │                     │ [L] span(critic)   │           │
  │             │                     │                     │ critique_questions │           │
  │             │                     │                     ├──────────────────→│           │
  │             │                     │                     │◄─────────────────┤           │
  │             │                     │                     │ [M] exam_quality_  │           │
  │             │                     │                     │     gate_total     │           │
  │             │                     │                     │                    │           │
  │             │                     │                     │ (if failed > 0 &&  │           │
  │             │                     │                     │  round < 3)        │           │
  │             │                     │                     │ [L] span(refiner)  │           │
  │             │                     │                     │ refine → critique  │           │
  │             │                     │                     │   (loop)           │           │
  │             │                     │                     │                    │           │
  │             │                     │                     │ save_results       │           │
  │             │                     │                     │ GenRequest.status  │           │
  │             │                     │                     │   = "completed"    │           │
  │             │                     │                     ├──────────────────────────────→│
  │             │                     │                     │ [M] exam_generation│           │
  │             │                     │                     │     _duration_sec  │           │
  │             │                     │                     │ [L] trace.end()    │           │
  │             │                     │                     │                    │           │
  │             │ GET /ai/generate/   │                     │                    │           │
  │             │  {id}/ (polling)    │                     │                    │           │
  │             ├───────────────────→│                     │                    │           │
  │             │  status:completed   │                     │                    │           │
  │  결과 표시   │  + questions[]      │                     │                    │           │
  │◄───────────┤◄───────────────────┤                     │                    │           │
```

### Flow 3: 교사 피드백 → 승인/거부/수정 → TestQuestionInfo 변환

```
교사                Frontend                 Backend (FeedbackView)           DB
─────               ────────                 ──────────────────────           ──
  │                    │                           │                           │
  │ 문제 리뷰           │                           │                           │
  │ (승인 클릭)         │                           │                           │
  ├──────────────────→│ POST /ai/feedback/        │                           │
  │                    │ {action:"approve",        │                           │
  │                    │  generation_id, temp_id}  │                           │
  │                    ├─────────────────────────→│                           │
  │                    │                           │ FeedbackService.approve()  │
  │                    │                           │                           │
  │                    │                           │ 1. GeneratedQuestion 조회  │
  │                    │                           ├─────────────────────────→│
  │                    │                           │                           │
  │                    │                           │ 2. TestQuestionInfo.create │
  │                    │                           │    (name, subject,         │
  │                    │                           │     tq_type, tq_degree,    │
  │                    │                           │     create_user=teacher)   │
  │                    │                           ├─────────────────────────→│
  │                    │                           │                           │
  │                    │                           │ 3. OptionInfo.bulk_create  │
  │                    │                           │    (객관식인 경우)           │
  │                    │                           ├─────────────────────────→│
  │                    │                           │                           │
  │                    │                           │ 4. TeacherFeedback.create  │
  │                    │                           │    (action="approve",      │
  │                    │                           │     saved_question=FK)     │
  │                    │                           ├─────────────────────────→│
  │                    │                           │                           │
  │                    │   201 {question_id: 42}   │                           │
  │  "승인 완료"        │◄─────────────────────────┤                           │
  │◄──────────────────┤                           │                           │
  │                    │                           │                           │
  │ (거부 클릭)         │                           │                           │
  ├──────────────────→│ POST /ai/feedback/        │                           │
  │                    │ {action:"reject",         │                           │
  │                    │  reject_reason:"정답 오류"}│                           │
  │                    ├─────────────────────────→│                           │
  │                    │                           │ TeacherFeedback.create     │
  │                    │                           │ (action="reject",          │
  │                    │                           │  reject_reason="정답 오류") │
  │                    │                           ├─────────────────────────→│
  │                    │   201 {question_id: null}  │                           │
  │◄──────────────────┤◄─────────────────────────┤                           │
```

### Flow 4: 피드백 → 프롬프트 반영 (US-3.5 Lite)

```
교사가 거부한 피드백이 다음 생성 시 프롬프트에 반영되는 흐름.

[이전 생성 사이클에서 축적된 거부 피드백]

TeacherFeedback (action="reject")
  ├─ reject_reason: "보기가 너무 유사하여 구분이 어려움"
  ├─ reject_reason: "정답 키워드가 지문에 그대로 노출"
  └─ reject_reason: "난이도가 지정한 것보다 쉬움"

         │
         │ 다음 생성 요청 시
         ▼

┌──────────────────────────────────────────────────────────┐
│ generate_questions_node                                   │
│                                                          │
│ 1. TeacherFeedback.objects.filter(                        │
│      teacher=request.user,                               │
│      action="reject",                                    │
│      generated_question__generation__subject=subject      │
│    ).order_by("-create_time")[:5]                        │
│                                                          │
│ 2. recent_feedback → 프롬프트에 삽입:                      │
│    "## Previous Feedback (avoid these patterns)           │
│     - 보기가 너무 유사하여 구분이 어려움                      │
│     - 정답 키워드가 지문에 그대로 노출                        │
│     - 난이도가 지정한 것보다 쉬움"                           │
│                                                          │
│ 3. LLM에 배치 프롬프트 전송 (피드백 포함)                    │
└──────────────────────────────────────────────────────────┘
```

---

## 7. Integration Architecture

### 7.1 AI 앱 → 기존 앱 FK 참조 맵

```
┌─────────────────────────────────────────────────────────────────┐
│                         apps/ai/ 모델                            │
│                                                                 │
│  MaterialInfo                                                   │
│  ├── subject ──FK(PROTECT)──→ user.SubjectInfo                  │
│  └── uploaded_by ──FK(SET_NULL)──→ user.UserProfile              │
│                                                                 │
│  GenerationRequest                                              │
│  ├── subject ──FK(PROTECT)──→ user.SubjectInfo                  │
│  └── requested_by ──FK(SET_NULL)──→ user.UserProfile             │
│                                                                 │
│  GeneratedQuestion                                              │
│  ├── generation ──FK(CASCADE)──→ ai.GenerationRequest            │
│  └── source_chunk ──FK(SET_NULL)──→ ai.MaterialChunk             │
│                                                                 │
│  TeacherFeedback                                                │
│  ├── generated_question ──FK(CASCADE)──→ ai.GeneratedQuestion    │
│  ├── teacher ──FK(SET_NULL)──→ user.UserProfile                  │
│  └── saved_question ──FK(SET_NULL)──→ testquestion               │
│       .TestQuestionInfo   (승인/수정 시에만 설정)                   │
│                                                                 │
│  MaterialChunk                                                  │
│  └── material ──FK(CASCADE)──→ ai.MaterialInfo                   │
└─────────────────────────────────────────────────────────────────┘

FK 방향: AI → 기존 (단방향)
기존 → AI: 참조 0건
on_delete 전략:
  - PROTECT: 과목 삭제 시 교재/생성요청 보호 (기존 TestQuestionInfo 패턴)
  - SET_NULL: 사용자 탈퇴 시에도 데이터 보존 (기존 create_user 패턴)
  - CASCADE: AI 내부 계층 (교재→청크, 생성요청→문제, 문제→피드백)
```

참조: `testquestion/models.py:16` (SubjectInfo FK PROTECT), `testquestion/models.py:43` (UserProfile FK SET_NULL)

### 7.2 GeneratedQuestion → approve → TestQuestionInfo 변환

```python
# services/feedback.py (의사 코드)
def approve(generated_question, teacher):
    # 1. TestQuestionInfo 생성 (기존 모델, testquestion/models.py:13-56)
    tq = TestQuestionInfo.objects.create(
        name=generated_question.name,
        subject=generated_question.generation.subject,
        tq_type=generated_question.tq_type,    # choices 동일
        tq_degree=generated_question.tq_degree, # choices 동일
        create_user=teacher,
        score=0,  # 기본값 (기존 패턴)
    )

    # 2. 객관식 보기 생성 (기존 모델, testquestion/models.py:60-73)
    if generated_question.tq_type == "xz":
        OptionInfo.objects.bulk_create([
            OptionInfo(
                test_question=tq,
                option=opt["option"],
                is_right=opt["is_right"],
            )
            for opt in generated_question.options
        ])

    # 3. 피드백 기록
    TeacherFeedback.objects.create(
        generated_question=generated_question,
        teacher=teacher,
        action="approve",
        saved_question=tq,  # FK 연결
    )

    return tq
```

### 7.3 TeacherDashboard AI 통계 위젯

기존 `features/dashboard/TeacherDashboard.tsx`에 AI 통계 섹션을 추가한다. 별도 페이지가 아닌 기존 대시보드의 확장.

```
기존 TeacherDashboard
├── 기존 통계 카드 (문제 수, 시험지 수, 시험 수 등)
├── 기존 차트
│
└── [신규] AI 출제 통계 섹션
    ├── 통계 카드 4개:
    │   ├── 총 생성 문제 수 (total_generated)
    │   ├── 승인된 문제 수 (approved)
    │   ├── 승인율 (approval_rate, %)
    │   └── 거부된 문제 수 (rejected)
    │
    └── 승인율 추이 차트 (InteractiveBarChart)
        └── 데이터: GET /api/v1/ai/feedback/stats/ → trend[]
```

### 7.4 API URL 네임스페이스 분리

```
기존 API (examonline/urls.py:24-28):
  /api/v1/auth/*          → user.api.urls
  /api/v1/questions/*     → testquestion.api.urls
  /api/v1/papers/*        → testpaper.api.urls
  /api/v1/examinations/*  → examination.api.urls
  /api/v1/health/*        → core.api.urls

신규 API (추가):
  /api/v1/ai/*            → ai.api.urls        [신규 URL include]
  /metrics                → ai.api.metrics_view [Prometheus, 인증 없음]

충돌 가능성: 0건 (/api/v1/ai/ 네임스페이스 독립)
```

참조: `examonline/urls.py:20-30`

---

## 8. Infrastructure Architecture

### 8.1 docker-compose.yml 변경 후 서비스 구성

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     docker-compose.yml (변경 후)                         │
│                                                                         │
│  ┌────────────────┐     ┌────────────────┐     ┌────────────────┐      │
│  │ postgres        │     │ redis           │     │ frontend       │      │
│  │ pgvector/       │     │ redis:8-alpine  │     │ React 19       │      │
│  │ pgvector:pg18   │     │ :6379           │     │ Nginx :80      │      │
│  │ :5432           │     │                 │     │                │      │
│  │ + pgvector ext  │     │ Celery broker   │     │ depends_on:    │      │
│  │                 │     │ + result backend│     │   backend      │      │
│  └────────┬───────┘     └───────┬─────────┘     └───────┬────────┘      │
│           │                     │                       │               │
│           │    SQL               │    Redis protocol      │    HTTP       │
│           │                     │                       │               │
│           ▼                     ▼                       ▼               │
│  ┌────────────────────────────────────────────────────────────┐         │
│  │  backend                                                   │         │
│  │  Django 5.2 + Gunicorn :8000                              │         │
│  │                                                           │         │
│  │  depends_on: postgres(healthy), redis(healthy)            │         │
│  │  env: DJANGO_SETTINGS_MODULE, SECRET_KEY, PG_*, REDIS_*  │         │
│  │       LLM_PROVIDER, GEMINI_API_KEY, GEMINI_MODEL          │         │
│  └──────────────────────┬────────────────────────────────────┘         │
│                          │                                              │
│                          │ 동일 이미지, 다른 command                      │
│                          │                                              │
│  ┌──────────────────────▼────────────────────────────────────┐         │
│  │  celery-worker                                             │         │
│  │  command: celery -A celery_app worker --loglevel=info      │         │
│  │          --concurrency=2                                   │         │
│  │                                                           │         │
│  │  depends_on: postgres(healthy), redis(healthy)            │         │
│  │  env: 동일 (backend와 같은 환경 변수)                        │         │
│  │       + OLLAMA_BASE_URL=http://host.docker.internal:11434 │         │
│  └───────────────────────────────────────────────────────────┘         │
│                                                                         │
│  제거된 서비스:                                                           │
│  ╳ mongodb (API 0건, 코드 미참조)                                        │
│  ╳ mongodb_data 볼륨                                                     │
│                                                                         │
│  volumes:                                                               │
│    postgres_data, redis_data, backend_logs                              │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Startup Recovery: Stale GenerationRequest 복구

`time_limit=210초` hard kill (SIGKILL) 시 GenerationRequest가 "generating" 상태로
영구 고착될 수 있음. 이를 방지하기 위한 복구 메커니즘:

```
┌─────────────────────────────────────────────────────────────┐
│  cleanup_stale_generations (Celery Beat task)                │
│                                                             │
│  주기: 매 5분 실행                                            │
│  조건: status="generating" AND create_time < now() - 10분    │
│  액션: status → "failed",                                    │
│        error_message = "Worker 재시작으로 인한 자동 실패 처리"  │
│                                                             │
│  추가: Celery worker_ready signal 핸들러에서도 시작 시 1회 실행 │
│        → worker 크래시 후 재시작 시 즉시 orphaned task 정리     │
└─────────────────────────────────────────────────────────────┘
```

참조: `requirements-spec.md` C.3절 cleanup_stale_generations task 정의

### 8.2 Helm Chart 변경 사항

기존 Helm chart 구조 (`charts/exam-platform/`):

```
charts/exam-platform/
├── Chart.yaml
├── values.yaml                     [수정] MongoDB 설정 제거, Celery/AI 설정 추가
├── values-staging.yaml             [수정] 동일
├── templates/
│   ├── backend/
│   │   ├── deployment.yaml         [수정] AI 환경변수 추가
│   │   └── service.yaml
│   ├── frontend/
│   │   ├── deployment.yaml
│   │   └── service.yaml
│   ├── configmap.yaml              [수정] MongoDB 제거, Celery/AI 설정 추가
│   ├── external-secret.yaml        [수정] GEMINI_API_KEY, LANGFUSE_* 추가
│   ├── ingress.yaml
│   ├── secret.yaml
│   │
│   ├── celery/                     [신규 디렉토리]
│   │   └── deployment.yaml         Celery Worker Deployment
│   │
│   └── monitoring/                 [신규 디렉토리]
│       ├── servicemonitor.yaml     Prometheus ServiceMonitor (scrape /metrics)
│       └── grafana-dashboard.yaml  ConfigMap (llm-overview.json)
```

**values.yaml 변경** (기존 `values.yaml:166-190`):

```yaml
config:
  # 제거: mongodbHost, mongodbPort, mongodbDatabase, mongodbUser, mongodbAuthSource
  # 추가:
  llmProvider: "ollama"
  ollamaBaseUrl: "http://ollama:11434"
  geminiModel: "gemini-2.5-flash"
  celeryBrokerUrl: "redis://redis:6379/0"

# 추가: Celery Worker
celeryWorker:
  replicaCount: 1
  image:
    repository: examonline/backend  # backend와 동일 이미지
    tag: "latest"
  command: ["celery", "-A", "celery_app", "worker", "--loglevel=info", "--concurrency=2"]
  resources:
    requests:
      cpu: "200m"
      memory: "512Mi"
    limits:
      cpu: "1000m"
      memory: "1Gi"

# 추가: External Secrets
externalSecrets:
  secrets:
    geminiApiKey:
      key: "exam-gemini-api-key"
    langfusePublicKey:
      key: "exam-langfuse-public-key"
    langfuseSecretKey:
      key: "exam-langfuse-secret-key"
```

### 8.3 CI/CD 변경 사항

기존 CI (`.github/workflows/ci.yml:1-268`):

```yaml
# test-backend job 변경:
services:
  postgres:
    image: pgvector/pgvector:pg18  # postgres:18 → pgvector 이미지
    # ... 기존 설정 유지

# 테스트 커맨드 변경 없음:
# uv run pytest --cov=apps --cov-report=xml
# apps/ai/tests/ 가 자동으로 포함됨 (apps/ 하위)
```

### 8.4 Prometheus/Grafana 배포 방식

```
로컬 개발:
  - prometheus_client 라이브러리로 /metrics 엔드포인트 노출
  - docker-compose.monitoring.yml overlay:
    - Prometheus (scrape config → backend:8000/metrics, celery-worker:8001/metrics)
    - Grafana (provisioning → llm-overview.json)

K8s (GKE):
  Option A: GKE Managed Prometheus (terraform enable_managed_prometheus=true)
    - PodMonitoring CRD → /metrics scrape
    - Cloud Monitoring 대시보드
  Option B: kube-prometheus-stack Helm chart
    - ServiceMonitor → /metrics scrape
    - Grafana 자체 호스팅

현재 상태: Terraform enable_managed_prometheus=false (default)
           → 이번 Sprint에서 Option B로 구현 후, 추후 Option A 전환 가능
```

참조: `terraform/environments/gcp-staging/kubernetes.tf`

### 8.5 LangFuse 배포 방식

```
Tier별 배포:
  Bronze: LangFuse 미적용 (graceful degradation → None 반환)
  Silver: LangFuse Cloud 무료 티어 (월 50K observations)
          또는 docker-compose.langfuse.yml overlay
  Gold:   LangFuse self-hosted K8s (Helm chart)

로컬 개발 (Silver overlay):
  docker-compose.langfuse.yml:
    - langfuse-web:      LangFuse UI (:3001)
    - langfuse-worker:   Background worker
    - langfuse-postgres: 전용 PostgreSQL
    - langfuse-clickhouse: 분석 엔진
    - langfuse-redis:    큐
    - langfuse-minio:    Object storage

환경 변수:
  LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY, LANGFUSE_HOST
  → 미설정 시 graceful degradation (앱 정상 동작)
```

---

## 9. Observability Architecture (2-Layer)

### 9.1 Layer 1: LangFuse (Trace-level)

fAInancial-agent 패턴 재활용 (`fAInancial-agent/agent/graph.py:11-23`, `:145-159`).

```
┌─────────────────────────────────────────────────────────────────┐
│                    LangFuse Trace 구조                           │
│                                                                 │
│  Trace (generation_request_id = session_id)                     │
│  ├── Span: retrieve_context                                     │
│  │   ├── input: material_ids, subject_id                        │
│  │   ├── output: context_chunks (top-k)                         │
│  │   └── duration                                               │
│  │                                                              │
│  ├── Generation: generator                                      │
│  │   ├── model: gemini/gemini-2.5-flash                         │
│  │   ├── input: batch prompt (N개 문제)                          │
│  │   ├── output: generated questions JSON                       │
│  │   ├── input_tokens, output_tokens                            │
│  │   ├── cost (Gemini pricing)                                  │
│  │   └── duration                                               │
│  │                                                              │
│  ├── Generation: critic (round 0)                               │
│  │   ├── model: gemini/gemini-2.5-flash                         │
│  │   ├── input: questions + evaluation criteria                 │
│  │   ├── output: scores JSON                                    │
│  │   └── input_tokens, output_tokens, cost                      │
│  │                                                              │
│  ├── Generation: refiner (round 1, if needed)                   │
│  │   └── ...                                                    │
│  │                                                              │
│  ├── Generation: critic (round 1, if needed)                    │
│  │   └── ...                                                    │
│  │                                                              │
│  └── Span: save_results                                         │
│      ├── passed: N, failed: M                                   │
│      └── duration                                               │
└─────────────────────────────────────────────────────────────────┘
```

**Graceful Degradation 3단계** (기존 패턴: `fAInancial-agent/agent/graph.py:145-159`):

```
1단계: langfuse 패키지 미설치
       → ImportError catch → return None → 앱 정상

2단계: 환경변수 미설정 (LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY)
       → None 반환 → 앱 정상

3단계: 초기화 예외 (네트워크 오류, 잘못된 키 등)
       → Exception catch → logger.warning → return None → 앱 정상

파이프라인 통합:
  handler = get_langfuse_handler(generation_id)
  config = {}
  if handler:
      config["callbacks"] = [handler]
  result = pipeline.invoke(state, config=config)
```

### 9.2 Layer 2: Prometheus (Aggregate-level)

llm-serving-observability 패턴 재활용 (`llm-serving-observability/proxy/metrics.py:1-111`).

```
┌─────────────────────────────────────────────────────────────────┐
│                Prometheus 14개 메트릭                             │
│                                                                 │
│  이식 메트릭 (10개, llm-serving-observability 패턴):              │
│  ┌──────────────────────────────────────────────────┐           │
│  │ M1  llm_request_duration_seconds    Histogram    │           │
│  │ M2  llm_ttft_seconds               Histogram    │           │
│  │ M3  llm_tokens_per_second          Histogram    │           │
│  │ M4  llm_time_per_output_token_sec  Histogram    │           │
│  │ M5  llm_input_tokens_total         Counter      │           │
│  │ M6  llm_output_tokens_total        Counter      │           │
│  │ M7  llm_requests_total             Counter      │           │
│  │ M8  llm_request_errors_total       Counter      │           │
│  │ M9  llm_active_requests            Gauge        │           │
│  │ M10 llm_queue_depth                Gauge        │           │
│  └──────────────────────────────────────────────────┘           │
│                                                                 │
│  신규 메트릭 (4개, Exam/Gemini 특화):                             │
│  ┌──────────────────────────────────────────────────┐           │
│  │ M12 gemini_rate_limit_hits_total    Counter      │           │
│  │ M13 gemini_rpm_remaining            Gauge        │           │
│  │ M14 exam_quality_gate_total         Counter      │           │
│  │ M15 exam_generation_duration_sec    Histogram    │           │
│  └──────────────────────────────────────────────────┘           │
│                                                                 │
│  계측 위치:                                                      │
│  ┌──────────────────────────────────────────────────┐           │
│  │ LLM Provider 래퍼  → M1-M10 (매 LLM 호출마다)     │           │
│  │ Celery task        → M15 (파이프라인 전체 시간)     │           │
│  │ Gemini API 래퍼    → M12, M13 (429 감지, RPM 추적) │           │
│  │ quality_gate_router → M14 (passed/failed count)   │           │
│  └──────────────────────────────────────────────────┘           │
│                                                                 │
│  Scrape 설정:                                                    │
│  ┌──────────────────────────────────────────────────┐           │
│  │ /metrics 엔드포인트 (prometheus_client)            │           │
│  │ scrape_interval: 15s                              │           │
│  │ targets:                                          │           │
│  │   backend:8000    — Django /metrics view           │           │
│  │   celery-worker:8001 — start_http_server(8001)    │           │
│  │                                                   │           │
│  │ ※ Celery prefork worker는 Django HTTP 서버 없음.   │           │
│  │   prometheus_client.start_http_server(port=8001)  │           │
│  │   로 별도 메트릭 서버 기동 (worker_ready signal).   │           │
│  └──────────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

### 9.3 두 Layer 간 Correlation

```
LangFuse trace                        Prometheus 메트릭
──────────────                        ────────────────────
trace.id = generation_request_id      label: generation_id (선택적)
  │                                     │
  ├─ generation.id (LLM 호출별)    ←──→ M7 llm_requests_total
  │                                       (model, status, node)
  │
  ├─ generation.input_tokens       ←──→ M5 llm_input_tokens_total
  ├─ generation.output_tokens      ←──→ M6 llm_output_tokens_total
  ├─ generation.duration           ←──→ M1 llm_request_duration_seconds
  │
  └─ trace.metadata.quality_gate   ←──→ M14 exam_quality_gate_total

Correlation 방법:
  1. LangFuse에서 특정 trace 조회 (generation_id)
  2. 해당 시간대의 Prometheus 메트릭으로 집계 비교
  3. generation_id로 양쪽 연결 (trace-level ↔ aggregate-level)
```

### 9.4 Grafana 대시보드 패널 구성

```
LLM Overview 대시보드 (llm-overview.json):

┌─────────────────────┬─────────────────────┬─────────────────────┐
│ LLM Request Rate    │ Duration P50/P95    │ Error Rate          │
│ rate(llm_requests_  │ histogram_quantile  │ rate(errors)/       │
│ total[5m])          │ (0.95, duration)    │ rate(total)         │
├─────────────────────┼─────────────────────┼─────────────────────┤
│ Token Usage         │ Active Requests     │ Tokens Per Second   │
│ input + output      │ llm_active_requests │ histogram_quantile  │
│ rate[5m]            │                     │ (0.5, tps)          │
├─────────────────────┼─────────────────────┼─────────────────────┤
│ Gemini RPM          │ Rate Limit Hits     │ Quality Gate        │
│ Remaining           │ rate(gemini_rate_   │ Pass Rate           │
│ gemini_rpm_         │ limit_hits[5m])     │ passed / total      │
│ remaining           │                     │                     │
├─────────────────────┴─────────────────────┴─────────────────────┤
│ Generation Duration (Time Series)                               │
│ histogram_quantile(0.5, exam_generation_duration_seconds)       │
└─────────────────────────────────────────────────────────────────┘
```

### 9.5 Alerting 규칙 (Gold tier)

```yaml
# prometheus-rules.yaml
groups:
  - name: exam-ai-alerts
    rules:
      - alert: GeminiRateLimitHigh
        expr: rate(gemini_rate_limit_hits_total[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Gemini API rate limit hits increasing"

      - alert: QualityGatePassRateLow
        expr: |
          rate(exam_quality_gate_total{result="passed"}[1h])
          / rate(exam_quality_gate_total[1h]) < 0.5
        for: 30m
        labels:
          severity: warning
        annotations:
          summary: "AI quality gate pass rate below 50%"

      - alert: GenerationDurationHigh
        expr: histogram_quantile(0.95, exam_generation_duration_seconds) > 120
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "AI generation P95 duration exceeds 2 minutes"
```

---

## 10. Security Architecture

### 10.1 API Key 관리

```
로컬 개발:
  .env 파일 → GEMINI_API_KEY=xxx
  docker-compose.yml → environment: GEMINI_API_KEY=${GEMINI_API_KEY}

K8s 프로덕션:
  GCP Secret Manager → External Secrets Operator → K8s Secret → env

  ┌────────────────┐     ┌──────────────┐     ┌──────────────┐
  │ GCP Secret     │     │ ESO          │     │ K8s Secret   │
  │ Manager        │────→│ ExternalSecret│────→│ exam-secrets │
  │                │     │              │     │              │
  │ exam-gemini-   │     │ refreshInterval│   │ GEMINI_API_  │
  │ api-key        │     │ : 1h          │    │ KEY          │
  │                │     │              │     │              │
  │ exam-langfuse- │     │ secretStoreRef│   │ LANGFUSE_    │
  │ public-key     │     │ : gcp-secret- │   │ PUBLIC_KEY   │
  │                │     │   manager     │    │              │
  │ exam-langfuse- │     │              │     │ LANGFUSE_    │
  │ secret-key     │     │              │     │ SECRET_KEY   │
  └────────────────┘     └──────────────┘     └──────────────┘
```

참조: `charts/exam-platform/templates/external-secret.yaml`, `charts/exam-platform/values.yaml:219-235`

### 10.2 교재 접근 권한 (Subject-based ACL)

```python
# MaterialViewSet.get_queryset() (requirements-spec.md B.1)
MaterialInfo.objects.filter(
    uploaded_by=self.request.user,  # 본인 업로드 교재만
    is_del=False,
)

# 향후 확장 (같은 과목 교사도 접근 가능):
# MaterialInfo.objects.filter(
#     Q(uploaded_by=self.request.user) |
#     Q(subject__in=teacher.subjects.all()),
#     is_del=False,
# )
```

Permission 체계:
- 모든 AI API: `[IsAuthenticated, IsTeacher]`
- 기존 `IsTeacher` 재사용 (`core/api/permissions.py:8-18`)
- 학생은 AI 출제 기능 접근 불가 (프론트엔드 라우트 가드 + 백엔드 permission)

### 10.3 Free Tier 데이터 프라이버시

```
Gemini API Free Tier 정책:
  - 요청 데이터가 Google 제품 개선에 사용될 수 있음
  - 민감한 교재 내용이 포함될 수 있으므로 주의 필요

대응 방안:
  1. 로컬 개발: Ollama 사용 (데이터 외부 전송 없음)
  2. 프로덕션 (데모): Gemini free tier (포트폴리오 목적, 민감 데이터 없음)
  3. 프로덕션 (실제): Gemini paid tier 또는 self-hosted LLM

환경 변수 전환: LLM_PROVIDER=ollama|gemini
```

---

## 11. Worktree 병렬 개발 Architecture

### 11.1 파일 소유권 맵

```
┌─────────────────────────────────────┬──────────────────────────────────────┐
│ Worktree A: feature/ai-backend      │ Worktree B: feature/ai-frontend       │
│ (examonline/ 전용)                   │ (frontend/ 전용)                      │
├─────────────────────────────────────┼──────────────────────────────────────┤
│ NEW:                                │ NEW:                                  │
│   examonline/apps/ai/**             │   frontend/src/features/ai/**        │
│                                     │   frontend/src/api/ai.ts             │
│ MODIFY:                             │   frontend/src/types/ai.ts           │
│   examonline/config/base.py         │   frontend/src/__tests__/features/ai/│
│   examonline/examonline/urls.py     │   frontend/src/__tests__/api/ai.*    │
│   examonline/pyproject.toml         │   frontend/src/__tests__/mocks/ai-*  │
│   examonline/conftest.py            │                                      │
│   docker-compose.yml                │ MODIFY:                              │
│                                     │   frontend/src/App.tsx               │
│                                     │   frontend/src/components/layout/    │
│                                     │     Sidebar.tsx                      │
│                                     │   frontend/src/features/dashboard/   │
│                                     │     TeacherDashboard.tsx             │
│                                     │   frontend/src/__tests__/mocks/      │
│                                     │     server.ts                        │
├─────────────────────────────────────┼──────────────────────────────────────┤
│ 파일 충돌: 0건                       │ 파일 충돌: 0건                         │
│ (examonline/ vs frontend/ 물리적 분리)│                                      │
└─────────────────────────────────────┴──────────────────────────────────────┘
```

### 11.2 API Contract 인터페이스 역할

```
Worktree A (Backend)                    API Contract                    Worktree B (Frontend)
────────────────────                    ────────────                    ─────────────────────
실제 API 구현                           BRD Section 5.3                 MSW Mock 기반 개발
  │                                       │                                  │
  ├─ POST /api/v1/ai/generate/           │ Request/Response 형식 정의        ├─ aiApi.startGeneration()
  │   202 {generation_id, status}        │                                  │   mock: 202 응답
  │                                       │                                  │
  ├─ GET /api/v1/ai/generate/{id}/       │                                  ├─ useGenerationStatus()
  │   200 {status, questions[], stats}   │                                  │   mock: polling 시뮬레이션
  │                                       │                                  │
  └─ ...                                 │                                  └─ ...

Day 1-5: 각 Worktree 독립 개발 (API Contract 기반)
Day 6:   merge → MSW mock 제거 → 실제 API 연동 검증
Day 7:   E2E 테스트 + 문서화
```

### 11.3 Merge 전략

```
main ─────────────────────────────────────────────────────→
  │                                                       ↑
  ├─ feature/ai-backend (Worktree A) ───────────────────→ merge (Day 6)
  │   ├─ Day 1: scaffolding + models                      │
  │   ├─ Day 2: celery + llm adapters                     │
  │   ├─ Day 3: RAG + prometheus                          │
  │   ├─ Day 4: generator + API                           │
  │   ├─ Day 5: critic + refiner                          │
  │   └─ Day 6: feedback + langfuse                       │
  │                                                       │
  └─ feature/ai-frontend (Worktree B) ──────────────────→ merge (Day 6)
      ├─ Day 1: types + api client + routes               │
      ├─ Day 2: material upload UI                         │
      ├─ Day 3: generate form + polling                    │
      ├─ Day 4: result list + quality badge                │
      ├─ Day 5: review UI (approve/reject/edit)            │
      └─ Day 6: dashboard + MSW→API 전환                   │

Merge 순서: Backend 먼저 → Frontend 순서 (Backend API가 준비되어야 연동 가능)
충돌 예상: 0건 (examonline/ vs frontend/ 물리적 분리)
```

---

## 12. ADR (Architecture Decision Records)

### ADR-1: AI 앱 별도 분리 (얕은 통합) vs 기존 앱 수정

**Status**: Accepted

**Context**: AI 기능을 기존 4개 앱에 분산시킬 것인가, 별도 `apps/ai/`로 분리할 것인가.

**Decision**: `apps/ai/`로 별도 분리. 기존 앱에 대한 **단방향 FK 참조만** 허용.

**Rationale**:
- 기존 957개 테스트 무중단이 필수 제약 (BRD Section 9.1). 기존 모델/API 변경 0건 보장.
- AI 앱 제거 시 기존 시스템 원상복구 가능 (INSTALLED_APPS에서 제거하면 끝).
- 기존 `testquestion/models.py:13-56`의 TestQuestionInfo는 변경하지 않고, AI 생성 문제는 승인 시에만 TestQuestionInfo로 변환.
- Worktree 병렬 개발 시 파일 충돌 0건 보장.

**Consequences**:
- AI → 기존 방향 FK만 허용, 역방향 참조 불가.
- 기존 앱에서 AI 통계를 보려면 별도 API 호출 필요 (TeacherDashboard에서 `/ai/feedback/stats/`).

**Alternatives Rejected**:
- 기존 `testquestion`에 AI 필드 추가: 기존 테스트 깨질 위험, migration 영향.
- 기존 모델에 mixin으로 AI 기능 추가: 결합도 증가, 분리 어려움.

---

### ADR-2: LangGraph + Celery 비동기 실행 vs Django async view

**Status**: Accepted

**Context**: LangGraph 파이프라인(LLM 호출 2-7회, 12-42초 소요)을 어디서 실행할 것인가.

**Decision**: Django View는 sync 유지. LangGraph 파이프라인은 **Celery Worker**에서 실행. 클라이언트는 polling으로 결과 확인.

**Rationale**:
- Django 5.2의 async view는 성숙하지만, DRF + SimpleJWT + django-filters 전체 스택이 async를 완전 지원하지 않음.
- Gunicorn worker가 30초+ 블록되면 다른 요청 처리 불가. Celery worker 분리로 Django request cycle 보호.
- Celery는 retry, timeout, task 상태 추적 기능을 제공. LangGraph 실행 중 실패 시 자동 재시도 (max_retries=2).
- BRD Section 8.0 제약 #1에서 명시적으로 Celery 필수.

**Consequences**:
- Redis 의존성 추가 (이미 기존 cache로 사용 중, 추가 비용 0).
- docker-compose에 celery-worker 서비스 추가.
- 실시간 WebSocket 대신 polling (3초 간격). 단순하고 디버깅 용이.

**Alternatives Rejected**:
- Django async view: DRF 호환성 리스크, 기존 테스트 영향 가능.
- Django-Q2: Celery 대비 생태계 작음, LangGraph 통합 사례 부족.

---

### ADR-3: 2-Layer Observability (LangFuse + Prometheus) vs 단일 도구

**Status**: Accepted

**Context**: LLM 파이프라인 관측성을 어떤 도구로 구현할 것인가.

**Decision**: **2-Layer** — LangFuse(trace-level) + Prometheus(aggregate-level). 기존 프로젝트 패턴 재활용.

**Rationale**:
- Layer 1 (LangFuse): 개별 생성 요청의 trace → span → generation 추적. 토큰 사용량, 비용, 품질 점수를 요청 단위로 분석 가능. fAInancial-agent(`agent/graph.py:145-159`)에서 검증된 패턴 재활용.
- Layer 2 (Prometheus): 전체 시스템의 집계 메트릭. RPM/RPD 모니터링, 품질 게이트 통과율 트렌드, P95 지연시간 알림. llm-serving-observability(`proxy/metrics.py:1-111`)에서 검증된 14개 메트릭 정의 재활용.
- 두 Layer는 상호 보완적: LangFuse는 "이 요청에서 무슨 일이 있었는가", Prometheus는 "전체적으로 시스템이 어떤 상태인가".
- 3-프로젝트 통합 서사: llm-serving-observability → fAInancial-agent → AI Exam Platform. 시니어 레벨 판단력 증명.

**Consequences**:
- LangFuse는 graceful degradation으로 optional (미설정 시 앱 정상 동작).
- Prometheus 14개 메트릭은 Bronze tier부터 필수.
- 구현 예산: ~15시간 (직접 복사 1h + 패턴 참조 7h + 신규 작성 7h).

**Alternatives Rejected**:
- Prometheus만: trace-level 추적 불가. LLM 호출별 토큰/비용 분석 불가.
- LangFuse만: 집계 메트릭/알림 기능 부족. Grafana 대시보드 연동 불가.
- OpenTelemetry: 설정 복잡도 높음, 1주 스프린트에 비해 오버헤드.

---

### ADR-4: Gemini Free Tier + 토큰 최적화 vs Paid Tier

**Status**: Accepted

**Context**: LLM API 비용을 어떻게 관리할 것인가.

**Decision**: 프로덕션에서 **Gemini API free tier** (gemini-2.5-flash) 사용. 토큰 최적화로 free tier 한도 내 운영.

**Rationale**:
- 비용 0원 운영이 포트폴리오 프로젝트에 적합.
- gemini-2.5-flash free tier: 10 RPM, 250K TPM, 500 RPD.
- 배치 프롬프트로 N개 문제를 1회 LLM 호출로 처리 (개별 호출 금지).
- 파이프라인 1회(5문제): 최적 2회, 최악 7회 LLM 호출 → 10 RPM 내 안전.
- 일일 한도: 500 RPD ÷ 3~7회/요청 = 하루 71~166개 생성 요청 가능.
- Rate Limiter(token bucket + exponential backoff)로 429 방지.
- 전 Agent 동일 모델(gemini-2.5-flash): Critic의 정답 정확성 5/5 검증에 동등 이상 추론 능력 필요.

**Consequences**:
- Rate Limiter 구현 필수 (`ai/llm/rate_limiter.py`).
- 10 RPM이 실질 병목 → 파이프라인 최소 12초 소요.
- Free tier 데이터 프라이버시 주의 (Google 제품 개선에 사용 가능).
- LLM_PROVIDER 환경변수로 Ollama/Gemini 즉시 전환 가능 (LLM-agnostic).

**Alternatives Rejected**:
- Gemini paid tier: 비용 발생. 포트폴리오 프로젝트에 불필요.
- OpenAI/Claude: 무료 티어 없음 또는 제한적.
- Ollama only: 프로덕션 배포 시 서버 GPU 필요.

---

### ADR-5: operation 앱 + MongoDB 제거

**Status**: Accepted

**Context**: 기존 `apps/operation/`과 MongoDB 서비스를 유지할 것인가.

**Decision**: 둘 다 제거.

**Rationale**:
- `apps/operation/`: API 0개, 다른 앱에서 참조 0건. 죽은 코드. `examonline/urls.py:29`에서 이미 주석 처리됨.
- MongoDB: `docker-compose.yml:21-37`에 서비스 정의만 있고, Django 코드에서 실제 사용 0건. pymongo import도 없음. health check 외 참조 없음.
- 스택 단순화로 인프라 복잡도 감소. Docker build/start 시간 단축.
- PostgreSQL + pgvector로 벡터 DB 요구사항 충족. MongoDB 역할 없음.

**Consequences**:
- `config/base.py:34` INSTALLED_APPS에서 `"operation"` 제거.
- `docker-compose.yml`에서 `mongodb` 서비스, `mongodb_data` 볼륨, `backend` MongoDB 환경변수 제거.
- `pyproject.toml`에서 `pymongo` 의존성 제거.
- `values.yaml:179-183` ConfigMap에서 MongoDB 설정 제거.
- 기존 테스트 영향: 0건 (operation 관련 테스트 없음).

**Alternatives Rejected**:
- MongoDB 유지하여 로그 저장소로 활용: 현재 사용하지 않으며, 추후 필요 시 재추가 가능.
- operation 앱 리팩토링: API 0개이므로 리팩토링 대상 아님.
