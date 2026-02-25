# Terratest Infrastructure Tests

Terraform 모듈 Plan 검증 및 Helm Chart 배포 테스트를 수행하는 Terratest 기반 테스트 Suite이다.

## Directory 구조

```
tests/terratest/
├── go.mod                      # Go 모듈 정의
├── go.sum                      # 의존성 Lock 파일
├── README.md                   # 본 문서
├── helpers/                    # 공용 헬퍼 함수
│   ├── common.go               # 경로 유틸리티
│   ├── terraform.go            # Terraform Plan 검증 함수
│   ├── helm.go                 # Helm Template 검증 함수
│   ├── kubernetes.go           # Kubernetes 테스트 유틸리티
│   └── playwright.go           # Playwright 테스트 통합
├── terraform/                  # Terraform 모듈 테스트
│   ├── gcp-vpc/
│   ├── gke/
│   ├── cloudsql/
│   ├── memorystore/
│   ├── gcs/
│   └── gar/
└── helm/                       # Helm Chart 테스트
    ├── template_test.go        # Template 렌더링 검증
    └── deployment_test.go      # Integration 배포 테스트
```

## 사전 요구사항

- Go 1.22 이상
- Terraform 1.7.0 이상
- Helm 3.14.0 이상
- Kind (Integration 테스트 시)
- Node.js 22 이상 (Playwright 테스트 시)

## 설치

```bash
cd tests/terratest
go mod download
```

## 테스트 실행

### Terraform 모듈 테스트

Terraform Plan을 실행하여 모듈 구성을 검증한다. 실제 GCP 리소스를 생성하지 않는다.

```bash
# 전체 Terraform 테스트 실행
go test -v -timeout 30m ./terraform/...

# 특정 모듈만 테스트
go test -v -timeout 30m ./terraform/gcp-vpc/...
go test -v -timeout 30m ./terraform/gke/...
go test -v -timeout 30m ./terraform/cloudsql/...
go test -v -timeout 30m ./terraform/memorystore/...
go test -v -timeout 30m ./terraform/gcs/...
go test -v -timeout 30m ./terraform/gar/...
```

### Helm Chart 테스트

#### Template 렌더링 테스트

Helm Template을 렌더링하여 YAML 구문과 리소스 구성을 검증한다.

```bash
# Template 테스트만 실행
go test -v ./helm/... -run 'Template|Lint'
```

#### Integration 테스트 (Kind Cluster 필요)

Kind Cluster에 실제 배포하여 Health Check을 수행한다.

```bash
# Kind Cluster 생성
kind create cluster --name exam-test

# Integration 테스트 실행
RUN_INTEGRATION_TESTS=true go test -v -timeout 30m ./helm/...

# Cluster 삭제
kind delete cluster --name exam-test
```

### Playwright Smoke 테스트

배포된 서비스에 대해 E2E Smoke 테스트를 수행한다.

```bash
cd ../../frontend
npm ci
npx playwright install chromium

# Smoke 테스트 실행
npx playwright test smoke/
```

## 테스트 항목

### Terraform Module Tests

| Module | 검증 항목 |
|--------|----------|
| gcp-vpc | Plan 유효성, Subnet 수, Cloud NAT, Cloud Router, Output 존재 |
| gke | Cluster/NodePool 생성, Workload Identity, Shielded Nodes, Master Authorized Networks |
| cloudsql | Instance 생성, Encryption, Private IP, SSL, Output 존재 |
| memorystore | Redis Instance, Auth Token, Transit Encryption |
| gcs | Bucket 설정, Versioning, Lifecycle, IAM |
| gar | Repository 생성, Docker Format, Cleanup Policy |

### Helm Chart Tests

| 테스트 | 설명 |
|-------|------|
| Lint | `helm lint` 실행으로 Chart 문법 검증 |
| Template Rendering | Deployment, Service, Ingress, ConfigMap YAML 유효성 검증 |
| Environment Values | dev/staging/prod values 파일별 렌더링 검증 |
| Resource Limits | CPU/Memory limit 설정 확인 |
| Health Probes | Liveness/Readiness Probe 설정 확인 |
| Integration | Kind Cluster 배포, Scale, Upgrade, Rollback 시나리오 |

### Playwright Smoke Tests

| 테스트 | 설명 |
|-------|------|
| Frontend Load | 메인 페이지 200 응답 확인 |
| Login Page | 로그인 폼 요소 렌더링 확인 |
| Static Resources | JS/CSS 로드 실패 여부 확인 |
| JS Execution | Console 에러 없음 확인 |
| Backend Health | API Health Endpoint 응답 확인 |
| Performance | 페이지 로드 시간, FCP 측정 |

## CI/CD Integration

`.github/workflows/infrastructure-test.yml` 워크플로우가 다음 조건에서 실행된다:

- **PR**: `terraform/`, `charts/`, `tests/terratest/` 경로 변경 시
- **Push (main)**: 동일 경로 변경 시
- **수동 실행**: workflow_dispatch

### Job 구성

```
terraform-tests ──┐
                  │
helm-lint-tests ──┼──▶ test-summary
                  │
helm-template-tests ──┬──▶ integration-tests ──▶ playwright-smoke-tests
                      │         (main only)           (main only)
```

## Helper 함수

### terraform.go

| 함수 | 설명 |
|-----|------|
| `RunTerraformPlanValidation` | Terraform Plan 실행 및 결과 반환 |
| `RunIdempotencyTest` | 2회 Plan으로 멱등성 검증 |
| `ValidateOutputs` | 필수 Output 존재 확인 |
| `ValidateResourceExists` | 특정 리소스 Address 존재 확인 |
| `CountResourcesByType` | 리소스 타입별 개수 집계 |
| `ValidateNoSensitiveHardcoded` | 하드코딩된 민감 정보 검사 |

### helm.go

| 함수 | 설명 |
|-----|------|
| `RenderHelmTemplate` | Helm Template 렌더링 |
| `ValidateDeploymentTemplate` | Deployment YAML 파싱 및 검증 |
| `ValidateServiceTemplate` | Service YAML 파싱 및 검증 |
| `ValidateIngressTemplate` | Ingress YAML 파싱 및 검증 |
| `HelmLintChart` | `helm lint` 실행 |

### kubernetes.go

| 함수 | 설명 |
|-----|------|
| `WaitForDeploymentReady` | Deployment Ready 상태 대기 |
| `WaitForServiceEndpoint` | Service Endpoint 준비 대기 |
| `CheckHealthEndpoint` | HTTP Health Check 수행 |
| `PortForwardService` | kubectl port-forward 설정 |

### playwright.go

| 함수 | 설명 |
|-----|------|
| `RunPlaywrightSmokeTests` | Playwright Smoke 테스트 실행 |
| `RunHealthCheckTests` | Health Check 테스트 실행 |

## 환경 변수

| 변수 | 설명 | 기본값 |
|-----|------|-------|
| `RUN_INTEGRATION_TESTS` | Integration 테스트 활성화 | `false` |
| `RUN_PLAYWRIGHT_TESTS` | Playwright 테스트 활성화 | `false` |
| `PLAYWRIGHT_BASE_URL` | Playwright 테스트 대상 URL | `http://localhost:5173` |
| `BACKEND_URL` | Backend API URL | `${PLAYWRIGHT_BASE_URL}/api/v1` |

## Troubleshooting

### Terraform 테스트 실패

```bash
# Terraform 모듈 경로 확인
ls -la ../../terraform/modules/

# Terraform 버전 확인
terraform version
```

### Helm 테스트 실패

```bash
# Chart 경로 확인
ls -la ../../charts/exam-platform/

# Helm 버전 확인
helm version
```

### Integration 테스트 실패

```bash
# Kind Cluster 상태 확인
kind get clusters
kubectl cluster-info

# Pod 상태 확인
kubectl get pods -A

# Event 확인
kubectl get events -A --sort-by='.lastTimestamp'
```
