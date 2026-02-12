# ADR-005: Helm App of Apps Pattern 배포 구조

## 상태 (Status)

`승인됨`

## 일자 (Date)

2025-04-10

## 상황 (Context)

Exam Platform은 Dev, Staging, Production 3개 환경을 Kubernetes 상에서 운영하며, 다음 요구사항이 존재한다.

- 환경별 설정(Replica 수, Resource Limit, Secret 방식 등) 분리
- 단일 Helm Chart로 모든 환경 배포 관리
- GitOps 기반 CD (Git Repository가 Single Source of Truth)
- ArgoCD를 통한 자동 Sync 및 Drift 감지

배포 구조로 환경별 개별 Chart, Kustomize, Helm + ArgoCD App of Apps 등을 검토했다.

## 결정 (Decision)

**Helm Chart + ArgoCD App of Apps Pattern**을 배포 구조로 채택한다.

### Helm Chart 구조

단일 Chart(`charts/exam-platform/`)에 모든 Kubernetes Resource Template을 포함하고, 환경별 Values 파일로 설정을 분리한다.

| 파일 | 용도 |
|------|------|
| `values.yaml` | Default 값 |
| `values-dev.yaml` | Dev 환경 |
| `values-staging.yaml` | Staging 환경 |
| `values-prod.yaml` | Production 환경 |
| `values-e2e.yaml` | E2E Test 환경 |
| `values-local.yaml` | Local 개발 환경 |

### ArgoCD App of Apps

Root Application이 하위 환경별 Application을 관리한다.

- Auto-Sync: Prune + SelfHeal 활성화
- Retry: 5회 (Exponential Backoff, 5s~3m)
- AppProject RBAC: admin / developer / viewer Role 분리

## 이유 (Rationale)

### 검토 대안

| 대안 | 장점 | 단점 |
|------|------|------|
| **Helm + App of Apps** | 단일 Chart 재사용, 환경별 Values 분리, ArgoCD Native 지원 | Helm Template 복잡성 증가 |
| **환경별 개별 Chart** | 환경 간 독립성 | Chart 중복, 변경 시 모든 환경 수동 반영 |
| **Kustomize** | Overlay 방식 직관적 | Helm 대비 패키지 관리 기능 부족, 복잡한 조건부 렌더링 어려움 |
| **Jsonnet/Tanka** | 프로그래밍 가능 | 학습 곡선, 생태계 제한 |

### 선택 사유

- **단일 Chart 재사용**: Backend/Frontend Deployment, Service, Ingress 등 Template 1벌로 모든 환경 관리
- **환경별 Values 분리**: 환경별 차이(Replica, HPA, Secret 방식, Domain 등)를 Values 파일로만 관리
- **App of Apps 계층 구조**: Root Application에서 환경별 Application을 한눈에 파악, 일괄 관리 가능
- **GitOps 적합**: Git에 Chart + Values를 관리하고 ArgoCD가 자동 Sync하여 수동 `kubectl apply` 제거

## 결과 (Consequences)

### 긍정적 결과

- 환경별 구성 차이가 Values 파일에 명시적으로 문서화
- ArgoCD Auto-Sync + SelfHeal로 Cluster 상태가 Git과 항상 일치
- 새 환경 추가 시 Values 파일 + ArgoCD Application 1건만 추가
- AppProject RBAC으로 환경별 접근 권한 제어 (developer는 dev/staging만 Sync 가능)

### 부정적 결과 / 트레이드오프

- Helm Template의 조건부 렌더링(`if`, `range` 등)이 복잡해질 수 있음
- 환경별 Values 파일 간 설정 Drift를 수동으로 관리해야 함
- ArgoCD 자체의 운영 오버헤드 (ArgoCD Cluster 내 배포 및 관리)
- Auto-Sync 활성화 시 의도하지 않은 Rollback 가능 (Git Revert 시 즉시 반영)

## 참고 자료 (References)

- [Architecture Overview - Section 5.3, 5.4](../README.md)
- `charts/exam-platform/`: Helm Chart 구조
- `argocd/`: ArgoCD Application 정의
