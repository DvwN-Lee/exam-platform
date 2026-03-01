# AI Exam Agent - Business Requirements Document

> **Version**: 1.0 (Scrum 합의 완료)
> **Date**: 2026-03-02
> **Status**: PO + Tech Lead + Market Analyst 합의 완료
> **Timeline**: 1주 집중 개발 (agent-teams + subagent 자동화)
> **Reviewers**: PO Agent, Tech Lead, Market Analyst

---

## 1. Vision & Goals

### 1.1 Vision

교사가 시험 문제를 수작업으로 출제하는 기존 프로세스를 AI Agent가 보조하여, 교사의 최종 승인 하에 교재 기반 자동 출제 + Multi-Agent 품질 보증 + 교사 피드백 학습 루프를 갖춘 **AI-Operated Exam Platform**을 구축한다.

### 1.2 Strategic Goals

| Goal | Description | Portfolio Impact |
|------|-------------|------------------|
| G1 | LangGraph 기반 Multi-Agent 출제 파이프라인 구현 | LangGraph + Multi-Agent 설계 역량 증명 |
| G2 | pgvector RAG로 교재 기반 문제 생성 | RAG Pipeline 직접 구현 경험 |
| G3 | Self-critique 패턴으로 AI 출력 품질 자동 보증 | Multi-Agent 패턴 실무 적용 |
| G4 | Human-in-the-loop 교사 피드백 반영 | Production AI 시스템의 핵심 패턴 |
| G5 | 기존 957개 테스트 체계 유지하며 AI 레이어 추가 | 기존 코드 품질을 훼손하지 않는 확장 능력 |

### 1.3 Differentiators (기존 edu-platform 대비)

기존 교육 플랫폼(Classum, Elice, 뤼튼 등)과의 차별점:

1. **Multi-Agent 아키텍처**: 단일 LLM 호출이 아닌, Generator → Critic → Refiner 멀티 에이전트 파이프라인
2. **RAG 기반 교재 매핑**: 교재/노트를 벡터화하여 해당 내용에 정확히 매핑된 문제 생성
3. **Self-critique 품질 보증**: AI가 생성한 문제를 다른 AI Agent가 자동 검수 (교육학적 타당성, 난이도 적절성, 정답 정확성)
4. **교사 피드백 학습 루프**: 교사의 승인/거부/수정 이력이 향후 생성 품질에 반영되는 RLHF 유사 패턴
5. **LLM-agnostic 설계**: 로컬(Ollama) ↔ 클라우드(Claude API) 전환 가능한 어댑터 패턴
6. **MCP 생태계 활용 경험**: Claude Code MCP 서버 연동(GitHub, Playwright, Context7 등) 경험을 바탕으로 AI Agent 도구화 역량 증명

---

## 2. Problem Statement

### 2.1 현재 문제

교사가 시험 문제를 출제하는 기존 프로세스의 비효율:

| 문제 | 현재 상태 | 영향 |
|------|-----------|------|
| 출제 시간 | 시험지 1개당 평균 2-3시간 수작업 | 교사의 핵심 업무(교육) 시간 감소 |
| 문제 품질 편차 | 교사별 출제 역량 차이 | 학생 평가의 공정성 저하 |
| 교재 커버리지 | 수동 검토로 교재 범위 누락 가능 | 학습 평가의 완전성 부족 |
| 중복 문제 | 기존 문제 DB 확인 없이 출제 | 시험 문제 풀(pool) 효율성 저하 |
| 난이도 조절 | 감(感)에 의존한 난이도 설정 | 시험 난이도 일관성 부족 |

### 2.2 목표 상태

AI Agent 도입 후:

| 문제 | 목표 상태 | 측정 지표 |
|------|-----------|-----------|
| 출제 시간 | 5분 이내 (교재 업로드 → 문제 생성 → 교사 검토) | 출제 소요 시간 90% 단축 |
| 문제 품질 | Self-critique Agent가 자동 검수 | Critic 통과율 80% 이상 |
| 교재 커버리지 | RAG로 교재 내용 자동 매핑 | 교재 챕터별 문제 커버리지 추적 |
| 중복 방지 | 기존 DB 유사도 검사 자동화 | 유사도 85% 이상 문제 자동 제외 |
| 난이도 조절 | 블룸 택소노미 기반 체계적 난이도 분류 | 난이도별 분포 시각화 |

---

## 3. Target Users & Personas

### 3.1 Primary: 교사 (Teacher)

```
이름: 김교수
역할: 컴퓨터과학과 교수
Pain Point: 매 학기 중간/기말고사 문제를 새로 출제하는 데 주말을 투자
Want: 교재 내용 기반으로 AI가 초안을 생성하면 검토만 하고 싶음
Tech Level: API나 AI 도구에 대한 이해 낮음, 간단한 UI 선호
```

### 3.2 Secondary: 학생 (Student)

```
이름: 이학생
역할: 2학년 학생
Pain Point: 시험 범위에 맞는 연습 문제가 부족
Want: 교재 기반 모의고사를 자동으로 생성받고 싶음
Interaction: AI 출제 기능을 직접 사용하지 않음 (교사가 생성 → 시험으로 배포)
```

### 3.3 Tertiary: 시스템 운영자 (Platform)

```
역할: AI Agent 파이프라인 모니터링
Interaction: LLM 호출 비용 추적, 생성 품질 대시보드, 장애 대응
```

---

## 4. Feature Requirements

### F1: AI 문제 자동 생성

**Epic**: 교사가 과목, 범위, 난이도를 지정하면 AI가 문제를 자동 생성한다.

**Business Need**: 출제 시간 90% 단축, 교재 내용에 정확히 매핑된 문제 생성

**Core Capabilities**:

1. **교재 업로드 및 벡터화**
   - PDF/텍스트 교재 업로드
   - 청킹(Chunking) → 임베딩 → pgvector 저장
   - 챕터/섹션 메타데이터 보존

2. **RAG 기반 문제 생성**
   - 교사가 지정한 범위의 교재 내용을 검색
   - 검색된 컨텍스트 + 프롬프트 → LLM 문제 생성
   - 문제 유형 3종 지원: 객관식(xz), 주관식(pd), 빈칸채우기(tk)

3. **LangGraph State Machine**
   - 상태: 입력 검증 → 교재 검색 → 문제 생성 → 품질 검사 → 결과 반환
   - 각 상태 전환에서 조건부 라우팅 (품질 미달 시 재생성)
   - 최대 3회 재생성 후 교사에게 수동 검토 요청

4. **LLM Provider 어댑터**
   - 로컬 개발: Ollama (llama3.2 또는 동등 무료 모델)
   - 프로덕션 배포: Claude API (claude-sonnet-4-6)
   - 환경 변수로 전환: `LLM_PROVIDER=ollama|claude`

**User Stories**:
- US-1.1a: 교사로서 과목과 챕터 범위를 선택하여 문제 생성 요청을 제출할 수 있다
- US-1.1b: 교사로서 요청 제출 후 RAG가 교재에서 관련 컨텍스트를 자동 수집한 결과를 확인할 수 있다
- US-1.1c: 교사로서 수집된 컨텍스트 기반으로 지정한 수(5-20개)의 문제가 생성된 결과를 확인할 수 있다
- US-1.2: 교사로서 생성할 문제의 유형(객관식/주관식/빈칸채우기) 비율을 지정할 수 있다
- US-1.3: 교사로서 난이도(쉬움/보통/어려움) 분포를 지정할 수 있다
- US-1.4: 교사로서 교재 PDF를 업로드하면 벡터화 진행 상태를 확인할 수 있다
- US-1.5: 교사로서 생성된 문제가 교재의 어느 부분을 참조했는지 출처를 확인할 수 있다

**Acceptance Criteria**:
- [ ] 문제 유형 3종 모두 생성 가능
- [ ] 교재 업로드 → 벡터화 → 검색 → 생성 전체 파이프라인 동작
- [ ] 기존 문제 DB와 유사도 85% 이상(cosine similarity of embeddings)인 문제 자동 제외
- [ ] 생성 소요 시간 60초 이내 (5문제, Ollama, Apple Silicon M시리즈 기준)
- [ ] 생성된 문제가 기존 TestQuestionInfo 모델과 호환

---

### F2: Multi-Agent 품질 보증 (Self-critique)

**Epic**: AI가 생성한 문제를 별도의 Critic Agent가 자동 검수하여 품질을 보증한다.

**Business Need**: AI 생성물의 품질 편차를 자동으로 필터링하여 교사 검토 부담 감소

**Core Capabilities**:

1. **Critic Agent**
   - 생성된 문제를 독립적으로 평가
   - 평가 기준: 교육학적 타당성, 정답 정확성, 난이도 적절성, 문장 품질
   - 각 기준별 1-5점 스코어링

2. **품질 기준 (Quality Gate)**
   ```
   통과 조건:
   - 정답 정확성: 5/5 (필수, 정답이 틀리면 무조건 탈락)
   - 교육학적 타당성: 3/5 이상
   - 난이도 적절성: 3/5 이상
   - 문장 품질: 3/5 이상
   - 총점: 14/20 이상
   ```

3. **Self-critique Loop**
   ```
   Generator → Critic → Score < 14 → Refiner → Critic → ... (최대 3회)
                       → Score >= 14 → Pass → 교사 검토 대기열
   ```

4. **품질 리포트**
   - 생성된 문제 배치(batch)별 품질 통계
   - 탈락 사유 분석 (어떤 기준에서 가장 많이 탈락했는지)

**User Stories**:
- US-2.1: 교사로서 품질 검사를 통과한 문제만 검토 목록에서 볼 수 있다
- US-2.2: 교사로서 AI가 검수한 품질 점수와 상세 평가를 확인할 수 있다
- US-2.3: 교사로서 품질 기준을 조정할 수 있다 (예: 정답 정확성 기준 완화/강화)

**Acceptance Criteria**:
- [ ] Critic Agent가 4개 기준으로 독립 평가 수행
- [ ] 기준 미달 문제는 자동으로 Refiner에게 전달
- [ ] 최대 3회 재생성 후에도 미달 시 교사에게 수동 검토 알림
- [ ] 품질 점수가 문제 목록에 표시됨

---

### F3: 교사 피드백 학습 루프

**Epic**: 교사가 AI 생성 문제를 승인/거부/수정하면, 그 피드백이 향후 생성 품질에 반영된다.

**Business Need**: 사용할수록 교사의 출제 스타일에 맞춰 정확도가 향상되는 시스템

**Core Capabilities**:

1. **피드백 수집**
   - 교사 액션: 승인(Approve) / 거부(Reject) / 수정 후 승인(Edit & Approve)
   - 거부 시 사유 기록 (자유 텍스트 또는 카테고리 선택)
   - 수정 시 원본 vs 수정본 diff 저장

2. **피드백 반영 메커니즘**
   - 승인된 문제: 품질 기준의 긍정 예시로 저장
   - 거부된 문제 + 사유: 프롬프트의 네거티브 예시로 반영
   - 수정된 문제: 원본→수정본 diff를 Few-shot 예시로 활용
   - 피드백 데이터는 pgvector에 별도 컬렉션으로 저장

3. **학습 루프 구조**
   ```
   교사 피드백 → 피드백 DB 저장
                → 다음 생성 시 피드백 기반 프롬프트 보강
                → 유사 유형 문제 생성 품질 향상
   ```

4. **피드백 대시보드**
   - 교사별 승인/거부/수정 비율 추이
   - AI 생성 품질 개선 트렌드 (시간에 따른 승인율 변화)

**User Stories**:
- US-3.1: 교사로서 AI 생성 문제를 한 줄씩 검토하며 승인/거부/수정할 수 있다
- US-3.2: 교사로서 거부 시 사유를 선택하거나 직접 입력할 수 있다
- US-3.3: 교사로서 수정 후 승인하면 원본과 수정본이 모두 저장된다
- US-3.4: 교사로서 AI 생성 품질의 개선 추이를 대시보드에서 확인할 수 있다
- US-3.5: 교사로서 이전에 거부/수정한 유형의 문제가 다음 생성 시 피드백 기반 프롬프트에 반영된 것을 확인할 수 있다

**Acceptance Criteria**:
- [ ] 승인/거부/수정 3가지 액션 UI 동작
- [ ] 거부 사유 기록 및 저장
- [ ] 수정 시 원본-수정본 diff 저장
- [ ] 피드백 데이터가 다음 생성 프롬프트에 반영됨 (피드백 후 생성된 프롬프트에 few-shot 예시 포함 여부로 검증)
- [ ] 교사별 승인율 추이 차트 표시

---

## 5. System Architecture

### 5.1 기존 시스템 현황

```
[현재 exam-platform]

Django 5.2 (Backend)
├── apps/user/          (UserProfile, StudentsInfo, TeacherInfo, SubjectInfo)
├── apps/testquestion/  (TestQuestionInfo, OptionInfo)
├── apps/testpaper/     (TestPaperInfo, TestPaperTestQ, TestScores)
├── apps/examination/   (ExaminationInfo, ExamPaperInfo, ExamStudentsInfo)
└── apps/operation/     (운영 관련)

React 19 + TypeScript (Frontend)
├── features/questions/      (문제 CRUD)
├── features/testpapers/     (시험지 관리)
├── features/examinations/   (시험 일정)
├── features/exams/          (시험 응시)
├── features/dashboard/      (대시보드)
└── features/analytics/      (분석)

Infrastructure
├── PostgreSQL 18 + MongoDB 8 + Redis 8
├── GCP K3s + Terraform + ArgoCD
├── Prometheus + Grafana + Loki
└── Istio (mTLS)
```

### 5.2 통합 아키텍처 (AI 레이어 추가)

```
[AI-Operated Exam Platform]

                    ┌─────────────────────────────────┐
                    │         React 19 Frontend        │
                    │  ┌───────────┐  ┌──────────────┐ │
                    │  │ 기존 UI   │  │ AI 출제 UI   │ │
                    │  │(questions,│  │(생성, 리뷰,  │ │
                    │  │ testpaper,│  │ 피드백,      │ │
                    │  │ exams)    │  │ 대시보드)    │ │
                    │  └───────────┘  └──────────────┘ │
                    └──────────┬──────────┬────────────┘
                               │          │
                    ┌──────────▼──────────▼────────────┐
                    │      Django 5.2 Backend (DRF)     │
                    │  ┌───────────┐  ┌──────────────┐ │
                    │  │ 기존 API  │  │ AI API       │ │
                    │  │(/api/*)   │  │(/api/v1/ai/*)   │ │
                    │  └───────────┘  └──────┬───────┘ │
                    │                        │         │
                    │  ┌─────────────────────▼───────┐ │
                    │  │    AI Service Layer          │ │
                    │  │  ┌──────────────────────┐   │ │
                    │  │  │  LangGraph Pipeline   │   │ │
                    │  │  │  ┌───────┐ ┌───────┐ │   │ │
                    │  │  │  │Genera-│→│Critic │ │   │ │
                    │  │  │  │tor    │ │Agent  │ │   │ │
                    │  │  │  └───────┘ └───┬───┘ │   │ │
                    │  │  │      ↑         │     │   │ │
                    │  │  │  ┌───┴───┐ ┌───▼───┐ │   │ │
                    │  │  │  │Refiner│←│Quality│ │   │ │
                    │  │  │  │       │ │Gate   │ │   │ │
                    │  │  │  └───────┘ └───────┘ │   │ │
                    │  │  └──────────────────────┘   │ │
                    │  │  ┌──────────┐ ┌──────────┐  │ │
                    │  │  │RAG      │ │Feedback  │  │ │
                    │  │  │Service  │ │Service   │  │ │
                    │  │  └────┬────┘ └────┬─────┘  │ │
                    │  └───────┼────────────┼────────┘ │
                    └──────────┼────────────┼──────────┘
                               │            │
                    ┌──────────▼────────────▼──────────┐
                    │        PostgreSQL 18              │
                    │  ┌──────────┐  ┌──────────────┐  │
                    │  │기존 테이블│  │pgvector      │  │
                    │  │(User,    │  │(교재 임베딩, │  │
                    │  │ Question,│  │ 피드백 벡터) │  │
                    │  │ Paper,   │  │              │  │
                    │  │ Exam)    │  │              │  │
                    │  └──────────┘  └──────────────┘  │
                    └──────────────────────────────────┘
                               │
                    ┌──────────▼──────────────────────┐
                    │        LLM Provider              │
                    │  ┌──────────┐  ┌──────────────┐  │
                    │  │ Ollama   │  │ Claude API   │  │
                    │  │ (Local)  │  │ (Production) │  │
                    │  └──────────┘  └──────────────┘  │
                    └──────────────────────────────────┘
```

### 5.3 API Contract

AI 관련 API 엔드포인트 정의. 병렬 개발 시 Frontend/Backend 간 인터페이스 역할.

#### 교재 관리

```
POST   /api/v1/ai/materials/upload/
       Request:  multipart/form-data { file: PDF, subject_id: int, metadata: {...} }
       Response: { id: int, filename: str, chunk_count: int, status: "processing"|"ready" }

GET    /api/v1/ai/materials/
       Response: [ { id, filename, subject, chunk_count, status, created_at } ]

GET    /api/v1/ai/materials/{id}/
       Response: { id, filename, subject, chunk_count, chunks: [...], status, created_at }

DELETE /api/v1/ai/materials/{id}/
```

> **Pagination**: 목록 API(materials, generate history)는 기존 DRF 페이지네이션 설정을 따른다.
> `?page=1&page_size=20` 쿼리 파라미터, `PageNumberPagination` 사용.

#### 문제 생성

```
POST   /api/v1/ai/generate/
       Request:  {
           subject_id: int,
           material_ids: [int],        // 참조할 교재
           question_count: int,        // 생성할 문제 수 (1-20)
           type_distribution: {        // 유형 비율
               "xz": 0.6,             // 객관식 60%
               "pd": 0.3,             // 주관식 30%
               "tk": 0.1              // 빈칸채우기 10%
           },
           difficulty_distribution: {  // 난이도 비율
               "jd": 0.3,             // 쉬움 30%
               "zd": 0.5,             // 보통 50%
               "kn": 0.2              // 어려움 20%
           }
       }
       Response: {
           generation_id: uuid,
           status: "generating",
           estimated_time: int         // 예상 소요 시간(초)
       }

GET    /api/v1/ai/generate/{generation_id}/
       Response: {
           status: "generating"|"reviewing"|"completed"|"failed",
           questions: [
               {
                   temp_id: uuid,
                   name: str,                    // 문제 제목
                   content: str,                 // 문제 본문
                   tq_type: "xz"|"pd"|"tk",
                   tq_degree: "jd"|"zd"|"kn",
                   options: [                    // 객관식인 경우
                       { option: str, is_right: bool }
                   ],
                   answer: str,                  // 주관식/빈칸채우기 정답
                   source_reference: {           // 교재 출처
                       material_id: int,
                       chunk_text: str,          // 참조한 원문 (일부)
                       page_number: int|null
                   },
                   quality_score: {              // Critic 평가 결과
                       accuracy: int,            // 정답 정확성 (1-5)
                       pedagogical: int,         // 교육학적 타당성 (1-5)
                       difficulty: int,          // 난이도 적절성 (1-5)
                       clarity: int,             // 문장 품질 (1-5)
                       total: int,               // 총점 (4-20)
                       passed: bool
                   },
                   critique_rounds: int          // Self-critique 횟수
               }
           ],
           stats: {
               total_generated: int,
               passed: int,
               failed: int,
               avg_quality_score: float
           }
       }
```

#### 교사 피드백

```
POST   /api/v1/ai/feedback/
       Request:  {
           generation_id: uuid,
           temp_id: uuid,              // 문제 임시 ID
           action: "approve"|"reject"|"edit",
           reject_reason: str|null,    // 거부 사유 (reject 시)
           edited_content: {           // 수정 내용 (edit 시)
               name: str|null,
               content: str|null,
               options: [...]|null,
               answer: str|null,
               tq_degree: str|null
           }
       }
       Response: {
           feedback_id: int,
           question_id: int|null,      // approve/edit 시 TestQuestionInfo ID
           status: "saved"
       }

GET    /api/v1/ai/feedback/stats/
       Response: {
           total_generated: int,
           approved: int,
           rejected: int,
           edited: int,
           approval_rate: float,
           trend: [                    // 일별 승인율 추이
               { date: str, approval_rate: float, count: int }
           ]
       }
```

---

## 6. Data Requirements

### 6.1 신규 모델 (apps/ai/)

```python
# 교재 자료
class MaterialInfo(Model):
    subject: FK(SubjectInfo)
    filename: CharField
    file: FileField
    chunk_count: IntegerField
    status: CharField  # "processing", "ready", "error"
    uploaded_by: FK(UserProfile)
    created_at: DateTimeField

# 교재 청크 (pgvector)
class MaterialChunk(Model):
    material: FK(MaterialInfo)
    content: TextField
    embedding: VectorField(dimensions=1536)  # pgvector
    page_number: IntegerField(null=True)
    chunk_index: IntegerField
    metadata: JSONField

# AI 생성 요청
class GenerationRequest(Model):
    subject: FK(SubjectInfo)
    requested_by: FK(UserProfile)
    question_count: IntegerField
    type_distribution: JSONField
    difficulty_distribution: JSONField
    material_ids: JSONField  # [int]
    status: CharField  # "generating", "reviewing", "completed", "failed"
    created_at: DateTimeField
    completed_at: DateTimeField(null=True)

# AI 생성 문제 (검토 전 임시 저장)
class GeneratedQuestion(Model):
    generation: FK(GenerationRequest)
    temp_id: UUIDField
    name: CharField
    content: TextField
    tq_type: CharField  # xz, pd, tk
    tq_degree: CharField  # jd, zd, kn
    options: JSONField  # [{option, is_right}]
    answer: TextField(null=True)
    source_chunk: FK(MaterialChunk, null=True)
    quality_score: JSONField  # {accuracy, pedagogical, difficulty, clarity, total}
    critique_rounds: IntegerField
    passed_quality_gate: BooleanField
    created_at: DateTimeField

# 교사 피드백
class TeacherFeedback(Model):
    generated_question: FK(GeneratedQuestion)
    teacher: FK(UserProfile)
    action: CharField  # "approve", "reject", "edit"
    reject_reason: TextField(null=True)
    original_content: JSONField(null=True)  # 수정 전 원본
    edited_content: JSONField(null=True)    # 수정 후 내용
    saved_question: FK(TestQuestionInfo, null=True)  # 승인/수정 시 실제 저장된 문제
    feedback_embedding: VectorField(dimensions=1536, null=True)  # 피드백 벡터화
    created_at: DateTimeField
```

### 6.2 기존 모델 변경

기존 모델은 변경하지 않는다. AI 생성 문제가 교사에 의해 승인되면 기존 `TestQuestionInfo`로 변환하여 저장한다. 이렇게 하면 기존 957개 테스트가 깨지지 않는다.

```
GeneratedQuestion (AI 임시) → approve → TestQuestionInfo (기존 모델)
                            → 기존 시험지/시험 시스템과 완전 호환
```

---

## 7. Parallel Development Tracks

> **Status**: Scrum 합의 완료 — 전략 1 (Frontend/Backend 완전 분리) 채택
> **결정 근거**: Tech Lead 실사 기반. 파일 충돌 0건, monorepo 구조(examonline/ vs frontend/)와 자연스럽게 정합.

### 7.1 분리 원칙

- 2개 worktree가 동시에 비동기적으로 구현 진행
- 각 worktree는 서로 다른 디렉토리를 소유하여 merge 시 충돌 0건
- API Contract (Section 5.3)가 worktree 간 인터페이스 역할

### 7.2 확정 전략: Frontend / Backend 완전 분리

**Worktree A: `feature/ai-backend` (examonline/ 전용)**
```
소유 파일:
  NEW:    examonline/apps/ai/                (전체 - models, views, serializers, services, tests, migrations)
  MODIFY: examonline/config/base.py          (INSTALLED_APPS에 'ai' 추가)
  MODIFY: examonline/examonline/urls.py      (ai URL include 추가)
  MODIFY: examonline/pyproject.toml          (langgraph, django-pgvector, pdfplumber, sentence-transformers, celery 추가)
  MODIFY: examonline/conftest.py             (AI 테스트 fixture 추가)

담당: F1(AI 생성) + F2(Self-critique) + F3 Backend(피드백 API)
테스트: pytest apps/ai/ (LLM mock, pgvector 테스트 DB)
```

**Worktree B: `feature/ai-frontend` (frontend/ 전용)**
```
소유 파일:
  NEW:    frontend/src/features/ai/          (GeneratePage, ReviewPage, FeedbackDashboard, components/)
  NEW:    frontend/src/api/ai.ts             (AI API 클라이언트 - Section 5.3 Contract 기반)
  NEW:    frontend/src/types/ai.ts           (AI 타입 정의)
  MODIFY: frontend/src/App.tsx               (AI 라우트 추가)
  MODIFY: frontend/src/components/layout/    (사이드바 AI 메뉴 추가)
  NEW:    frontend/src/__tests__/features/ai/ (Vitest 테스트)

담당: F1+F2+F3 Frontend (생성 UI, 리뷰 UI, 피드백 대시보드)
테스트: MSW로 API mock하여 독립 테스트
```

**파일 소유권 중복: 0건** (examonline/ vs frontend/ 물리적 분리)

### 7.3 개발 일정과 통합

```
Day 1-5: Worktree A(Backend) + Worktree B(Frontend) 동시 개발
Day 6:   merge → integration test (실제 API 연동 검증)
Day 7:   E2E test + 문서화 + 포트폴리오 정리
```

### 7.4 기각된 전략

| 전략 | 기각 사유 |
|------|-----------|
| 전략 2: Feature 단위 | apps/ai/ models.py, urls.py 등 최소 4건 파일 충돌. 충돌 0건 목표 위배 |
| 전략 3: Core/Integration | AI Core가 Django 모델에 의존하여 독립 실행 불가. 실질적 병렬성 부족 |

---

## 8. Non-Functional Requirements

### 8.0 Technical Constraints (Scrum 합의)

다음은 Tech Lead 리뷰에서 도출된 기술적 제약이며, 구현 시 반드시 준수해야 한다.

1. **비동기 처리: Celery worker 필수**
   - Django 뷰는 동기(sync) 유지. POST /api/v1/ai/generate/는 generation_id만 즉시 반환
   - LangGraph 파이프라인은 Celery worker에서 실행 (Django request cycle 밖)
   - 클라이언트는 GET polling으로 결과 확인
   - pyproject.toml에 `celery` 또는 `django-q2` 명시 필수

2. **AI import lazy 처리**
   - LangGraph, pgvector 등 heavy import가 Django 시작 시점에 실패하면 전체 테스트 붕괴
   - apps/ai/apps.py의 ready()에서 heavy import 금지
   - 실제 호출 시점에 import (runtime lazy import)

3. **pgvector 버전 핀**
   - pgvector >= 0.8.2 사용 필수 (CVE-2026-3172 수정 버전)
   - 테스트 DB에서 CREATE EXTENSION vector 자동 실행 설정 필요

### 8.1 Performance

| 지표 | 목표 | 비고 |
|------|------|------|
| 문제 생성 응답 시간 | 60초 이내 (5문제, Ollama) | 비동기 처리, polling 방식 |
| 교재 업로드 → 벡터화 | 120초 이내 (50페이지 PDF) | Background Task (Celery/Django-Q) |
| RAG 검색 응답 | 2초 이내 | pgvector HNSW 인덱스 |
| API 응답 시간 (CRUD) | 200ms 이내 | 기존 성능 기준 유지 |

### 8.2 Reliability

| 요구사항 | 설명 |
|----------|------|
| LLM 장애 대응 | Ollama 또는 Claude API 장애 시 graceful degradation (수동 출제로 fallback) |
| 데이터 일관성 | AI 생성 중 서버 재시작 시 GenerationRequest 상태 복구 |
| 기존 기능 무중단 | AI 레이어 추가가 기존 957개 테스트에 영향 없음 |

### 8.3 Security

| 요구사항 | 설명 |
|----------|------|
| API Key 관리 | Claude API Key는 External Secrets로 관리 (기존 패턴 활용) |
| 교재 접근 권한 | 교재는 업로드한 교사 + 같은 과목 교사만 접근 가능 |
| AI 생성 이력 | 모든 생성 요청과 피드백은 감사 로그로 보존 |

### 8.4 Testability

| 레이어 | 전략 |
|--------|------|
| AI Pipeline Unit Test | LLM 호출을 mock하여 LangGraph 상태 전환 검증 |
| RAG Integration Test | 테스트용 소규모 벡터 DB로 검색 정확도 검증 |
| API Test | 기존 pytest 체계와 동일한 패턴 |
| E2E Test | Playwright로 교재 업로드 → 생성 → 검토 → 승인 전체 흐름 |

---

## 9. Constraints & Assumptions

### 9.1 Constraints

| 제약 | 설명 |
|------|------|
| 1주 개발 기간 | Agent-teams + subagent 자동화로 구현 속도 극대화 |
| 기존 테스트 유지 | 957개 테스트 중 0개 실패 허용 |
| Django 5.2 유지 | 기존 ORM, Admin, TDD 생태계 활용 |
| 로컬 무료 LLM | 개발 시 비용 0원 (Ollama) |
| PostgreSQL 단일 인스턴스 | 기존 DB에 pgvector extension 추가 |

### 9.2 Assumptions

| 가정 | 검증 필요 여부 |
|------|---------------|
| pgvector가 PostgreSQL 18에서 동작 | 확인 필요 |
| Ollama가 M-시리즈 Mac에서 충분한 성능 제공 | 로컬 테스트로 확인 |
| 교재 PDF 파싱이 PyPDF2/pdfplumber로 충분 | 복잡한 수식/표가 있는 PDF는 제한될 수 있음 |
| LangGraph + Django 통합에 기술적 장벽 없음 | PoC로 확인 |

---

## 10. MVP Scope (1주)

### 10.0 Scope Ladder

시간 제약에 따른 단계별 목표. Bronze가 최소 완료 기준이며, Gold가 이상적 목표이다.

| Tier | 포함 범위 | 포트폴리오 임팩트 |
|------|-----------|-------------------|
| **Bronze** (최소) | F1(AI 생성) 동작 + 기존 테스트 100% 유지 | "LLM Wrapper" 수준, 차별성 부족 |
| **Silver** (목표) | F1 + F2(Self-critique) + 기본 UI | Multi-Agent 패턴 증명, 핵심 차별점 확보 |
| **Gold** (이상적) | F1 + F2 + F3(피드백 루프) + 대시보드 + 신규 테스트 50개+ | 완전한 HITL 서사, 최적 포트폴리오 |

> **Priority**: 시간 부족 시 F3보다 F2에 집중한다. F2(Self-critique)가 포트폴리오에서 가장 강력한 차별점이다.

### 10.1 Must-have (Sprint Goal)

| Day | 목표 | 산출물 |
|-----|------|--------|
| 1 | 프로젝트 구조 설정 + LangGraph PoC | apps/ai/ 스캐폴딩, LangGraph 기본 파이프라인 |
| 2 | RAG Pipeline 구현 | pgvector 설정, 교재 업로드 → 청킹 → 임베딩 |
| 3 | AI 문제 생성 API | 문제 생성 엔드포인트, Ollama 연동 |
| 4 | Self-critique Agent | Critic Agent, Quality Gate, 재생성 루프 |
| 5 | 교사 피드백 시스템 | 피드백 API + 프롬프트 반영 로직 |
| 6 | Frontend AI UI | 생성 화면, 리뷰 화면, 대시보드 통합 |
| 7 | 통합 테스트 + 문서화 | E2E 테스트, README 업데이트, 포트폴리오 정리 |

### 10.2 Nice-to-have (Backlog)

| 항목 | 우선순위 | 비고 |
|------|----------|------|
| K8s Ops Agent (Prometheus/Loki MCP) | P2 | GCP 배포 이후 |
| 학습 분석 Agent (성적 패턴 → 맞춤 문제 추천) | P3 | 데이터 축적 필요 |
| GCP 배포 + ArgoCD 통합 | P2 | 로컬 MVP 완료 후 |
| Claude API 전환 + A/B 테스트 | P2 | 배포 시 |
| 블룸 택소노미 기반 난이도 자동 분류 | P3 | 교육학 도메인 지식 필요 |

---

## 11. Success Metrics

### 11.1 기술 지표

| 지표 | 목표 | 측정 방법 |
|------|------|-----------|
| 기존 테스트 통과율 | 100% (957/957) | pytest --tb=short |
| 신규 AI 테스트 수 | 50개 이상 | pytest apps/ai/ |
| AI 문제 생성 성공률 | 80% 이상 (Quality Gate 통과) | GeneratedQuestion.passed_quality_gate 비율 |
| API 응답 시간 | 기존 API 200ms 유지 | Prometheus 메트릭 |
| 교재 RAG 검색 정확도 | Relevance Score 0.7 이상 | 테스트 쿼리 기반 측정 |

### 11.2 포트폴리오 지표

| 지표 | 목표 | 비고 |
|------|------|------|
| JD 기술 키워드 매칭 | LangGraph, RAG, Multi-Agent, MCP 4개 키워드 커버 | 6개 타겟 기업 JD 공통 키워드 |
| GitHub 레포 기술 스택 가시성 | LangGraph, pgvector, MCP가 README에 표시 | 채용 담당자 역검색 대응 |
| 면접 대화 소재 | 3개 이상의 심층 토론 가능 주제 | Multi-Agent, RAG, RLHF 패턴 |
| 기존 역량 통합 서사 | 웹 개발(957 테스트) + 인프라(K8s) + AI Agent 3중 역량 | 단일 프로젝트에서 입증 |

---

## 12. Portfolio Narrative

### 12.1 프로젝트 스토리

```
Before:
"Django 5.2 + React 19 풀스택 시험 플랫폼. 957개 테스트, 95% 커버리지."
→ 웹 개발 역량은 증명하지만 AI Agent 역량은 0%

After:
"AI Agent가 교재 기반으로 문제를 자동 출제하고,
 Multi-Agent Self-critique로 품질을 보증하며,
 교사 피드백으로 지속 개선되는 AI-Operated Exam Platform."
→ LangGraph + RAG + Multi-Agent + Human-in-the-loop 역량 증명
```

### 12.2 채용 타겟별 매핑

| 기업 | 요구 역량 | 본 프로젝트 대응 |
|------|-----------|------------------|
| **토스 AI Engineer (Platform)** | AI Agent 서빙/운영, 도구화 | LangGraph 파이프라인 + LLM Provider 어댑터 + Celery 비동기 서빙 |
| **업스테이지 AI Agent Engineer** | 문제 해결 과정 중심 이력서 | 3회 재구축(모니터링) + AI Agent 추가의 기술 진화 서사 |
| **카카오 AI 네이티브** | AI 네이티브 인재 | Claude Code로 개발 + AI Agent를 프로덕트에 통합 |
| **라인플러스 AI Agent (Moonshot)** | AI Agent Platform 설계-구현-고도화 | Multi-Agent 아키텍처(Generator/Critic/Refiner) + K8s 운영 |
| **현대오토에버 AI Agent** | MCP, A2A, Agentic AI 아키텍처 | MCP 생태계 실무 경험 (5개 서버 연동), Agent Orchestration |
| **InterXLab AI Agent** | LangGraph, MCP, RAG | LangGraph + RAG + MCP 직접 구현 — JD 키워드 직접 매칭 |

### 12.3 기술 블로그 / README 소재 (역검색 유발력 순)

1. **"LangGraph로 Multi-Agent 시험 출제 파이프라인 구축하기"** — Generator → Critic → Refiner 아키텍처. 모든 타겟 기업 JD 키워드 포함
2. **"MCP 기반 AI Agent 통합 패턴"** — MCP 서버 연동 실무. 현대오토에버/InterXLab 직접 검색 키워드
3. **"pgvector + Django로 RAG 시스템 구현하기"** — 교재 PDF → 벡터화 → 유사도 검색. RAG는 모든 기업 공통 요구
4. **"기존 957개 테스트를 유지하며 AI 레이어 추가하기"** — 레거시 확장의 실전 전략. 대형 서비스 기업에서 높이 평가
5. **"교사 피드백이 AI 출제 품질을 개선하는 방법"** — Human-in-the-loop RLHF 유사 패턴
6. **"Claude Code Agent-Teams로 1주 만에 AI 파이프라인 구축하기"** — 개발 프로세스 자체가 차별점

---

## Appendix: 기술 스택 요약

| Category | Technology | Version | Role |
|----------|-----------|---------|------|
| Backend Framework | Django + DRF | 5.2 | 기존 유지 |
| AI Pipeline | LangGraph | latest | Multi-Agent Orchestration |
| Vector DB | pgvector | latest | RAG 임베딩 저장/검색 |
| LLM (Local) | Ollama | latest | 개발 환경 무료 LLM |
| LLM (Production) | Claude API | claude-sonnet-4-6 | 프로덕션 LLM |
| Embedding | sentence-transformers | latest | 텍스트 임베딩 |
| Task Queue | Celery + Redis | latest | LangGraph 파이프라인 비동기 실행 |
| PDF Parsing | pdfplumber | latest | 교재 PDF 파싱 |
| Frontend | React + TypeScript | 19 | 기존 유지 + AI UI 추가 |
| Database | PostgreSQL + pgvector | 18 | 기존 DB + 벡터 확장 |
| Testing | pytest + Playwright | latest | 기존 체계 확장 |
| Infra | GCP K3s + Terraform | 기존 | 배포 인프라 |
| GitOps | ArgoCD | 기존 | 선언적 배포 |
