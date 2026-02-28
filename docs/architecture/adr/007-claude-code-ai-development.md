# ADR-007: Claude Code 기반 AI-Assisted Development Workflow

## 상태 (Status)

`승인됨`

## 일자 (Date)

2025-12-18

## 상황 (Context)

Django 2.1 기반 레거시 시험 시스템을 DRF + React + GKE 아키텍처로 마이그레이션하는 과정에서 다음 조건이 존재했다.

- 1인 개발 환경에서 Full-Stack(Backend, Frontend) + DevOps(GKE, Terraform) + IaC + 4단계 테스트를 모두 커버해야 하는 규모
- 95% 테스트 커버리지 목표와 체계적 문서화를 동시에 달성해야 하는 품질 요구사항
- Python, TypeScript, Go, HCL, YAML 등 다중 언어/도메인 작업이 병렬로 진행
- AI 개발 도구를 활용하여 1인 개발 생산성을 극대화할 필요

Claude Code, GitHub Copilot, Cursor, Windsurf를 포함한 AI 개발 도구를 검토했다.

## 결정 (Decision)

**Claude Code**를 주요 AI Pair Programmer로 채택하고, 개발 전 영역(Backend, Frontend, Infra, CI/CD, 테스트, 문서화)에 활용한다.

### 기본 워크플로우

```
Developer → Claude Code (터미널) → [Bash / MCP] → git / kubectl / terraform / GitHub
                                ↑
                    settings.local.json (Permission Policy: 도메인별 권한 제어)
                    ~/.claude/.../MEMORY.md (세션 간 프로젝트 지식 축적)
```

### 활용 도메인 (9개)

| 도메인 | 활용 내용 |
|--------|----------|
| Backend | Django DRF API, pytest 테스트, 서비스 레이어 패턴 |
| Frontend | React 컴포넌트, TypeScript 타입 시스템, Vitest + Playwright |
| Terraform | GCP 8개 모듈 작성 (GKE, CloudSQL, Memorystore, GCS 등) |
| Kubernetes | Manifest 작성, CrashLoopBackOff 디버깅, Rollout 관리 |
| Helm | Chart 5환경 구성, App-of-Apps 패턴, values 체계 |
| GCP | IAM, Workload Identity, Secret Manager, Artifact Registry |
| Docker | Dockerfile 최적화, multi-stage build, docker compose |
| Git | 커밋 메시지, 브랜치 전략, Conventional Commits |
| GitHub | PR 생성/리뷰, Issue 관리, Actions Workflow |

### MCP 서버 연동 (5개)

| MCP 서버 | 역할 |
|----------|------|
| GitHub | PR 생성, Issue 관리, 코드 리뷰 직접 연동 |
| Playwright | E2E 테스트 브라우저 자동화 |
| Chrome DevTools | 프론트엔드 디버깅 연동 |
| Serena | 코드베이스 분석 및 패턴 검색 |
| Context7 | 라이브러리 문서 조회 통합 |

## 이유 (Rationale)

### 검토 대안

| 기준 | GitHub Copilot | Cursor | Claude Code | Windsurf |
|------|----------------|--------|-------------|----------|
| 컨텍스트 윈도우 | 제한적 | 중간 | 대규모 (200K) | 중간 |
| 멀티파일 작업 | 약함 | 보통 | 강함 | 보통 |
| 터미널 통합 | 없음 | 부분적 | 완전 (Bash) | 부분적 |
| MCP 연동 | 없음 | 없음 | 5종 지원 | 없음 |
| IaC 지원 | 제한적 | 보통 | 강함 (Terraform, Helm, K8s) | 보통 |
| Permission Policy + Memory | 없음 | 프로젝트 인덱싱 | settings.local.json + Memory | 제한적 |
| 비용 | $10/월 | $20/월 | $20/월 (Pro) | $15/월 |

### 선택 사유

- **대규모 컨텍스트**: 200K 토큰 윈도우로 복잡한 멀티파일 리팩터링과 아키텍처 분석이 가능하다
- **터미널 완전 통합**: Bash 직접 실행으로 git, kubectl, terraform 등 운영 도구를 단일 세션에서 처리한다
- **MCP 생태계**: GitHub, Playwright, Chrome DevTools, Serena, Context7 5개 도구와 직접 연동하여 개발 워크플로우를 통합한다
- **Permission Policy**: settings.local.json 기반 도메인별 세밀한 권한 제어로 안전한 자동화를 구현한다
- **Memory 시스템**: 세션 간 학습 축적(MEMORY.md, helm-tostring.md)으로 프로젝트 특화 지식을 유지한다
- **IaC 전문성**: Terraform HCL, Helm Chart, Kubernetes Manifest 작성에서 높은 정확도를 보인다

## 결과 (Consequences)

### 긍정적 결과

- 10주 만에 309 커밋, 66개 테스트 파일(Python 15 + TypeScript 40 + Go 11), 57개 문서 작성
- 4단계 테스트 피라미드 완성 (pytest 957개/95% 커버리지 + Vitest 9개 + Terratest 11개 + Playwright E2E 31개)
- 9개 도메인에서 AI 활용 워크플로우 확립
- Conventional Commits 98% 달성 (86 PR, 101 Issue 관리 포함)
- Multi-Agent Orchestration 2회 적용: 문서 수치 검증 및 키워드 재구성 (Agent Consensus Protocol 기반)

### 부정적 결과 / 트레이드오프

- AI 출력 검증에 추가 시간 소요 (전체 코드를 개발자가 리뷰 후 커밋)
- Helm, Terraform 등 특정 도메인 초기 러닝커브에서 AI 제안이 부정확한 경우 존재 (예: Helm image tag 순수 숫자 int64 해석 이슈)
- Claude Code API 비용 발생 ($20/월 Pro)
- Claude Code가 git commit을 직접 실행한 13건에 Co-Authored-By 태그 적용 — 나머지 커밋은 개발자가 검토/수정 후 직접 커밋

## 참고 자료 (References)

- [AI-Assisted Development Workflow](../../../docs/ai-development.md)
- [Testing Strategy](../../../docs/testing-strategy.md)
- [Architecture Overview - Section 8](../README.md)
- `.claude/settings.local.json`: Permission Policy 및 실사용 MCP 서버 기록
