# AI-Assisted Development Workflow

이 프로젝트는 Claude Code를 AI Pair Programmer로 활용하여 1인 개발자가 10주 만에 Full-Stack + DevOps + IaC + 4단계 테스트를 갖춘 프로덕션 시스템을 구축한 사례다.

---

## 1. 개요

### 1.1 배경

Django 2.1 레거시 시험 시스템을 DRF + React + GKE 아키텍처로 마이그레이션하는 과정에서 다음 조건이 존재했다.

- 1인 개발 환경에서 Backend, Frontend, DevOps, IaC, 테스트, 문서화를 모두 커버해야 하는 규모
- Python, TypeScript, Go, HCL, YAML 등 다중 언어·도메인의 병렬 작업
- 95% 테스트 커버리지 목표와 체계적인 문서화를 동시에 달성해야 하는 품질 요구사항

### 1.2 Human-AI 협업 모델

Claude Code를 AI Pair Programmer로 활용하되, AI 생성 출력은 반드시 개발자 검토·수정을 거쳐 커밋하는 원칙을 유지한다. 개발자가 최종 결정권을 갖는 협업 구조이며, 아키텍처 결정과 코드 품질 판단은 인간이 주도한다.

---

## 2. 도구 구성

### 2.1 Claude Code 설정 체계

`settings.local.json` 기반 Permission Policy를 통해 9개 도메인에서 세밀한 권한 제어를 구현한다.

| 도메인 | 주요 명령어 |
|--------|------------|
| Backend | `uv run pytest`, `python manage.py` |
| Frontend | `npm run test`, `npx playwright test`, `npm run build` |
| Terraform | `terraform plan`, `terraform apply`, `terraform init` |
| Kubernetes | `kubectl get`, `kubectl describe`, `kubectl apply` |
| Helm | `helm lint`, `helm template`, `helm upgrade` |
| GCP | `gcloud container clusters`, `gcloud sql instances` |
| Docker | `docker compose`, `docker build`, `docker push` |
| Git | `git log`, `git diff`, `git worktree` |
| GitHub | `gh pr create`, `gh issue list`, `gh pr merge` |

최소 권한 원칙을 적용하여 각 명령어를 명시적으로 허용하고, 허용되지 않은 명령은 자동 차단한다.

### 2.2 MCP 서버 연동

5개 MCP 서버를 연동하여 개발 워크플로우를 통합한다.

| MCP 서버 | 역할 |
|----------|------|
| GitHub | PR 생성, Issue 관리, 코드 리뷰 직접 연동 |
| Playwright | E2E 테스트 브라우저 자동화 |
| Chrome DevTools | 프론트엔드 디버깅 연동 |
| Serena | 코드베이스 분석 및 패턴 검색 |
| Context7 | 라이브러리 문서 조회 통합 |

### 2.3 Memory 시스템

세션 간 컨텍스트를 유지하기 위해 Memory 파일을 운영한다.

| 파일 | 내용 |
|------|------|
| `MEMORY.md` | 프로젝트 구조, 주요 패턴, 반복 학습 내용 |
| `helm-tostring.md` | Helm image tag 순수 숫자 int64 해석 이슈 디버깅 기록 |

---

## 3. 활용 영역별 상세

### 3.1 코드 생성 및 리팩터링

- Django 2.1 레거시 코드에서 DRF Service Layer 패턴으로 리팩터링
- React 컴포넌트 + TypeScript 타입 시스템 설계
- 복잡한 멀티파일 변경(200K 컨텍스트 윈도우)을 단일 세션에서 처리

### 3.2 테스트 작성 (4단계 피라미드)

3개 언어로 구성된 4단계 테스트 피라미드를 AI와 함께 작성한다.

| 레이어 | 도구 | 수량 |
|--------|------|------|
| Backend Unit/Integration | pytest | 11개 파일, 957개 테스트, 95% 커버리지 |
| Frontend Unit | Vitest + RTL | 9개 파일 |
| Infrastructure | Terratest (Go) | 11개 파일 (6 unit + 3 integration + 2 Helm) |
| E2E | Playwright | 31개 spec, 7개 카테고리 |

### 3.3 인프라 코드 (IaC)

- Terraform 8개 GCP 모듈 (GKE, CloudSQL, Memorystore, GCS, GAR 등) 작성
- Helm Chart 5환경 구성 (local/dev/staging/production + ArgoCD)
- ArgoCD App-of-Apps 패턴 설계
- Phase 6에서 Docker → K8s Helm → Terraform → CI/CD → ArgoCD 순서로 체계적으로 진행

### 3.4 디버깅

실제 발생한 이슈를 AI와 함께 추적하고 해결한다.

- `CrashLoopBackOff` 해결 (K8s Init Container 순서 문제)
- SSL Redirect Loop 디버깅 (Ingress annotation 설정)
- ExternalSecret Sync 오류 추적 (Workload Identity 설정)
- Helm 순수 숫자 image tag → int64 해석 이슈 (Memory에 기록)
- `fix(e2e)` 21개 커밋: E2E 테스트 안정화 반복 디버깅

### 3.5 문서화

- Architecture Document (Mermaid 12개 이상 다이어그램)
- ADR 7건 (대안 비교 + 트레이드오프 포함)
- Troubleshooting Guide (20개 이상 이슈, 증상→원인→해결→검증 구조)
- 57개 문서 전수 검토 → 정합성 100% 달성

### 3.6 CI/CD 파이프라인

6개 GitHub Actions Workflow를 설계하여 변경 감지 기반 자동화를 구현한다.

| Workflow | 트리거 | 역할 |
|----------|--------|------|
| `ci.yml` | PR (backend/frontend 변경 시) | pytest + coverage, Vitest, TypeScript 검사 |
| `e2e.yml` | PR/Push (3-tier scope) | Playwright E2E (Smoke/CI/Full) |
| `cd-dev.yml` | main push (backend 변경 시) | Dev 환경 자동 배포 |
| `cd-staging.yml` | 수동 트리거 | Staging 환경 배포 |
| `cd-prod.yml` | 수동 트리거 | Production 환경 배포 |
| `infrastructure-test.yml` | terraform/ 변경 시 | Terratest Go 실행 |

`paths-filter`를 활용하여 변경된 파일 경로에 따라 필요한 Job만 실행한다. E2E는 PR=Smoke(핵심 경로), Main=CI(전체), Manual=Full(전체+병렬) 3단계로 범위를 구분하여 파이프라인 실행 시간을 최적화한다.

### 3.7 멀티 에이전트 Scrum 검토

문서 품질 검증에 목적이 다른 에이전트를 병렬 투입하여 단일 에이전트 검토의 편향을 방지한다. 이 프로젝트의 포트폴리오 문서 작성 시 실제 적용한 방식이다.

#### 3.7.1 에이전트 역할 분리

| 에이전트 | 역할 | 검토 관점 |
|----------|------|-----------|
| `fact-checker` | 증거 수집 | Git history, 커밋 통계, 실제 파일 수 대조 — 수치 주장의 사실 여부 검증 |
| `quality-reviewer` | 문서 신뢰도 평가 | 수치 과장·누락·근거 부족 등 신뢰도 손상 요소 식별 |
| `doc-writer` | 문서 설계 평가 | 기존 문서 톤·구조와의 일관성, 포맷 규칙 준수 여부 |

각 에이전트는 독립적으로 분석하며 서로의 결과를 모른 채 의견을 제출한다.

#### 3.7.2 2단계 프로세스

```
Phase 1: 개별 분석 (병렬)
  ├── fact-checker  → 수치 검증 보고서
  ├── quality-reviewer → 문서 신뢰도 평가 보고서
  └── doc-writer    → 문서 구조·톤 분석 보고서
         ↓
Phase 2: Scrum 회의 (합의)
  ├── 각 에이전트 발표 → 이견 항목 식별
  ├── VETO 제기 → 검증 명령 실행으로 해소
  └── 합의 후 → 구현 계획 확정
```

**VETO 메커니즘**: 어느 에이전트든 신뢰도 손상 가능성이 있는 항목에 VETO를 제기할 수 있다. VETO가 제기된 항목은 실제 데이터로 검증한 후 해소하거나 수정한다. 모든 에이전트가 VETO 없음 상태가 되어야 구현을 진행한다.

#### 3.7.3 실제 적용 사례: 포트폴리오 수치 검증

이 문서(`ai-development.md`) 작성 과정에서 세 에이전트를 투입한 결과, 초기 전략 문서(`ai-portfolio-strategy.md`)에 기재된 수치 중 다수가 실제와 다름이 드러났다.

| 수치 항목 | 전략 문서 초안 | 검증 후 확정값 | 발견 에이전트 |
|-----------|--------------|--------------|-------------|
| 총 커밋 | 500+ | 288 | quality-reviewer (VETO) |
| Go 테스트 파일 | 17개 | 11개 | quality-reviewer (VETO) |
| Co-Authored-By | 2건 | 1건 | fact-checker |
| Conventional Commits | 89.8% | ~98% | fact-checker |
| MCP 서버 확인 경로 | settings.json | settings.local.json | fact-checker |

quality-reviewer가 "500+"와 같은 근거 없는 표현이 신뢰도를 손상시킨다는 VETO를 제기했고, `git rev-list --count HEAD`로 실측한 288로 수정했다. 과장된 수치 하나가 문서 전체의 신뢰성을 훼손할 수 있다는 점에서 VETO 메커니즘이 실질적인 역할을 했다.

#### 3.7.4 구현 단계: Subagent-Driven Development

합의된 계획은 태스크 단위로 분리하여 구현한다. 각 태스크마다 신선한 컨텍스트를 가진 구현 에이전트를 투입하고, 완료 후 2단계 검토(스펙 준수 → 코드 품질)를 통과해야 다음 태스크로 진행한다. 이 문서 포함 7개 문서 작업에서 총 14회 개별 리뷰와 1회 최종 전체 리뷰를 수행했다.

---

## 4. 정량적 성과

| 지표 | 수치 |
|------|------|
| 개발 기간 | 10주 (2025.12 ~ 2026.02) |
| 총 커밋 | 288 |
| PR | 85개 |
| Issue | 101개 |
| 테스트 파일 | 62개 (Python 11 + TypeScript 40 + Go 11) |
| pytest 테스트 수 | 957개 |
| 테스트 커버리지 | 95% |
| 문서 | 57개 |
| Terraform 모듈 | 8개 |
| CI/CD Workflow | 6개 |
| Conventional Commits | ~98% |

---

## 5. 프롬프트 엔지니어링 인사이트

### 5.1 Permission Policy 설계

`settings.local.json`에서 도메인별 명령어를 명시적으로 허용한다. 단순히 "모든 명령 허용"이 아닌 최소 권한 원칙을 AI 도구에 적용하는 방식이다. 예를 들어 `terraform destroy`는 명시적 허용 목록에 포함하되, 프로덕션 환경에서는 허용하지 않는 방식으로 운영한다.

### 5.2 Memory 활용 전략

세션 간 컨텍스트 유지를 위해 두 가지 Memory 파일을 운영한다. `MEMORY.md`에는 프로젝트 패턴과 반복 학습 내용을 축적하고, `helm-tostring.md`처럼 특정 버그 사례는 별도 파일로 분리하여 다음 세션에서 동일한 실수를 반복하지 않는다.

### 5.3 구체적 사례: Helm toString 디버깅

Helm Chart에서 image tag를 순수 숫자(SHA digest 앞 7자리)로 사용할 때 YAML이 int64로 해석하여 배포가 실패하는 이슈가 발생했다. 이 과정에서 다음 프롬프트 전략이 효과적이었다.

1. **현상 재현 우선**: "helm template 결과에서 tag 값이 어떻게 출력되는지 먼저 확인해라"
2. **격리 진단**: "values.yaml에서 tag를 문자열로 감싸는 것과 int로 해석되는 것의 차이를 Helm 공식 문서 기준으로 설명해라"
3. **최소 변경 해결**: "기존 values 구조를 변경하지 않고 template에서만 toString 처리하는 방법을 제안해라"

이 접근법은 AI가 즉시 수정안을 제안하기 전에 문제를 정확히 진단하도록 유도하는 패턴이다.

해결 전/후 코드:

```yaml
# Before: YAML이 tag 값을 int64로 해석하여 Helm template 렌더링 실패
image:
  tag: 1234567
```

```yaml
# After: toString | quote로 문자열 강제 처리
image:
  tag: {{ .Values.image.tag | toString | quote }}
```

### 5.4 MCP 연동 패턴

Playwright MCP를 활용하여 E2E 테스트 디버깅 시 브라우저 상태를 실시간으로 확인하고, GitHub MCP로 PR 생성·리뷰·머지를 단일 세션에서 처리한다. 도구 전환 없이 AI가 직접 도구를 호출하는 구조가 컨텍스트 단절을 방지한다.

---

## 6. 교훈 및 한계

### 교훈

- **AI 출력 검증 필수**: 모든 코드를 개발자가 리뷰하는 원칙이 품질 유지에 핵심이다
- **컨텍스트 관리**: 세션이 길어질수록 Memory 파일의 역할이 중요해진다
- **최소 권한 원칙**: Permission Policy를 세밀하게 설정할수록 의도치 않은 명령 실행이 줄어든다
- **프롬프트 구체성**: "코드를 작성해라"보다 "진단 후 최소 변경으로 해결해라" 패턴이 결과 품질을 높인다

### 한계

- AI가 잘못 제안하는 경우의 디버깅 비용: 특히 Helm, Terraform 초기 설정에서 부정확한 제안이 발생
- 핵심 아키텍처 결정은 인간이 주도해야 한다: AI는 구현 지원 도구이며 설계 결정의 책임은 개발자에게 있다
- Co-Authored-By 태그는 Claude Code가 `git commit`을 직접 실행한 1건에만 적용됨 — 대부분의 커밋은 개발자가 검토·수정 후 직접 커밋하는 구조

---

## 관련 문서

| 문서 | 설명 |
|------|------|
| [ADR-007: Claude Code AI-Assisted Development](architecture/adr/007-claude-code-ai-development.md) | 도구 선택 근거 및 대안 비교 |
| [Architecture Overview - Section 8](architecture/README.md) | 개발 방법론 아키텍처 개요 |
| [Testing Strategy](testing-strategy.md) | 4단계 테스트 피라미드 상세 |
| [Troubleshooting Guide](troubleshooting.md) | AI-Assisted 디버깅 사례 포함 |
