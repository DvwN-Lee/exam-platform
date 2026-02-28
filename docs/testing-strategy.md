# Testing Strategy

이 프로젝트는 4단계 테스트 피라미드를 기반으로 Python, TypeScript, Go 3개 언어로 총 67개 테스트 파일을 구성한다. 각 레이어는 독립적인 목적과 실행 환경을 가지며, CI/CD 파이프라인과 통합하여 자동화된 품질 검증을 수행한다.

---

## 1. 테스트 피라미드 개요

```
                    [E2E]
              Playwright (31 spec)
            -----------------------
          [Infrastructure Test]
        Terratest Go (11 files)
        --------------------------
      [Frontend Unit]
    Vitest + RTL (9 files)
    ----------------------------
  [Backend Unit/Integration]
pytest (16 files, 957개, 95% 커버리지)
```

| 레이어 | 도구 | 파일 수 | 특징 |
|--------|------|---------|------|
| Backend Unit/Integration | pytest | 16개 (Python) | 957개 테스트, 95% 커버리지 |
| Frontend Unit | Vitest + RTL | 9개 (TypeScript) | 컴포넌트·훅 단위 테스트 |
| Infrastructure | Terratest | 11개 (Go) | GCP 모듈 unit + integration |
| E2E | Playwright | 31개 (TypeScript) | 12개 카테고리, 3-tier scope |

---

## 2. Backend Unit/Integration Tests (pytest)

### 2.1 구조 및 커버리지

Django REST Framework API를 대상으로 pytest와 Django Test Client를 활용한다. 95% 커버리지를 목표로 API 엔드포인트, 비즈니스 로직, 모델 레이어를 검증한다.

| 지표 | 수치 |
|------|------|
| 테스트 파일 | 16개 |
| 총 테스트 수 | 957개 |
| 커버리지 | 95% |
| 커버리지 목표 기준 | `--fail-under=90` |

테스트 파일 목록:

| 파일 | 주요 테스트 대상 |
|------|----------------|
| `test_health.py` | Health Check API |
| `test_serializers.py` | DRF Serializer 유효성 검사 |
| `test_models.py` | Django ORM 모델 |
| `test_models_advanced.py` | 복잡한 모델 관계 |
| `test_api_edge_cases.py` | API 엣지케이스 |
| `test_user.py` | 사용자 관리 API |
| `test_dashboard_coverage.py` | 대시보드 커버리지 |
| `test_scores.py` | 성적 처리 API |
| `test_taking.py` | 시험 응시 API |
| `test_taking_coverage.py` | 응시 로직 커버리지 |
| `test_full_e2e.py` | 전체 플로우 통합 테스트 |
| `tests.py` (examination) | 시험 관리 API |
| `tests.py` (testpaper) | 시험지 API |
| `tests.py` (testquestion) | 문제 관리 API |
| `tests.py` (core) | Core API |
| `coverage_fix_tests.py` | 커버리지 엣지케이스 |

### 2.2 실행 방법

```bash
# 기본 실행
uv run pytest

# 커버리지 포함
uv run pytest --cov=. --cov-report=term-missing --fail-under=90

# 특정 파일
uv run pytest examonline/apps/examination/api/test_taking.py -v
```

### 2.3 주요 테스트 패턴

- **APIClient 활용**: DRF APIClient로 HTTP 요청을 직접 테스트
- **Factory 패턴**: 테스트 데이터 생성을 Factory 함수로 추상화
- **JWT 인증 테스트**: `force_authenticate`를 활용한 Role별 권한 검증

---

## 3. Frontend Unit Tests (Vitest + RTL)

### 3.1 구조

React 컴포넌트와 Custom Hook을 대상으로 Vitest와 React Testing Library를 활용한다. 컴포넌트 렌더링, 사용자 인터랙션, API 응답 처리를 단위 검증한다.

| 지표 | 수치 |
|------|------|
| 테스트 파일 | 9개 |
| 위치 | `frontend/src/__tests__/` |

### 3.2 실행 방법

```bash
# 기본 실행
npm run test

# 커버리지 포함
npm run test:coverage

# Watch 모드
npm run test:watch
```

---

## 4. Infrastructure Tests (Terratest)

### 4.1 구조

Terraform GCP 모듈과 Helm Chart를 Go 기반 Terratest로 검증한다. 실제 GCP 리소스를 생성·검증·삭제하는 integration 테스트와, Helm template 렌더링을 검증하는 unit 테스트로 구분한다.

| 구분 | 파일 수 | 대상 |
|------|---------|------|
| Terraform Unit | 6개 | gcp-vpc, gar, memorystore, gke, cloudsql, gcs |
| Terraform Integration | 3개 | gcp-vpc, gar, gcs (실제 GCP 리소스) |
| Helm Template Unit | 2개 | Helm Chart 구조·Deployment 렌더링 검증 |

### 4.2 실행 방법

```bash
# Helm template 테스트 (로컬 실행 가능)
cd tests/terratest/helm
go test -v -run TestHelmTemplateRendering ./...

# Terraform unit 테스트 (GCP 인증 필요)
cd tests/terratest/terraform/gcp-vpc
go test -v -timeout 30m ./...
```

---

## 5. E2E Tests (Playwright)

### 5.1 테스트 범위

브라우저 레벨에서 전체 사용자 플로우를 검증한다. 12개 카테고리, 31개 spec 파일로 구성된다.

| 카테고리 | 주요 검증 내용 |
|----------|--------------|
| auth | 로그인, 로그아웃, 인증 흐름 |
| common | 공통 UI 요소 검증 |
| dashboard | 대시보드 지표 |
| edge-cases | 엣지케이스 시나리오 |
| integration | 통합 플로우 검증 |
| layout | 레이아웃·반응형 검증 |
| profile | 프로필 관리 |
| security | 보안 관련 검증 |
| smoke | 핵심 경로 스모크 테스트 |
| student | 학생 역할 플로우 |
| teacher | 교사 역할 플로우 |
| validation | 입력 유효성 검사 |

### 5.2 3-Tier E2E Scope

CI/CD 파이프라인에서 실행 범위를 3단계로 구분하여 파이프라인 실행 시간을 최적화한다.

| Tier | 트리거 | 범위 | 목적 |
|------|--------|------|------|
| Smoke | PR | 핵심 인증·시험 응시 경로 | 빠른 피드백 (필수 기능 이상 감지) |
| CI | main push | 전체 31개 spec | 릴리즈 전 완전 검증 |
| Full | 수동 트리거 | 전체 + 병렬 실행 | 장기 회귀 테스트 |

### 5.3 실행 방법

```bash
# Smoke (PR 기준)
npx playwright test --grep @smoke

# 전체 실행
npx playwright test

# 특정 카테고리
npx playwright test tests/auth/
```

---

## 6. CI/CD 통합

테스트 실행에 관여하는 3개 GitHub Actions Workflow를 자동화한다. (전체 프로젝트에는 CD 포함 6개 Workflow가 존재한다.)

| Workflow | 실행 테스트 | 트리거 |
|----------|------------|--------|
| `ci.yml` | pytest + Vitest | PR / push (backend/frontend 변경) |
| `e2e.yml` | Playwright (3-tier) | PR/Push |
| `infrastructure-test.yml` | Terratest | terraform/, charts/, argocd/ 변경 |

`paths-filter`를 활용하여 변경된 파일 경로에 해당하는 Workflow만 실행한다. Backend 코드 변경 시 pytest만, Frontend 코드 변경 시 Vitest만 실행하여 불필요한 파이프라인 비용을 절감한다.

---

## 7. AI-Assisted 테스트 작성

pytest, Vitest, Terratest 테스트를 Claude Code와 함께 작성했다. 3개 언어에서 나타난 프롬프트 전략의 차이가 있다.

| 레이어 | AI 활용 전략 |
|--------|------------|
| pytest | `conftest.py` 픽스처 격리 패턴, `APIClient` 인증 설정, Edge Case 시나리오 생성 |
| Vitest | 컴포넌트 렌더링 + 사용자 인터랙션 시나리오를 RTL 쿼리 기반으로 구성 |
| Terratest | GCP 리소스 생성 후 `retry.DoWithRetry` 패턴으로 검증 타이밍 처리 |
| Playwright | 페이지 오브젝트 패턴 + Smoke/CI/Full 티어별 태그 구분 |

E2E 테스트는 `fix(e2e)` 21개 커밋으로 기록된 반복 디버깅을 통해 안정화했다. 대표 사례로 DateTimePicker 컴포넌트 클릭 타이밍 이슈가 있으며, `waitFor` 조건과 `retry` 패턴을 조합하여 해결했다. AI가 생성한 selector 코드에서 주로 발견된 오류는 동적 DOM 변화에 대응하지 못하는 고정 셀렉터 사용이었고, 이를 `getByRole`·`getByText` 기반 접근으로 수정하는 패턴을 반복 적용했다.

---

## 관련 문서

| 문서 | 설명 |
|------|------|
| [AI-Assisted Development Workflow](ai-development.md) | AI와 함께 테스트를 작성한 방법론 |
| [Architecture Overview](architecture/README.md) | 전체 아키텍처 구조 |
| [Troubleshooting Guide](troubleshooting.md) | E2E 테스트 안정화 디버깅 사례 |
