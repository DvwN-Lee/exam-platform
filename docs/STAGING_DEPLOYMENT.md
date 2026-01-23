# GCP Staging 환경 배포 가이드

OnlineExam-v2 프로젝트를 GCP Staging 환경에 배포하고 E2E 테스트를 수행하는 가이드입니다.

## 목차

- [개요](#개요)
- [사전 요구사항](#사전-요구사항)
- [빠른 시작](#빠른-시작)
- [단계별 배포](#단계별-배포)
- [E2E 테스트](#e2e-테스트)
- [리소스 정리](#리소스-정리)
- [트러블슈팅](#트러블슈팅)

## 개요

이 가이드는 다음 작업을 수행합니다:

1. Terraform으로 GCP Infrastructure 프로비저닝 (VPC, GKE, Cloud SQL, Memorystore Redis)
2. Docker 이미지 빌드 및 Google Artifact Registry 업로드
3. Helm Chart로 GKE Cluster 배포
4. 배포된 Staging 환경 대상 E2E 테스트 실행

**프로비저닝되는 리소스:**

- VPC Network (10.1.0.0/16)
- GKE Cluster (Regional, 2 nodes, e2-standard-2)
- Cloud SQL PostgreSQL 16 (db-g1-small)
- Memorystore Redis (Standard HA, 2GB)
- Google Cloud Storage (Assets)
- Google Artifact Registry (Docker images)

## 사전 요구사항

### 필수 도구

```bash
gcloud version     # Google Cloud SDK
kubectl version    # Kubernetes CLI
helm version       # Helm 3.x
terraform version  # Terraform >= 1.0.0
docker --version   # Docker
```

설치 방법 (macOS):

```bash
brew install google-cloud-sdk kubectl helm terraform docker
```

### GCP 설정

1. GCP Project 준비

```bash
export GCP_PROJECT_ID="your-project-id"
gcloud config set project $GCP_PROJECT_ID
```

2. 필수 API 활성화

```bash
gcloud services enable compute.googleapis.com \
  container.googleapis.com \
  sqladmin.googleapis.com \
  redis.googleapis.com \
  artifactregistry.googleapis.com \
  servicenetworking.googleapis.com
```

3. 인증 설정

```bash
gcloud auth login
gcloud auth application-default login
```

## 빠른 시작

전체 배포를 자동으로 수행합니다:

```bash
cd scripts/staging
bash deploy-all.sh
```

이 스크립트는 다음 단계를 순차적으로 실행합니다:

1. Prerequisites 확인
2. Terraform Infrastructure 배포
3. Docker 이미지 빌드 및 Push
4. Kubernetes Secrets 구성
5. Helm Chart 배포
6. E2E 테스트 실행

**예상 소요 시간:** 20-30분

## 단계별 배포

각 단계를 개별적으로 실행할 수 있습니다.

### Step 1: Prerequisites 확인

```bash
cd scripts/staging
bash 01-prerequisites.sh
```

이 스크립트는:

- 필수 도구 설치 확인
- GCP 인증 설정
- 환경 변수 파일 생성 (.env.staging)
- Docker 인증 구성

### Step 2: Terraform Infrastructure 배포

```bash
bash 02-terraform-deploy.sh
```

배포되는 리소스:

- VPC Network
- GKE Cluster (exam-cluster)
- Cloud SQL PostgreSQL (exam-db)
- Memorystore Redis (exam-redis)
- Cloud Storage (examonline-staging-assets)
- Artifact Registry (exam-platform)

**소요 시간:** 15-20분

### Step 3: Docker 이미지 빌드 및 Push

```bash
bash 03-build-push-images.sh
```

빌드되는 이미지:

- Backend: `asia-northeast3-docker.pkg.dev/{project}/exam-platform/backend:1.0.0-staging`
- Frontend: `asia-northeast3-docker.pkg.dev/{project}/exam-platform/frontend:1.0.0-staging`

### Step 4: Kubernetes Secrets 구성

```bash
bash 04-configure-secrets.sh
```

생성되는 Secrets:

- `db-credentials`: Cloud SQL 연결 정보
- `redis-credentials`: Redis 연결 정보
- `app-secrets`: Django Secret Key, JWT Secret Key

### Step 5: Helm Chart 배포

```bash
bash 05-helm-deploy.sh
```

배포되는 리소스:

- Backend Deployment (2 replicas)
- Frontend Deployment (2 replicas)
- Services (ClusterIP)
- Ingress (GCE Load Balancer)

### Step 6: E2E 테스트 실행

```bash
bash 06-run-e2e-tests.sh
```

테스트 환경:

- Playwright를 사용한 E2E 테스트
- Staging 환경 대상 실행
- Chromium 브라우저 사용

## E2E 테스트

### 전체 테스트 실행

```bash
cd scripts/staging
bash 06-run-e2e-tests.sh
```

### 특정 테스트 실행

```bash
cd scripts/staging
bash 06-run-e2e-tests.sh e2e/tests/layout/sidebar-improvements.spec.ts
```

### 테스트 결과 확인

```bash
cd frontend
npx playwright show-report e2e/reports
```

## 리소스 정리

Staging 환경의 모든 리소스를 삭제합니다:

```bash
cd scripts/staging
bash cleanup.sh
```

삭제되는 리소스:

1. Helm Release
2. Kubernetes Secrets
3. Terraform Infrastructure (VPC, GKE, Cloud SQL, Redis, GCS, GAR)

**주의:** 이 작업은 되돌릴 수 없습니다.

## GitHub Actions CI/CD

### Workflow 트리거

Staging 환경에 자동 배포하려면:

1. `release/staging` 브랜치에 Push

```bash
git checkout -b release/staging
git push origin release/staging
```

2. 또는 Workflow를 수동으로 실행

- GitHub Actions 탭에서 "CD - Staging Full Deployment" Workflow 선택
- "Run workflow" 클릭

### Workflow 단계

1. Terraform Infrastructure 프로비저닝
2. Docker 이미지 빌드 및 Push
3. GKE Cluster 배포
4. (선택) E2E 테스트 실행

### 필요한 GitHub Secrets

```
GCP_PROJECT_ID
GCP_WORKLOAD_IDENTITY_PROVIDER
GCP_SERVICE_ACCOUNT
DJANGO_SECRET_KEY
JWT_SECRET_KEY
SLACK_WEBHOOK_URL (선택)
```

## 트러블슈팅

### Issue 1: GKE Cluster 노드 생성 실패

**원인:** GCP Quota 부족

**해결:**

```bash
gcloud compute project-info describe --project=$GCP_PROJECT_ID
```

필요한 Quota를 확인하고 증가 요청을 제출합니다.

### Issue 2: Cloud SQL 연결 실패

**원인:** Private IP VPC Peering 미완료

**해결:** Terraform apply 후 5-10분 대기 후 VPC Peering 상태 확인:

```bash
gcloud services vpc-peerings list --network=vpc --project=$GCP_PROJECT_ID
```

### Issue 3: Ingress External IP 할당 안 됨

**원인:** GCE Ingress Controller 초기화 지연

**해결:** Ingress 상태를 모니터링하며 대기 (최대 5분):

```bash
kubectl get ingress -n default -w
```

### Issue 4: E2E 테스트 실패 (네트워크 타임아웃)

**원인:** Backend Pod가 아직 Ready 상태가 아님

**해결:**

```bash
kubectl wait --for=condition=Ready pod -l app=backend -n default --timeout=300s
```

### Issue 5: Docker 이미지 Push 실패

**원인:** Docker 인증이 만료됨

**해결:**

```bash
gcloud auth configure-docker asia-northeast3-docker.pkg.dev --quiet
```

## 접속 정보

### External IP 확인

```bash
kubectl get ingress -n default
```

### /etc/hosts 설정

```bash
EXTERNAL_IP=$(kubectl get ingress -n default -o jsonpath='{.items[0].status.loadBalancer.ingress[0].ip}')
echo "$EXTERNAL_IP staging.examonline.com" | sudo tee -a /etc/hosts
```

### 브라우저 접속

```
http://staging.examonline.com
```

## 로그 확인

### Backend 로그

```bash
kubectl logs -f -l app=backend -n default
```

### Frontend 로그

```bash
kubectl logs -f -l app=frontend -n default
```

### Ingress Controller 로그

```bash
kubectl logs -f -n kube-system -l k8s-app=glbc
```

## 리소스 모니터링

### Pod 상태

```bash
kubectl get pods -n default
```

### Service 상태

```bash
kubectl get svc -n default
```

### Ingress 상태

```bash
kubectl get ingress -n default
```

### Cloud SQL 상태

```bash
gcloud sql instances describe exam-db --project=$GCP_PROJECT_ID
```

### Redis 상태

```bash
gcloud redis instances describe exam-redis --region=asia-northeast3 --project=$GCP_PROJECT_ID
```

## 관련 문서

- [Terraform 구성](../terraform/README.md)
- [Helm Chart 가이드](../charts/exam-platform/README.md)
- [E2E 테스트 가이드](../frontend/e2e/README.md)
- [GitHub Actions Workflow](.github/workflows/cd-staging-full.yml)

## 문의

문제가 발생하거나 질문이 있는 경우:

1. GitHub Issues에 등록
2. 로그를 첨부하여 제출

**로그 수집 명령어:**

```bash
kubectl get all -n default > deployment-status.txt
kubectl logs -l app=backend -n default --tail=100 > backend-logs.txt
kubectl logs -l app=frontend -n default --tail=100 > frontend-logs.txt
kubectl describe ingress -n default > ingress-status.txt
```
