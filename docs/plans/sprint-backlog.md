# Sprint Backlog: AI Exam Agent

> **Source**: [BRD v1.3](./2026-03-02-ai-exam-agent-brd.md)
> **Sprint Duration**: 1주 (Day 1-7)
> **Sprint Goal**: Silver Tier (49 SP) — F1 + F2 + F3 핵심 + 2-Layer Observability
> **Worktree 전략**: Frontend/Backend 완전 분리 (2개 worktree 비동기 병렬)

---

## 1. Sprint Context

### 1.1 프로젝트 현황

기존 exam-platform은 Django 5.2 + React 19 풀스택 시험 플랫폼이다.
- Backend: **4개 Django 앱** (user, testquestion, testpaper, examination)
  - operation 앱 제거 완료 (API 0개, 참조 0건 죽은 코드)
- Frontend: 12개 feature 디렉토리 (auth, dashboard, questions 등)
- 테스트: 957개 (Backend 95% 커버리지)
- 인프라: GCP K3s + Terraform + ArgoCD
  - MongoDB 제거 완료 (코드에서 미사용)
  - Prometheus/Grafana 미배포 → 이번 Sprint에서 구현

AI 레이어는 현재 **0%**. 이번 Sprint에서 AI 출제 파이프라인 + Observability를 추가한다.

### 1.2 Scope Ladder (v1.3 재조정)

| Tier | 범위 | SP | 판정 기준 |
|------|------|-----|-----------|
| **Bronze** (27SP) | INF-1~7 + F1 핵심(US-1.1a/b/c, US-1.4) | 27 | AI 생성 + Prometheus 14메트릭 + Grafana |
| **Silver** (49SP) | Bronze + INF-8 + F2(US-2.1/2.2) + F3 핵심(US-3.1/3.2/3.4/3.5L) + UI | 49 | Multi-Agent + HITL + 2-Layer Observability |
| **Gold** | Silver + US-1.5, US-2.3, US-3.3, US-3.5 Full, Alerting, 테스트 50개+ | +20 | 완전한 HITL + 관측성 극대화 |

> **v1.3 변경**: 74SP → 49SP. F3을 20SP→9SP 축소, US-3.5 Lite(2SP)로 HITL 서사 유지.
> 6개 G 목표 모두 Silver에서 증명 가능.

### 1.3 기술 제약 (구현 시 필수 준수)

1. **Celery worker 필수**: Django 뷰는 sync, LangGraph는 Celery에서 실행
2. **AI import lazy 처리**: apps/ai/apps.py의 ready()에서 heavy import 금지
3. **pgvector >= 0.8.2**: CVE-2026-3172 수정 버전 핀 필수
4. **기존 테스트 957개 무중단**: 기존 모델/API 변경 0건
5. **Gemini API Free Tier 제약**:
   - 10 RPM / 250K TPM / 500 RPD — Rate Limiter(exponential backoff) 필수
   - 배치 프롬프트 필수 (개별 문제 호출 금지)
   - 전 Agent 동일 모델(gemini-2.5-flash)
6. **기술 부채 보류**: EmailVerifyRecord, exam_state 하드코딩은 이번 Sprint에서 건드리지 않음

### 1.4 Sprint 전 정리 작업 (SP 비용 없음)

| 작업 | 내용 |
|------|------|
| operation 앱 제거 | config/base.py INSTALLED_APPS에서 제거, urls.py 주석 삭제, apps/operation/ 삭제 |
| MongoDB 제거 | docker-compose.yml에서 mongodb 서비스/볼륨 제거, pyproject.toml pymongo 제거, config에서 MONGODB 블록 제거, health check MongoDB 코드 제거 |

---

## 2. Epic & User Story 목록 (v1.3 재조정)

### Epic 1: AI 문제 자동 생성 (F1) — 14 SP

| ID | User Story | Tier | SP | 비고 |
|----|-----------|------|-----|------|
| US-1.1a | 과목과 챕터 범위를 선택하여 생성 요청 제출 | Bronze | 3 | |
| US-1.1b | RAG가 교재에서 관련 컨텍스트 자동 수집 | Bronze | 4 | 단순화: top-k만, 리랭킹 제거 |
| US-1.1c | 지정한 수(5-20개)의 문제 생성 결과 확인 | Bronze | 4 | 단순화 |
| US-1.4 | 교재 PDF 업로드 → 벡터화 | Bronze | 3 | 진행률 표시 제거, 기본 업로드+벡터화만 |
| US-1.2+1.3 | 유형/난이도 비율 설정 (통합) | Silver | 2 | 단일 폼으로 통합 |
| US-1.5 | 교재 출처 확인 | **Gold** | 2 | 품질 점수 UI에 흡수 가능 |

**Silver까지 F1: 16 SP** / Gold 포함: 18 SP

### Epic 2: Multi-Agent 품질 보증 — Self-critique (F2) — 7 SP

| ID | User Story | Tier | SP | 비고 |
|----|-----------|------|-----|------|
| US-2.1 | 품질 검사 통과 문제만 검토 목록에 표시 | Silver | 5 | Critic + Quality Gate + Refiner |
| US-2.2 | 품질 점수/상세 평가 확인 | Silver | 2 | 간소: 점수 + pass/fail 뱃지만 |
| US-2.3 | 품질 기준 조정 | **Gold** | 3 | |

**Silver까지 F2: 7 SP** / Gold 포함: 10 SP

### Epic 3: 교사 피드백 학습 루프 (F3) — 9 SP

| ID | User Story | Tier | SP | 비고 |
|----|-----------|------|-----|------|
| US-3.1 | 승인/거부/수정 UI + API | Silver | 5 | 피드백 수집 핵심 |
| US-3.2 | 거부 시 사유 입력 | Silver | 2 | US-3.1과 자연스러운 쌍 |
| US-3.4 | AI 통계 (기존 대시보드에 섹션 추가) | Silver | 2 | 별도 페이지 아닌 기존 TeacherDashboard 확장 |
| US-3.5 Lite | 기본 피드백 → 프롬프트 반영 | Silver | 2 | 벡터 검색 없이 최근 거부 사유 직접 삽입 |
| US-3.3 | 원본-수정본 diff 저장 | **Gold** | 3 | |
| US-3.5 Full | 피드백 벡터화 + 유사도 검색 few-shot | **Gold** | +3 | Lite→Full 업그레이드 |

**Silver까지 F3: 11 SP** / Gold 포함: 17 SP

### Infrastructure Stories — 13 SP

| ID | Story | Tier | SP | 비고 |
|----|-------|------|-----|------|
| INF-1 | apps/ai/ 스캐폴딩 + INSTALLED_APPS | Bronze | 1 | |
| INF-2 | pgvector extension + migration | Bronze | 2 | |
| INF-3 | Celery + Redis 설정 | Bronze | 2 | INF-3 단순화 (docker-compose만) |
| INF-4 | LLM Provider 어댑터 + exponential backoff | Bronze | 3 | 복잡한 큐 제거, backoff만 |
| INF-5 | pyproject.toml 의존성 (pymongo 제거 포함) | Bronze | 1 | |
| INF-6 | AI 테스트 fixture | Bronze | 1 | 기본 LLM mock만 |
| INF-7 | Prometheus 14개 메트릭 + Grafana 대시보드 | Bronze | 3 | llm-observation 코드 재사용 |
| INF-8 | LangFuse CallbackHandler | Silver | 2 | fAInancial-agent 패턴 재사용 |

**Bronze INF: 13 SP** / Silver INF: 15 SP

---

## 3. SP 총계

| Tier | Infra | F1 | F2 | F3 | 합계 |
|------|-------|-----|-----|-----|------|
| **Bronze** | 13 | 14 | — | — | **27** |
| **Silver** | +2 | +2 | +7 | +11 | **+22 = 49** |
| **Gold** | — | +2 | +3 | +6 | **+11 = 60** |

---

## 4. Worktree별 Day 계획 (v1.3)

### Worktree A: `feature/ai-backend` (examonline/ 전용)

| Day | Task | Story | SP | AC |
|-----|------|-------|-----|-----|
| 1 | 스캐폴딩 + 모델 + migration + 의존성 | INF-1,2,5 | 4 | `manage.py migrate` 성공 |
| 2 | Celery+Redis + LLM 어댑터 (backoff) | INF-3,4 | 5 | Celery task 실행, LLM_PROVIDER 전환 |
| 3 | 교재 업로드 API + RAG 서비스 + **Prometheus 계측 시작** | US-1.4, US-1.1b, INF-7 | 10 | PDF→청크→pgvector, top-k 검색, /metrics |
| 4 | LangGraph Generator + 생성 API + 유형/난이도 | US-1.1a,c, US-1.2+1.3 | 9 | POST generate → polling → 결과 |
| 5 | Critic Agent + Quality Gate + Refiner | US-2.1 | 5 | 4기준 평가, Score<14 → Refiner |
| 6 | 피드백 API + US-3.5 Lite + LangFuse + 테스트 | US-3.1,3.2, US-3.5L, INF-8, INF-6 | 10 | approve/reject/edit, few-shot 삽입, trace |
| 7 | 957개 테스트 확인 + Grafana 대시보드 JSON | — | 2 | 전체 통과 + 대시보드 완성 |

**Backend 합계: 45 SP** (Day 3-4가 피크, Day 7 버퍼)

### Worktree B: `feature/ai-frontend` (frontend/ 전용)

| Day | Task | Story | SP | AC |
|-----|------|-------|-----|-----|
| 1 | types/ai.ts + api/ai.ts + 라우트/사이드바 | — | 2 | MSW mock 기반 독립 동작 |
| 2 | 교재 업로드 UI + 목록 | US-1.4 | 2 | PDF 업로드 + 목록 표시 |
| 3 | 생성 요청 폼 + polling UI | US-1.1a | 3 | 과목/범위/유형/난이도 설정 |
| 4 | 생성 결과 목록 + 품질 점수 UI | US-1.1c, US-2.2 | 4 | 문제 목록 + 점수 뱃지 |
| 5 | 교사 리뷰 UI (승인/거부/수정) | US-3.1, US-3.2 | 5 | 액션 버튼 + 거부 사유 입력 |
| 6 | TeacherDashboard AI 섹션 + MSW→API 전환 | US-3.4 | 3 | 기존 대시보드에 AI 통계 위젯 |
| 7 | Vitest 테스트 + US-2.2 마무리 | — | 3 | 주요 컴포넌트 테스트 |

**Frontend 합계: 22 SP** (Day 5가 피크, 나머지 여유)

---

## 5. API Contract 요약

| Endpoint | Method | 용도 |
|----------|--------|------|
| `/api/v1/ai/materials/upload/` | POST | 교재 PDF 업로드 |
| `/api/v1/ai/materials/` | GET | 교재 목록 |
| `/api/v1/ai/materials/{id}/` | GET/DELETE | 교재 상세/삭제 |
| `/api/v1/ai/generate/` | POST | 문제 생성 요청 (비동기) |
| `/api/v1/ai/generate/{id}/` | GET | 생성 상태/결과 (polling) |
| `/api/v1/ai/feedback/` | POST | 교사 피드백 (approve/reject/edit) |
| `/api/v1/ai/feedback/stats/` | GET | 피드백 통계 + 승인율 |
| `/metrics` | GET | Prometheus 메트릭 (14개) |

---

## 6. Data Model 요약

```
신규 모델 (apps/ai/):
  MaterialInfo        → 교재 파일 메타데이터
  MaterialChunk       → 교재 청크 + 벡터 임베딩 (pgvector)
  GenerationRequest   → AI 생성 요청 (비동기 상태)
  GeneratedQuestion   → AI 생성 문제 (임시)
  TeacherFeedback     → 교사 피드백 (approve/reject/edit)

데이터 흐름 (AI → 기존 단방향 참조):
  SubjectInfo ◄──FK── MaterialInfo, GenerationRequest
  UserProfile ◄──FK── GenerationRequest, TeacherFeedback
  TestQuestionInfo ◄──FK── TeacherFeedback.saved_question (승인 시에만)

기존 모델 변경: 0건
```

---

## 7. AC 체크리스트 (v1.3)

### Bronze (27 SP)
- [ ] operation 앱 + MongoDB 제거 완료
- [ ] apps/ai/ Django 앱 정상 동작 (migrate, runserver)
- [ ] 교재 PDF 업로드 → 청킹 → pgvector 저장
- [ ] LangGraph 파이프라인으로 문제 3종 생성
- [ ] 생성된 문제가 TestQuestionInfo와 호환 가능
- [ ] Prometheus 14개 메트릭 + `/metrics` 엔드포인트
- [ ] Grafana LLM Overview 대시보드
- [ ] 기존 957개 테스트 전체 통과

### Silver (49 SP) — Sprint Goal
- [ ] Bronze 전체
- [ ] Critic Agent 4개 기준 품질 평가
- [ ] Quality Gate 통과/미달 자동 분류
- [ ] LangFuse CallbackHandler (graceful degradation)
- [ ] 유형/난이도 비율 설정 UI
- [ ] 교사 승인/거부/수정 UI + API
- [ ] 거부 사유 입력
- [ ] TeacherDashboard에 AI 통계 섹션
- [ ] 기본 피드백 → 프롬프트 반영 (US-3.5 Lite)
- [ ] 품질 점수 UI 표시

### Gold
- [ ] Silver 전체
- [ ] 교재 출처 표시 (US-1.5)
- [ ] 품질 기준 조정 (US-2.3)
- [ ] 원본-수정본 diff 저장 (US-3.3)
- [ ] US-3.5 Full (벡터 검색 few-shot)
- [ ] Prometheus Alerting rules
- [ ] LangFuse self-hosted K8s
- [ ] 신규 AI 테스트 50개+

---

## 8. 의존성 관계

```
INF-1 (스캐폴딩) ──→ 모든 Backend Story
INF-2 (pgvector) ──→ US-1.1b (RAG), US-1.4 (벡터화)
INF-3 (Celery)   ──→ US-1.1c (비동기 생성)
INF-4 (LLM 어댑터) ──→ US-1.1c, US-2.1

US-1.4 (교재 업로드) ──→ US-1.1b (RAG 검색)
US-1.1b (RAG)        ──→ US-1.1c (문제 생성)
US-1.1c (문제 생성)   ──→ US-2.1 (품질 검사)
US-2.1 (품질 검사)    ──→ US-3.1 (교사 리뷰)
US-3.1 (교사 리뷰)    ──→ US-3.5 Lite (피드백 반영)

Frontend는 MSW mock으로 Backend 독립 개발.
Day 7 merge 시 실제 API 연동.
```

---

## 9. Risk & Mitigation

| Risk | 확률 | 완화 방안 |
|------|------|-----------|
| LangGraph + Django + Celery 통합 | 중 | Day 3 시작 전 30분 PoC 스파이크 → 막히면 Day 4 carry |
| Gemini free tier rate limit | 중 | exponential backoff + 배치 프롬프트 + Ollama fallback |
| Day 3-4 과부하 (10+9 SP) | 고 | Day 3 carry 허용, Critic을 단순 함수로 먼저 구현 후 LangGraph 통합 |
| pgvector + PG18 호환 | 저 | pgvector >= 0.8.2 핀, Day 1 PoC |
| Merge 충돌 | 저 | examonline/ vs frontend/ 물리적 분리, 충돌 0건 |
| Gemini free tier 정책 변경 | 저 | LLM-agnostic 어댑터로 즉시 전환 가능 |

---

## 10. 아키텍처 변경 요약 (v1.3)

### 제거
- `apps/operation/` (API 0개, 참조 0건)
- MongoDB 서비스 + pymongo 의존성 (코드 미사용)

### 추가
- `apps/ai/` (5개 모델, LangGraph 파이프라인, Celery task)
- Prometheus 14개 메트릭 + Grafana 대시보드
- LangFuse CallbackHandler (graceful degradation)
- Celery Worker 서비스 (docker-compose)

### 데이터 흐름
```
AI → 기존 (단방향 FK 참조)
기존 모델 수정: 0건
기존 API 수정: 0건
기존 테스트 영향: 0건
```
