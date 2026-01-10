# CI/CD Pipeline

GitHub Actions 기반 CI/CD Pipeline 구성입니다.

## Pipeline 구조

```
.github/workflows/
├── ci.yml           # CI Pipeline
├── cd-dev.yml       # Dev 환경 배포
├── cd-staging.yml   # Staging 환경 배포
└── cd-prod.yml      # Production 환경 배포
```

## CI Pipeline (`ci.yml`)

### Trigger

| Event | Branches |
|-------|----------|
| `push` | main, develop, feature/**, release/** |
| `pull_request` | main, develop |

### Jobs

| Job | 설명 | 의존성 |
|-----|------|--------|
| `lint-backend` | ruff check, ruff format | - |
| `type-check` | mypy | - |
| `test-backend` | pytest + coverage | lint-backend, type-check |
| `frontend` | TypeScript check, ESLint, Build | - |
| `docker-build` | Docker 이미지 빌드 (push 없음) | test-backend, frontend |
| `e2e` | Playwright E2E 테스트 | test-backend, frontend |

## CD Pipeline - Dev (`cd-dev.yml`)

### Trigger

- CI workflow 성공 후 자동 실행 (`workflow_run`)
- main branch push 시

### 배포 프로세스

1. GCP Workload Identity 인증
2. Artifact Registry Docker 인증
3. Backend/Frontend Docker 이미지 빌드 및 Push
4. GKE Dev Cluster 배포 (Helm)
5. Slack 알림

### Image Tag

- `dev-{short_sha}` (예: `dev-abc1234`)
- `dev-latest`

## CD Pipeline - Staging (`cd-staging.yml`)

### Trigger

- `release/**` branch push 시

### 배포 프로세스

1. Branch 이름에서 버전 추출 (`release/v1.2.3` -> `v1.2.3`)
2. Docker 이미지 빌드 및 Push
3. GKE Staging Cluster 배포
4. Slack 알림

### Image Tag

- `staging-{version}` (예: `staging-v1.2.3`)
- `staging-latest`

## CD Pipeline - Production (`cd-prod.yml`)

### Trigger

- 수동 실행 (`workflow_dispatch`)
- **GitHub Environment 승인 필요**

### 입력 파라미터

| 파라미터 | 설명 | 필수 |
|---------|------|------|
| `image_tag` | 배포할 이미지 태그 (예: `staging-v1.2.3`) | Yes |

### 배포 프로세스

1. 이미지 존재 여부 검증
2. **GitHub Environment 승인 대기**
3. GKE Prod Cluster 배포
4. 배포 검증
5. Slack 알림

### Rollback

배포 실패 시 Helm history 및 rollback 명령어가 제공됩니다.

```bash
# Helm history 확인
helm history exam-platform -n exam-prod

# 특정 버전으로 롤백
helm rollback exam-platform [REVISION] -n exam-prod
```

## GCP 설정

### Workload Identity Federation

GitHub Actions에서 GCP 인증을 위해 Workload Identity Federation을 사용합니다.

```bash
# 1. Workload Identity Pool 생성
gcloud iam workload-identity-pools create "github-pool" \
  --location="global" \
  --display-name="GitHub Actions Pool"

# 2. OIDC Provider 생성
gcloud iam workload-identity-pools providers create-oidc "github-provider" \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
  --issuer-uri="https://token.actions.githubusercontent.com"

# 3. Service Account IAM binding
gcloud iam service-accounts add-iam-policy-binding "github-actions@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/attribute.repository/OWNER/REPO"
```

### Service Account 권한

| 역할 | 용도 |
|------|------|
| `roles/artifactregistry.writer` | Artifact Registry push |
| `roles/container.developer` | GKE 배포 |

## GitHub Secrets 설정

Repository Settings > Secrets and variables > Actions에서 설정합니다.

| Secret | 설명 | 예시 |
|--------|------|------|
| `GCP_PROJECT_ID` | GCP Project ID | `my-project-123` |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | Workload Identity Provider | `projects/123/locations/global/workloadIdentityPools/github-pool/providers/github-provider` |
| `GCP_SERVICE_ACCOUNT` | Service Account | `github-actions@my-project.iam.gserviceaccount.com` |
| `GKE_CLUSTER_DEV` | Dev GKE Cluster 이름 | `exam-dev-cluster` |
| `GKE_CLUSTER_STAGING` | Staging GKE Cluster 이름 | `exam-staging-cluster` |
| `GKE_CLUSTER_PROD` | Prod GKE Cluster 이름 | `exam-prod-cluster` |
| `SLACK_WEBHOOK_URL` | Slack Incoming Webhook URL | `https://hooks.slack.com/services/...` |

## GitHub Environment 설정

Production 배포를 위해 GitHub Environment를 설정해야 합니다.

1. Repository Settings > Environments > New environment
2. Environment name: `production`
3. Required reviewers: 승인자 지정
4. (선택) Wait timer: 배포 전 대기 시간

## Artifact Registry 이미지 경로

```
asia-northeast3-docker.pkg.dev/{PROJECT_ID}/exam-platform/backend:{tag}
asia-northeast3-docker.pkg.dev/{PROJECT_ID}/exam-platform/frontend:{tag}
```

## 사용 예시

### Dev 배포

main branch에 push하면 자동으로 배포됩니다.

```bash
git checkout main
git merge feature/my-feature
git push origin main
# CI 완료 후 자동으로 Dev 배포
```

### Staging 배포

release branch를 생성하면 자동으로 배포됩니다.

```bash
git checkout -b release/v1.2.3
git push origin release/v1.2.3
# 자동으로 Staging 배포
```

### Production 배포

1. GitHub Actions 탭에서 "CD - Production" workflow 선택
2. "Run workflow" 클릭
3. `image_tag` 입력 (예: `staging-v1.2.3`)
4. 승인 대기 후 배포 진행
