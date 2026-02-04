# Staging 환경 배포 스크립트

GCP Staging 환경 배포 및 관리를 위한 자동화 스크립트 모음입니다.

## 스크립트 목록

### 1. 01-prerequisites.sh

Prerequisites 확인 및 환경 설정

**기능:**
- 필수 도구 설치 확인 (gcloud, kubectl, helm, terraform, docker)
- GCP 인증 설정
- 환경 변수 파일 생성 (.env.staging)
- Docker 인증 구성
- 필수 GCP API 활성화

**사용법:**

```bash
bash 01-prerequisites.sh
```

**출력:**
- `.env.staging` 파일 생성

### 2. 02-terraform-deploy.sh

Terraform Infrastructure 프로비저닝

**기능:**
- Terraform 초기화
- Workspace 설정 (staging)
- Infrastructure Plan 생성 및 검토
- Infrastructure 배포
- Outputs 저장 (terraform-outputs.json)
- GKE Cluster 인증 구성

**사용법:**

```bash
bash 02-terraform-deploy.sh
```

**프로비저닝 리소스:**
- VPC Network
- GKE Cluster
- Cloud SQL PostgreSQL
- Memorystore Redis
- Cloud Storage
- Artifact Registry

**소요 시간:** 15-20분

### 3. 03-build-push-images.sh

Docker 이미지 빌드 및 Artifact Registry Push

**기능:**
- Backend 이미지 빌드 및 Push
- Frontend 이미지 빌드 및 Push
- 이미지 검증

**사용법:**

```bash
bash 03-build-push-images.sh
```

**생성 이미지:**
- `{region}-docker.pkg.dev/{project}/exam-platform/backend:1.0.0-staging`
- `{region}-docker.pkg.dev/{project}/exam-platform/frontend:1.0.0-staging`

### 4. 06-run-e2e-tests.sh

E2E 테스트 실행

**기능:**
- Staging 환경 External IP 확인
- Backend Health Check
- Playwright 브라우저 설치
- 인증 파일 재생성
- E2E 테스트 실행

**사용법:**

전체 테스트 실행:

```bash
bash 06-run-e2e-tests.sh
```

특정 테스트 실행:

```bash
bash 06-run-e2e-tests.sh e2e/tests/layout/sidebar-improvements.spec.ts
```

### 5. verify-deployment.sh

배포 검증

**기능:**
- GCP 인증 확인
- GKE Cluster 상태 확인
- kubectl 연결 확인
- Namespace 및 Pod 상태 확인
- Service 및 Ingress 확인
- Cloud SQL 및 Redis 상태 확인
- Backend Health Check
- Frontend 접근 확인
- Artifact Registry 이미지 확인
- 검증 결과 요약 출력

**사용법:**

```bash
bash verify-deployment.sh
```

**출력:**
- 통과/실패/경고 항목 수
- 접속 정보 (External IP, URL)

### 6. deploy-all.sh

전체 배포 자동화

**기능:**
- 위 1~4 스크립트를 순차적으로 실행
- 각 단계의 성공/실패 확인
- 배포 요약 정보 출력

**사용법:**

```bash
bash deploy-all.sh
```

**배포 단계:**
1. Prerequisites 확인 (01-prerequisites.sh)
2. Docker 이미지 빌드 및 Push (03-build-push-images.sh)
3. Terraform Infrastructure 및 Application 배포 (02-terraform-deploy.sh)
4. E2E 테스트 실행 (06-run-e2e-tests.sh)

**프로비저닝 리소스:**
- VPC Network
- GKE Cluster
- Cloud SQL PostgreSQL
- Memorystore Redis
- Cloud Storage
- Artifact Registry
- Google Secret Manager Secrets
- ArgoCD (Helm)
- External Secrets Operator (Helm)
- Application (ArgoCD)

**예상 소요 시간:** 30-45분

### 7. cleanup.sh

리소스 정리

**기능:**
- Helm Release 삭제
- Kubernetes Secrets 삭제
- Namespace 삭제 (선택)
- Terraform Infrastructure 삭제
- Docker 이미지 삭제 (선택)

**사용법:**

```bash
bash cleanup.sh
```

**주의:** 되돌릴 수 없는 작업입니다.

## 환경 변수 파일

### .env.staging

`01-prerequisites.sh` 실행 시 자동 생성되는 환경 변수 파일입니다.

**내용:**

```bash
# GCP Project 설정
export GCP_PROJECT_ID="your-project-id"
export GCP_REGION="asia-northeast3"
export GCP_ZONE="asia-northeast3-a"

# Docker Image 버전
export BACKEND_VERSION="1.0.0-staging"
export FRONTEND_VERSION="1.0.0-staging"

# Artifact Registry 설정
export GAR_LOCATION="asia-northeast3"
export GAR_REPOSITORY="exam-platform"
export GAR_IMAGE_BACKEND="..."
export GAR_IMAGE_FRONTEND="..."

# Kubernetes 설정
export K8S_NAMESPACE="default"
export HELM_RELEASE_NAME="exam-platform"

# 도메인 설정
export STAGING_DOMAIN="staging.examonline.com"
```

**로드 방법:**

```bash
source .env.staging
```

## 사용 예시

### 처음 배포하는 경우

```bash
cd scripts/staging

# 1. Prerequisites 확인
bash 01-prerequisites.sh

# 2. 환경 변수 로드
source .env.staging

# 3. 전체 배포 실행
bash deploy-all.sh
```

### 배포 검증

```bash
cd scripts/staging
source .env.staging
bash verify-deployment.sh
```

### 코드 변경 후 재배포

```bash
cd scripts/staging
source .env.staging

# 이미지 재빌드 및 배포
bash 03-build-push-images.sh
bash 02-terraform-deploy.sh
```

### E2E 테스트만 실행

```bash
cd scripts/staging
source .env.staging
bash 06-run-e2e-tests.sh
```

### 전체 리소스 삭제

```bash
cd scripts/staging
bash cleanup.sh
```

## 트러블슈팅

### 배포 상태 확인

```bash
bash verify-deployment.sh
```

배포 검증 스크립트를 실행하여 모든 리소스의 상태를 확인합니다.

### 스크립트 실행 권한 오류

```bash
chmod +x *.sh
```

### 환경 변수 로드 안 됨

```bash
source .env.staging
```

또는 템플릿에서 복사:

```bash
cp .env.staging.example .env.staging
source .env.staging
```

### GCP 인증 만료

```bash
gcloud auth login
gcloud auth application-default login
```

### Docker 인증 만료

```bash
gcloud auth configure-docker asia-northeast3-docker.pkg.dev --quiet
```

### Terraform State Lock

```bash
cd terraform/environments/gcp-staging
terraform force-unlock <LOCK_ID>
```

### GKE Cluster 연결 오류

```bash
gcloud container clusters get-credentials exam-cluster --region asia-northeast3 --project titanium-k3s-1765951764
```

### ArgoCD Admin Password

```bash
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
```

## 관련 문서

- [Staging 배포 가이드](../../docs/STAGING_DEPLOYMENT.md)
- [Terraform 구성](../../terraform/README.md)
- [Helm Chart](../../charts/exam-platform/README.md)
