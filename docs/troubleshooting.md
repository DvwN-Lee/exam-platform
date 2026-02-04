# Exam Platform Troubleshooting Guide

프로젝트 개발 및 운영 과정에서 발생한 주요 이슈와 해결 방법을 정리한 문서입니다.

---

## 목차

1. [Infrastructure / Terraform](#1-infrastructure--terraform)
2. [Kubernetes / Helm](#2-kubernetes--helm)
3. [ArgoCD / GitOps](#3-argocd--gitops)
4. [CI/CD Pipeline](#4-cicd-pipeline)
5. [External Secrets Operator](#5-external-secrets-operator)
6. [Backend (Django)](#6-backend-django)
7. [Frontend (React)](#7-frontend-react)
8. [E2E Testing](#8-e2e-testing)

---

## 1. Infrastructure / Terraform

### 1.1 DB User 불일치 문제

**Issue:** #168
**PR:** #175

**증상:**
```
FATAL: password authentication failed for user "postgres"
```
- Cloud SQL 연결 시 인증 실패
- Terraform에서 생성한 DB User와 Application에서 사용하는 User 불일치

**원인:**
- `terraform/modules/cloudsql/main.tf`에서 DB User를 `examonline`으로 생성
- Secret Manager에 저장된 값은 `postgres`로 설정

**해결:**
```hcl
# terraform/modules/cloudsql/main.tf
resource "google_sql_user" "default" {
  name     = var.db_user  # 변수로 통일
  instance = google_sql_database_instance.main.name
  password = random_password.db_password.result
}
```

**검증 결과:**
```bash
$ kubectl exec -it deployment/exam-prod-exam-platform-backend -n exam-platform-prod \
    -- python manage.py dbshell -c "SELECT current_user;"
 current_user
--------------
 examonline
(1 row)
```

**교훈:**
- IaC에서 생성하는 리소스와 Application에서 참조하는 값의 일관성 검증 필요
- Secret Manager에 저장되는 값은 Terraform output에서 직접 참조하도록 구성

---

### 1.2 Terraform State 보안 문제

**Issue:** #168
**PR:** #156

**증상:**
```bash
$ ls -la terraform/environments/gcp-staging/
-rw-r--r--  terraform.tfstate      # 민감 정보 포함
-rw-r--r--  terraform.tfstate.backup
```
- `terraform.tfstate` 파일이 Local에 저장되어 협업 시 충돌 발생
- 민감한 정보(DB Password 등)가 State 파일에 평문으로 저장

**해결:**
```hcl
# terraform/environments/gcp-prod/backend.tf
terraform {
  backend "gcs" {
    bucket = "exam-platform-tfstate-prod"
    prefix = "terraform/state"
  }
}
```

Bootstrap 구조 추가:
```
terraform/
├── bootstrap/           # State Bucket 생성용 (최초 1회)
│   └── main.tf
└── environments/
    └── gcp-prod/        # 실제 Infrastructure
        └── backend.tf   # Remote State 참조
```

**검증 결과:**
```bash
$ terraform init
Initializing the backend...
Successfully configured the backend "gcs"! Terraform will automatically
use this backend unless the backend configuration changes.

$ gsutil ls gs://exam-platform-tfstate-prod/terraform/state/
gs://exam-platform-tfstate-prod/terraform/state/default.tfstate
```

---

### 1.3 GCP 환경 Hardcoding 제거

**Issue:** #169, #172
**PR:** #175, #176

**증상:**
```bash
$ grep -r "titanium-k3s-20260123" terraform/ --include="*.tf" | wc -l
47  # 47개 파일에 Hardcoded
```
- Project ID, Region 등이 여러 파일에 직접 기재되어 환경 변경 시 수정 누락 발생

**해결:**
```hcl
# terraform/environments/gcp-prod/variables.tf
variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "asia-northeast3"
}

# 모든 module에서 var.project_id 참조
module "vpc" {
  source     = "../../modules/gcp-vpc"
  project_id = var.project_id
  region     = var.region
}
```

**검증 결과:**
```bash
$ grep -r "titanium-k3s-20260123" terraform/modules/ --include="*.tf" | wc -l
0  # Module 내 Hardcoding 제거 완료

$ terraform validate
Success! The configuration is valid.
```

---

### 1.4 VPC Integration Test Assertion 오류

**Issue:** #108
**PR:** #109

**증상:**
```
=== RUN   TestVpcModule
    vpc_test.go:45: output "nat_ip" doesn't exist
--- FAIL: TestVpcModule (45.23s)
```

**원인:**
- Terraform Module의 `outputs.tf`에 정의된 Output 이름과 Test에서 참조하는 이름 불일치
- Cloud Router 생성 후 NAT IP가 즉시 할당되지 않아 Assertion 실패

**해결:**
```go
// terraform/modules/gcp-vpc/test/vpc_test.go
// NAT IP는 비동기로 할당되므로 Retry 로직 추가
retry.DoWithRetry(t, "Waiting for NAT IP", 10, 30*time.Second, func() (string, error) {
    natIP := terraform.Output(t, terraformOptions, "nat_ip")
    if natIP == "" {
        return "", fmt.Errorf("NAT IP not yet assigned")
    }
    return natIP, nil
})
```

**검증 결과:**
```bash
$ cd terraform/modules/gcp-vpc && go test -v -timeout 30m
=== RUN   TestVpcModule
    vpc_test.go:38: Terraform init...
    vpc_test.go:42: Terraform apply...
    vpc_test.go:56: Waiting for NAT IP (attempt 1/10)
    vpc_test.go:56: Waiting for NAT IP (attempt 2/10)
    vpc_test.go:60: NAT IP assigned: 34.64.xxx.xxx
--- PASS: TestVpcModule (127.45s)
PASS
```

---

## 2. Kubernetes / Helm

### 2.1 Backend Pod CrashLoopBackOff

**Issue:** #88
**PR:** #90

**증상:**
```bash
$ kubectl get pods -n exam-platform-staging
NAME                        READY   STATUS             RESTARTS   AGE
backend-xxx                 0/1     CrashLoopBackOff   5          10m

$ kubectl logs backend-xxx -n exam-platform-staging
ConnectionError: MongoDB connection failed: [Errno -2] Name or service not known
```

**원인:**
- MongoDB/Redis 연결 Health Check에서 필수 환경 변수 누락 시 즉시 종료
- GKE 환경에서는 MongoDB를 사용하지 않지만, Health Check가 MongoDB 연결을 필수로 검사

**해결:**
```python
# examonline/core/health.py
def check_mongodb():
    mongo_host = os.getenv("MONGODB_HOST", "")
    if not mongo_host:
        return {"status": "skipped", "message": "MongoDB not configured"}
    # ... 실제 연결 검사
```

```yaml
# charts/exam-platform/values-prod.yaml
config:
  mongodbHost: ""  # 빈 값이면 Health Check Skip
```

**검증 결과:**
```bash
$ curl -sk https://exam.example.com/api/v1/health/ready/ | jq .
{
  "status": "ready",
  "checks": {
    "postgresql": "connected",
    "mongodb": "not configured",
    "redis": "connected"
  }
}
```

---

### 2.2 startupProbe Timeout 문제

**Issue:** #157
**PR:** #160

**증상:**
```bash
$ kubectl describe pod backend-xxx -n exam-platform-staging
Events:
  Warning  Unhealthy  10s  kubelet  Startup probe failed: HTTP probe failed with statuscode: 500
  Normal   Killing    10s  kubelet  Container backend failed startup probe, will be restarted
```

**원인:**
- Django Application 초기화(DB Migration, Static Files 수집 등)에 30초 이상 소요
- 기본 `startupProbe` Timeout(10초)으로는 부족

**해결:**
```yaml
# charts/exam-platform/templates/backend-deployment.yaml
startupProbe:
  httpGet:
    path: /api/v1/health/live/
    port: 8000
  initialDelaySeconds: 15
  periodSeconds: 10
  timeoutSeconds: 10
  failureThreshold: 30  # 최대 5분(10초 × 30회) 대기
```

**Probe 역할 분리:**

| Probe | 목적 | 실패 시 동작 |
|-------|------|-------------|
| `startupProbe` | Container 시작 완료 확인 | 재시작 |
| `livenessProbe` | Application 정상 동작 확인 | 재시작 |
| `readinessProbe` | Traffic 수신 가능 확인 | Service에서 제외 |

**검증 결과:**
```bash
$ kubectl get pods -n exam-platform-prod -o wide
NAME                                               READY   STATUS    RESTARTS   AGE
exam-prod-exam-platform-backend-5dc97976bc-2xksf   1/1     Running   0          5h1m
exam-prod-exam-platform-backend-5dc97976bc-l2bzb   1/1     Running   0          5h2m
exam-prod-exam-platform-frontend-5f48554d9-8mcb5   1/1     Running   0          4h26m
exam-prod-exam-platform-frontend-5f48554d9-qqnzl   1/1     Running   0          4h26m
```

---

### 2.3 ALLOWED_HOSTS 보안 취약점

**Issue:** #159
**PR:** #162

**증상:**
```bash
$ kubectl logs backend-xxx -n exam-platform-staging | grep "DisallowedHost"
DisallowedHost at /api/v1/health/live/
Invalid HTTP_HOST header: '10.200.0.15:8000'
```
- Probe가 Pod IP로 요청하여 Django `ALLOWED_HOSTS` 검증 실패
- 임시 해결책으로 `ALLOWED_HOSTS="*"` 설정 → 보안 취약점 발생

**보안 위험:**

| 공격 유형 | 설명 |
|----------|------|
| Host Header Injection | 악성 Host Header로 캐시 오염 |
| Password Reset Hijacking | 비밀번호 재설정 링크 탈취 |

**해결:**
```yaml
# charts/exam-platform/values-prod.yaml
config:
  allowedHosts: "exam.example.com,localhost"

backend:
  livenessProbe:
    httpGet:
      path: /api/v1/health/live/
      port: 8000
      httpHeaders:
        - name: Host
          value: "exam.example.com"  # Probe에 Host Header 명시
```

**검증 결과:**
```bash
# Probe 요청 시뮬레이션
$ kubectl exec -it backend-xxx -n exam-platform-prod -- \
    curl -H "Host: exam.example.com" http://localhost:8000/api/v1/health/live/
{"status": "healthy"}

# 잘못된 Host Header 테스트
$ kubectl exec -it backend-xxx -n exam-platform-prod -- \
    curl -H "Host: malicious.com" http://localhost:8000/api/v1/health/live/
<!DOCTYPE html>
<html><head><title>400 Bad Request</title></head>
<body><h1>Bad Request (400)</h1></body></html>
```

---

### 2.4 Django SSL Redirect Loop

**PR:** `8c2a8d8`

**증상:**
```bash
$ curl -I https://exam.example.com/api/v1/health/live/
HTTP/1.1 301 Moved Permanently
Location: https://exam.example.com/api/v1/health/live/

$ kubectl describe pod backend-xxx -n exam-platform-prod
Events:
  Warning  Unhealthy  Readiness probe failed: HTTP probe failed with statuscode: 301
```
- Health Check Endpoint가 301 Redirect 반환
- Probe 실패로 Pod가 Ready 상태가 되지 않음

**원인:**
- `SECURE_SSL_REDIRECT=True` 설정으로 Django가 모든 HTTP 요청을 HTTPS로 Redirect
- Kubernetes Probe는 HTTP로 요청 → 301 응답 → 실패

**해결:**
```yaml
# charts/exam-platform/values-prod.yaml
config:
  # Ingress에서 SSL Termination 처리, Django 내부 Redirect 불필요
  secureSSLRedirect: "False"
```

**아키텍처:**
```
[Client] --HTTPS--> [Ingress] --HTTP--> [Backend Pod]
                        ↑
                  SSL Termination
```

**검증 결과:**
```bash
$ curl -sk https://exam.example.com/api/v1/health/ready/ | jq .
{
  "status": "ready",
  "checks": {
    "postgresql": "connected",
    "mongodb": "not configured",
    "redis": "connected"
  }
}

$ kubectl get pods -n exam-platform-prod -l app.kubernetes.io/name=exam-platform-backend
NAME                                               READY   STATUS    RESTARTS
exam-prod-exam-platform-backend-5dc97976bc-2xksf   1/1     Running   0
exam-prod-exam-platform-backend-5dc97976bc-l2bzb   1/1     Running   0
```

---

### 2.5 Image Registry 경로 불일치

**PR:** `fa6063a`

**증상:**
```bash
$ kubectl get pods -n exam-platform-prod
NAME                        READY   STATUS             RESTARTS
backend-xxx                 0/1     ImagePullBackOff   0

$ kubectl describe pod backend-xxx -n exam-platform-prod
Events:
  Warning  Failed   pull image "asia-northeast3-docker.pkg.dev/.../exam-platform/backend:fa6063a"
  Warning  Failed   Error: ImagePullBackOff
```

**원인:**
- Staging 삭제 후 Production 환경 구성 시 Image Registry 이름 변경
- `exam-platform` → `prod-exam-platform`으로 변경되었으나 ArgoCD Manifest 미반영

**해결:**
```yaml
# argocd/applications/overlays/prod/kustomization.yaml
- op: add
  path: /spec/source/helm/parameters
  value:
    - name: backend.image.repository
      value: asia-northeast3-docker.pkg.dev/titanium-k3s-20260123/prod-exam-platform/backend
    - name: frontend.image.repository
      value: asia-northeast3-docker.pkg.dev/titanium-k3s-20260123/prod-exam-platform/frontend
```

**검증 결과:**
```bash
$ kubectl get pods -n exam-platform-prod \
    -o custom-columns="NAME:.metadata.name,IMAGE:.spec.containers[0].image"
NAME                                               IMAGE
exam-prod-exam-platform-backend-5dc97976bc-2xksf   asia-northeast3-docker.pkg.dev/titanium-k3s-20260123/prod-exam-platform/backend:fa6063a
exam-prod-exam-platform-backend-5dc97976bc-l2bzb   asia-northeast3-docker.pkg.dev/titanium-k3s-20260123/prod-exam-platform/backend:fa6063a
exam-prod-exam-platform-frontend-5f48554d9-8mcb5   asia-northeast3-docker.pkg.dev/titanium-k3s-20260123/prod-exam-platform/frontend:cd9619a
exam-prod-exam-platform-frontend-5f48554d9-qqnzl   asia-northeast3-docker.pkg.dev/titanium-k3s-20260123/prod-exam-platform/frontend:cd9619a
```

---

## 3. ArgoCD / GitOps

### 3.1 App of Apps Pattern 검증 문제

**Issue:** #151
**PR:** #152

**증상:**
```bash
$ argocd app get root-app
Name:               root-app
Server:             https://kubernetes.default.svc
Namespace:          argocd
Sync Status:        Synced
Health Status:      Healthy
Resources:          (empty)  # 하위 Application 미생성
```
- Root Application이 하위 Application을 생성하지 못함

**원인:**
- ArgoCD Application CRD의 `spec.source.path` 경로 오류
- Directory Recurse 설정 누락

**해결:**
```yaml
# argocd/bootstrap/root-app.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: root-app
  namespace: argocd
spec:
  source:
    repoURL: git@github.com:DvwN-Lee/exam-platform.git
    targetRevision: release
    path: argocd
    directory:
      recurse: true
      include: '{generated/*.yaml,projects/*.yaml}'
```

**검증 결과:**
```bash
$ kubectl get application -n argocd
NAME                   SYNC     HEALTH
cluster-secret-store   Synced   Healthy
exam-prod              Synced   Healthy
external-secrets       Synced   Healthy
root-app               Synced   Healthy
```

---

### 3.2 Kustomize Overlay Patch 오류

**Issue:** #177
**PR:** #179

**증상:**
```bash
$ kustomize build argocd/applications/overlays/prod
Error: accumulating resources: MergePatches error:
  failed to find target for patch: kind=Application name=exam-platform
```

**원인:**
- Kustomize JSON Patch에서 `~1` Escape 누락 (슬래시 `/` → `~1`)
- Overlay에서 Base의 Namespace와 충돌

**해결:**
```yaml
# argocd/applications/overlays/prod/kustomization.yaml
patches:
  - target:
      kind: Application
      name: exam-platform
    patch: |-
      # app.kubernetes.io/instance의 슬래시를 ~1로 Escape
      - op: replace
        path: /metadata/labels/app.kubernetes.io~1instance
        value: prod
```

**검증 결과:**
```bash
$ kustomize build argocd/applications/overlays/prod | head -20
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  labels:
    app.kubernetes.io/instance: prod
    app.kubernetes.io/managed-by: argocd
    app.kubernetes.io/name: exam-platform
    environment: prod
  name: exam-prod
  namespace: argocd
...
```

---

### 3.3 Generated 파일과 Overlay 불일치

**Issue:** #177
**PR:** #179

**증상:**
- `kustomize build` 결과와 `argocd/generated/*.yaml` 파일 내용 불일치
- ArgoCD가 예상과 다른 설정으로 배포

**해결:**
CI에서 자동 검증 추가:
```yaml
# .github/workflows/kustomize-validate.yml
- name: Validate Kustomize Build
  run: |
    for env in staging prod; do
      kustomize build argocd/applications/overlays/$env > /tmp/$env.yaml
      diff -q /tmp/$env.yaml argocd/generated/exam-$env.yaml
    done
```

**검증 결과:**
```bash
$ kustomize build argocd/applications/overlays/prod > /tmp/prod.yaml
$ diff argocd/generated/exam-prod.yaml /tmp/prod.yaml
(no output - files are identical)
```

---

### 3.4 ClusterSecretStore Cluster 이름 오류

**PR:** `cb27da2`

**증상:**
```bash
$ kubectl get clustersecretstore -o wide
NAME                 AGE    STATUS                    CAPABILITIES   READY
gcp-secret-manager   10m    unable to create client   ReadWrite      False

$ kubectl describe clustersecretstore gcp-secret-manager
Status:
  Conditions:
    Message:  unable to create client: cannot create GCP client:
              error getting cluster "staging-exam-cluster"
```

**원인:**
- Workload Identity에서 참조하는 GKE Cluster 이름이 Staging으로 설정됨
- `staging-exam-cluster` → `prod-exam-cluster` 변경 필요

**해결:**
```yaml
# argocd/infra/cluster-secret-store/cluster-secret-store.yaml
spec:
  provider:
    gcpsm:
      projectID: titanium-k3s-20260123
      auth:
        workloadIdentity:
          clusterLocation: asia-northeast3
          clusterName: prod-exam-cluster  # 수정
          serviceAccountRef:
            name: external-secrets
            namespace: external-secrets
```

**검증 결과:**
```bash
$ kubectl get clustersecretstore -o wide
NAME                 AGE     STATUS   CAPABILITIES   READY
gcp-secret-manager   7h19m   Valid    ReadWrite      True
```

---

### 3.5 Auto Sync 설정 및 GitOps 흐름

**PR:** `28be1fb`

**증상:**
- 수동 Sync 필요로 배포 자동화 미흡
- GitOps 원칙에 맞지 않는 운영 방식

**해결:**
```yaml
# argocd/applications/overlays/prod/kustomization.yaml
- op: replace
  path: /spec/syncPolicy/automated
  value:
    prune: true
    selfHeal: true
    allowEmpty: false
```

**검증 결과 - GitOps Flow 테스트:**
```bash
# 1. Feature Branch → main PR → merge
$ gh pr create --base main --head feat/update-title
https://github.com/DvwN-Lee/exam-platform/pull/181

$ gh pr merge 181 --squash
✓ Merged pull request #181

# 2. main → release PR → merge
$ gh pr create --base release --head main
https://github.com/DvwN-Lee/exam-platform/pull/182

$ gh pr merge 182 --squash --admin
✓ Merged pull request #182

# 3. Cloud Build 자동 트리거 확인
$ gcloud builds list --region=asia-northeast3 --limit=1
ID                                    CREATE_TIME                STATUS
d092dd59-ab9b-4016-a425-5c723e209049  2026-02-03T09:46:32+00:00  SUCCESS

# 4. Git Write-Back 확인
$ git log origin/release --oneline -3
00c911a chore(cd): Frontend image tag cd9619a [skip ci]
cd9619a feat(frontend): 페이지 타이틀 변경 (#181) (#182)
28be1fb feat(argocd): exam-prod Auto Sync 활성화

# 5. ArgoCD Auto Sync 확인
$ kubectl get application exam-prod -n argocd \
    -o jsonpath='{.status.sync.status}{" "}{.status.health.status}'
Synced Healthy

# 6. Pod 업데이트 확인
$ kubectl get pods -n exam-platform-prod \
    -l app.kubernetes.io/name=exam-platform-frontend \
    -o custom-columns="NAME:.metadata.name,IMAGE:.spec.containers[0].image"
NAME                                               IMAGE
exam-prod-exam-platform-frontend-5f48554d9-8mcb5   .../frontend:cd9619a
exam-prod-exam-platform-frontend-5f48554d9-qqnzl   .../frontend:cd9619a

# 7. 배포 결과 확인
$ curl -sk https://exam.example.com/ | grep -o '<title>[^<]*</title>'
<title>Exam Platform</title>
```

---

## 4. CI/CD Pipeline

### 4.1 Git Write-Back wget 미지원

**PR:** `5b7f809`

**증상:**
```bash
Step #1: wget: command not found
Step #1: Error: Process completed with exit code 127.
```

**원인:**
- Cloud Build Step에서 사용한 Image(`gcr.io/cloud-builders/git`)에 `wget` 미포함
- `yq` 설치를 위해 `wget` 사용 시도

**해결:**
```yaml
# cloudbuild-backend.yaml
- name: gcr.io/cloud-builders/gcloud
  entrypoint: bash
  args:
    - -c
    - |
      # curl 사용 (gcloud image에 포함됨)
      curl -sL https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64 \
        -o /usr/bin/yq
      chmod a+x /usr/bin/yq
```

**검증 결과:**
```bash
$ gcloud builds list --region=asia-northeast3 --limit=3
ID                                    CREATE_TIME                STATUS
d092dd59-ab9b-4016-a425-5c723e209049  2026-02-03T09:46:32+00:00  SUCCESS
386b9e18-e529-4c4a-9e62-4c4867c70d11  2026-02-03T08:08:17+00:00  SUCCESS
89c5808c-4b65-463b-8289-a6a484fa414b  2026-02-03T08:08:12+00:00  SUCCESS
```

---

### 4.2 Cloud Build Trigger Branch 설정

**PR:** `5ec1459`

**증상:**
- `main` Branch Push 시 Production 배포 발생
- Staging/Production 분리 필요

**해결:**
```hcl
# terraform/modules/cloud-build/main.tf
resource "google_cloudbuild_trigger" "backend" {
  repository_event_config {
    push {
      branch = var.trigger_branch  # "release" for production
    }
  }

  included_files = ["examonline/**"]
}
```

**GitOps Flow:**
```
Feature Branch → main PR → release PR (승인 필요) → Cloud Build → ArgoCD Auto Sync
```

**검증 결과:**
```bash
# Release Branch Protection 확인
$ gh api repos/DvwN-Lee/exam-platform/branches/release/protection \
    --jq '.required_pull_request_reviews.required_approving_review_count'
1

# Branch 별 Trigger 동작 확인
$ gcloud builds triggers list --region=asia-northeast3 \
    --format="table(name,repositoryEventConfig.push.branch)"
NAME                  BRANCH
prod-backend-build    ^release$
prod-frontend-build   ^release$
```

---

### 4.3 GitHub Deploy Key 권한 문제

**PR:** `5ec1459`

**증상:**
```bash
Step #2: ERROR: Permission denied (publickey).
Step #2: fatal: Could not read from remote repository.
```

**원인:**
- Cloud Build에서 Git Push 시 SSH Key 권한 부족
- Deploy Key가 Read-only로 설정됨

**해결:**
1. GitHub Repository Settings에서 Deploy Key를 `Allow write access` 활성화
2. Secret Manager에 Private Key 저장:
```yaml
# cloudbuild-backend.yaml
availableSecrets:
  secretManager:
    - versionName: projects/$PROJECT_ID/secrets/github-deploy-key/versions/latest
      env: DEPLOY_KEY
```

**검증 결과:**
```bash
# Git Write-Back Commit 확인
$ git log origin/release --oneline -3
00c911a chore(cd): Frontend image tag cd9619a [skip ci]
cd9619a feat(frontend): 페이지 타이틀 변경 (#181) (#182)
28be1fb feat(argocd): exam-prod Auto Sync 활성화
```

---

## 5. External Secrets Operator

### 5.1 Workload Identity GCP SA 불일치

**PR:** `10df8b3`

**증상:**
```bash
$ kubectl get externalsecret -n exam-platform-prod
NAME                            STORE                STATUS
exam-prod-exam-platform-db      gcp-secret-manager   SecretSyncedError

$ kubectl describe externalsecret exam-prod-exam-platform-db -n exam-platform-prod
Status:
  Conditions:
    Message:  could not get secret data from provider:
              rpc error: code = PermissionDenied desc = Permission denied
```

**원인:**
- External Secrets Operator의 ServiceAccount Annotation이 Staging SA 참조
- `external-secrets-staging@...` → `external-secrets-prod@...` 변경 필요

**해결:**
```yaml
# argocd/add-ons/external-secrets/application.yaml
serviceAccount:
  annotations:
    iam.gke.io/gcp-service-account: external-secrets-prod@titanium-k3s-20260123.iam.gserviceaccount.com
```

```bash
# SA 변경 후 Pod 재시작 필요
kubectl rollout restart deployment external-secrets -n external-secrets
```

**검증 결과:**
```bash
$ kubectl get externalsecret -n exam-platform-prod -o wide
NAME                            STORE                REFRESH INTERVAL   STATUS         READY
exam-prod-exam-platform-app     gcp-secret-manager   1h                 SecretSynced   True
exam-prod-exam-platform-db      gcp-secret-manager   1h                 SecretSynced   True
exam-prod-exam-platform-gcs     gcp-secret-manager   1h                 SecretSynced   True
exam-prod-exam-platform-redis   gcp-secret-manager   1h                 SecretSynced   True

$ kubectl describe externalsecret exam-prod-exam-platform-db -n exam-platform-prod
Status:
  Conditions:
    Last Transition Time:   2026-02-03T07:46:52Z
    Message:                Secret was synced
    Reason:                 SecretSynced
    Status:                 True
    Type:                   Ready
  Refresh Time:             2026-02-03T13:46:59Z
Events:
  Type    Reason   Age                  From              Message
  ----    ------   ----                 ----              -------
  Normal  Updated  32m (x7 over 6h32m)  external-secrets  Updated Secret
```

---

### 5.2 Secret Sync 실패 디버깅

**디버깅 순서:**

1. ClusterSecretStore 상태 확인:
```bash
$ kubectl get clustersecretstore -o wide
NAME                 AGE     STATUS   CAPABILITIES   READY
gcp-secret-manager   7h19m   Valid    ReadWrite      True
```

2. ExternalSecret 상태 확인:
```bash
$ kubectl get externalsecret -n exam-platform-prod -o wide
NAME                            STORE                REFRESH INTERVAL   STATUS         READY
exam-prod-exam-platform-db      gcp-secret-manager   1h                 SecretSynced   True
```

3. GCP Secret Manager 권한 확인:
```bash
$ gcloud secrets get-iam-policy examonline-prod-db-password \
    --format="table(bindings.members,bindings.role)"
MEMBERS                                                                           ROLE
serviceAccount:external-secrets-prod@titanium-k3s-20260123.iam.gserviceaccount.com  roles/secretmanager.secretAccessor
```

4. Workload Identity 바인딩 확인:
```bash
$ gcloud iam service-accounts get-iam-policy \
    external-secrets-prod@titanium-k3s-20260123.iam.gserviceaccount.com \
    --format="table(bindings.members,bindings.role)"
MEMBERS                                                                                    ROLE
serviceAccount:titanium-k3s-20260123.svc.id.goog[external-secrets/external-secrets]        roles/iam.workloadIdentityUser
```

---

## 6. Backend (Django)

### 6.1 MongoDB Health Check Timeout

**PR:** `be47e90`

**증상:**
```bash
$ curl -w "%{time_total}s" http://localhost:8000/api/v1/health/ready/
{"status":"error","error":"Connection timeout"}
35.002s  # 35초 Timeout
```
- Health Check Endpoint 응답 시간 30초 이상
- MongoDB 연결 시도 중 Timeout

**원인:**
- MongoDB Host가 빈 값일 때도 연결 시도
- DNS Resolution 실패 대기 시간이 길어 전체 Health Check 지연

**해결:**
```python
# examonline/core/health.py
def check_mongodb():
    mongo_host = os.getenv("MONGODB_HOST", "")
    if not mongo_host:
        return {"status": "skipped"}

    try:
        client = MongoClient(mongo_host, serverSelectionTimeoutMS=5000)
        client.server_info()
        return {"status": "healthy"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}
```

**검증 결과:**
```bash
$ curl -w "\nTime: %{time_total}s\n" -sk \
    https://exam.example.com/api/v1/health/ready/ | jq .
{
  "status": "ready",
  "checks": {
    "postgresql": "connected",
    "mongodb": "not configured",
    "redis": "connected"
  }
}
Time: 0.234s
```

---

### 6.2 시험 수정 시 start_time 재검증 오류

**Issue:** #114
**PR:** #115

**증상:**
```bash
$ curl -X PATCH /api/v1/examinations/1/ -d '{"title": "Updated Title"}'
{
  "start_time": ["Start time must be in the future"]
}
```
- 이미 시작된 시험의 제목만 수정해도 `start_time must be in the future` 오류 발생

**원인:**
- 수정 API에서 `start_time` 필드가 변경되지 않아도 매번 검증 수행

**해결:**
```python
# examonline/examinations/serializers.py
def validate_start_time(self, value):
    # 수정 시에는 기존 값과 동일하면 검증 Skip
    if self.instance and self.instance.start_time == value:
        return value

    if value <= timezone.now():
        raise serializers.ValidationError("Start time must be in the future")
    return value
```

**검증 결과:**
```bash
$ curl -X PATCH /api/v1/examinations/1/ -d '{"title": "Updated Title"}'
{
  "id": 1,
  "title": "Updated Title",
  "start_time": "2026-01-01T09:00:00Z",
  ...
}
```

---

### 6.3 score_trend API 필드 누락

**Issue:** #60
**PR:** 관련 커밋

**증상:**
```bash
$ curl /api/v1/dashboard/score-trend/
{
  "scores": [...],
  "average": 85.5
}
# total_score 필드 누락
```
- Frontend에서 `total_score` 필드 참조 시 `undefined` 반환
- 점수 추이 그래프 렌더링 실패

**원인:**
- Backend API Response에 `total_score` 필드 누락

**해결:**
```python
# examonline/dashboard/views.py
def get_score_trend(self, request):
    return Response({
        "scores": [...],
        "total_score": self.calculate_total_score(),  # 필드 추가
        "average": self.calculate_average()
    })
```

**검증 결과:**
```bash
$ curl /api/v1/dashboard/score-trend/
{
  "scores": [...],
  "total_score": 450,
  "average": 85.5
}
```

---

## 7. Frontend (React)

### 7.1 Dark Mode 미적용 컴포넌트

**Issue:** #167 관련
**PR:** #167

**증상:**
- 특정 컴포넌트에서 Dark Mode 전환 시 배경이 흰색으로 유지
- Light/Dark Mode 혼용으로 가독성 저하

**원인:**
- Tailwind CSS `dark:` Variant 누락
- 일부 컴포넌트에서 Hardcoded 색상 사용

**해결:**
```tsx
// 수정 전
<div className="bg-white">

// 수정 후
<div className="bg-white dark:bg-gray-800">
```

공통 색상 상수 추출:
```typescript
// src/constants/theme.ts
export const COLORS = {
  background: {
    primary: 'bg-white dark:bg-gray-900',
    secondary: 'bg-gray-50 dark:bg-gray-800',
  },
  text: {
    primary: 'text-gray-900 dark:text-white',
    secondary: 'text-gray-600 dark:text-gray-400',
  },
};
```

**검증 결과:**
```bash
# Dark Mode 관련 클래스 적용 확인
$ grep -r "dark:" frontend/src/components/ | wc -l
247  # 247개 Dark Mode 클래스 적용
```

---

### 7.2 시험 생성 폼 datetime-local 오류

**Issue:** #94
**PR:** #97

**증상:**
- 시험 생성 시 날짜/시간 입력 후 다른 필드 클릭 시 값이 초기화됨

**원인:**
- `datetime-local` Input의 `value` 속성이 Controlled Component로 관리되지 않음
- State 업데이트 시 기본값으로 Reset

**해결:**
```tsx
// src/features/examinations/CreateExaminationPage.tsx
const [startTime, setStartTime] = useState<string>(() => {
  // 기본값: 현재 시간 + 1시간
  const date = new Date();
  date.setHours(date.getHours() + 1);
  return date.toISOString().slice(0, 16);
});

<input
  type="datetime-local"
  value={startTime}
  onChange={(e) => setStartTime(e.target.value)}
/>
```

**검증 결과:**
```bash
# E2E 테스트 통과 확인
$ npm run test:e2e -- --grep "시험 생성"
  ✓ 시험 생성 폼에서 날짜/시간 입력 유지 (1.2s)
  ✓ 다른 필드 입력 후에도 날짜/시간 값 유지 (0.8s)
```

---

### 7.3 NaN 렌더링 이슈

**PR:** `34e5e3e`

**증상:**
```
TestPaper 생성 페이지:
  총점: NaN점
```
- TestPaper 생성 페이지에서 점수 표시 부분에 `NaN` 출력

**원인:**
- 빈 배열에서 `reduce()`로 합계 계산 시 초기값 미지정
- `undefined + number = NaN`

**해결:**
```typescript
// 수정 전
const total = questions.reduce((sum, q) => sum + q.score);

// 수정 후
const total = questions.reduce((sum, q) => sum + (q.score || 0), 0);
```

**검증 결과:**
```bash
# Unit 테스트 추가
$ npm run test -- --grep "총점 계산"
  ✓ 빈 문제 목록에서 총점은 0 (2ms)
  ✓ 문제 점수 합산 정상 동작 (1ms)
```

---

### 7.4 Backend Error Message 추출 실패

**Issue:** #6
**PR:** #141

**증상:**
```
오류 발생: [object Object]
```
- API 오류 시 `[object Object]` 또는 빈 메시지 표시
- 사용자에게 의미 있는 오류 메시지 전달 실패

**원인:**
- Axios Error Response 구조 파싱 로직 부재
- Backend의 다양한 오류 응답 형식 미처리

**해결:**
```typescript
// src/utils/errorHandler.ts
export function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;

    // Django REST Framework 오류 형식
    if (data?.detail) return data.detail;
    if (data?.message) return data.message;
    if (data?.non_field_errors) return data.non_field_errors[0];

    // Field 별 오류
    if (typeof data === 'object') {
      const firstKey = Object.keys(data)[0];
      if (firstKey && Array.isArray(data[firstKey])) {
        return `${firstKey}: ${data[firstKey][0]}`;
      }
    }

    return error.message;
  }

  return 'An unexpected error occurred';
}
```

**검증 결과:**
```bash
# 다양한 오류 형식 테스트
$ npm run test -- --grep "extractErrorMessage"
  ✓ detail 형식 오류 추출 (1ms)
  ✓ non_field_errors 형식 오류 추출 (1ms)
  ✓ field 별 오류 추출 (1ms)
  ✓ 알 수 없는 형식 기본 메시지 (1ms)
```

---

## 8. E2E Testing

### 8.1 PieChart 클릭 테스트 Flaky

**Issue:** #126
**PR:** #130

**증상:**
```bash
$ npm run test:e2e
  ✗ Dashboard PieChart click filters data
    Timeout waiting for selector '[data-testid="pie-chart"] path'

# CI에서 간헐적 실패 (로컬에서는 통과)
```
- Dashboard PieChart 클릭 테스트가 간헐적으로 실패
- CI 환경에서 실패율 높음

**원인:**
- Chart 렌더링 완료 전 클릭 이벤트 발생
- Animation 완료 대기 로직 부재

**해결:**
```typescript
// frontend/e2e/tests/dashboard.spec.ts
test('PieChart click filters data', async ({ page }) => {
  // Chart 렌더링 완료 대기
  await page.waitForSelector('[data-testid="pie-chart"] svg', {
    state: 'visible',
  });

  // Animation 완료 대기
  await page.waitForTimeout(500);

  // Chart Segment 클릭
  await page.click('[data-testid="pie-chart"] path:first-child');
});
```

**검증 결과:**
```bash
# 10회 연속 실행 안정성 테스트
$ for i in {1..10}; do npm run test:e2e -- --grep "PieChart"; done
  Run 1: ✓ Passed
  Run 2: ✓ Passed
  ...
  Run 10: ✓ Passed

# Flaky 테스트 제거 완료
```

---

### 8.2 E2E API 테스트 환경 설정 문제

**Issue:** #125
**PR:** #128

**증상:**
```bash
# GitHub Actions CI
Error: connect ECONNREFUSED 127.0.0.1:8000
```
- E2E 테스트에서 API 호출 시 `ECONNREFUSED` 오류
- GitHub Actions CI에서만 실패

**원인:**
- CI 환경에서 Backend Server URL이 `localhost:8000`으로 설정
- Docker Compose Network에서는 Service 이름으로 접근 필요

**해결:**
```yaml
# .github/workflows/e2e.yml
env:
  VITE_API_BASE_URL: http://backend:8000

services:
  backend:
    image: exam-platform-backend
    ports:
      - 8000:8000
```

```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

**검증 결과:**
```bash
# GitHub Actions CI 실행 결과
Run npm run test:e2e
  ✓ 로그인 테스트 (2.1s)
  ✓ 대시보드 로드 테스트 (1.8s)
  ✓ 시험 생성 테스트 (3.2s)
  ...

  32 passed (45.2s)
```

---

### 8.3 Redis 서비스 누락

**Issue:** #121
**PR:** #122

**증상:**
```bash
# GitHub Actions CI
ConnectionError: Error 111 connecting to localhost:6379. Connection refused.
```

**원인:**
- GitHub Actions E2E Workflow에 Redis 서비스 미정의
- Backend의 Celery/Cache가 Redis 연결 필요

**해결:**
```yaml
# .github/workflows/e2e.yml
services:
  redis:
    image: redis:7-alpine
    ports:
      - 6379:6379
    options: >-
      --health-cmd "redis-cli ping"
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
```

**검증 결과:**
```bash
# GitHub Actions Service 상태
Services:
  redis: redis:7-alpine (healthy)
  postgres: postgres:15-alpine (healthy)
  backend: exam-platform-backend (healthy)

# E2E 테스트 통과
  ✓ All 32 tests passed
```

---

## 부록: 디버깅 명령어 모음

### Kubernetes

```bash
# Pod 상태 확인
kubectl get pods -n exam-platform-prod -o wide

# Pod 로그 확인
kubectl logs -n exam-platform-prod deployment/exam-prod-exam-platform-backend -f

# Pod 이벤트 확인
kubectl describe pod -n exam-platform-prod <pod-name>

# Secret 확인
kubectl get secret -n exam-platform-prod exam-platform-secrets -o jsonpath='{.data.DB_HOST}' | base64 -d
```

### ArgoCD

```bash
# Application 상태 확인
kubectl get application -n argocd

# Sync 상태 상세
argocd app get exam-prod

# 강제 Sync
argocd app sync exam-prod --force

# Diff 확인
argocd app diff exam-prod
```

### External Secrets

```bash
# ClusterSecretStore 상태
kubectl get clustersecretstore -o wide

# ExternalSecret 상태
kubectl get externalsecret -n exam-platform-prod -o wide

# Secret 동기화 이벤트
kubectl describe externalsecret -n exam-platform-prod exam-platform-external-secret
```

### GCP

```bash
# Cloud Build 로그
gcloud builds log <build-id> --region=asia-northeast3

# Secret Manager 접근 테스트
gcloud secrets versions access latest --secret=examonline-prod-db-password

# Workload Identity 확인
gcloud iam service-accounts get-iam-policy external-secrets-prod@$PROJECT_ID.iam.gserviceaccount.com
```

---

## 최종 검증 결과 (Production 환경)

### Infrastructure 상태
```bash
$ kubectl get application -n argocd
NAME                   SYNC     HEALTH
cluster-secret-store   Synced   Healthy
exam-prod              Synced   Healthy
external-secrets       Synced   Healthy
root-app               Synced   Healthy
```

### Pod 상태
```bash
$ kubectl get pods -n exam-platform-prod -o wide
NAME                                               READY   STATUS    RESTARTS   AGE
exam-prod-exam-platform-backend-5dc97976bc-2xksf   1/1     Running   0          5h1m
exam-prod-exam-platform-backend-5dc97976bc-l2bzb   1/1     Running   0          5h2m
exam-prod-exam-platform-frontend-5f48554d9-8mcb5   1/1     Running   0          4h26m
exam-prod-exam-platform-frontend-5f48554d9-qqnzl   1/1     Running   0          4h26m
```

### External Secrets 상태
```bash
$ kubectl get externalsecret -n exam-platform-prod -o wide
NAME                            STORE                REFRESH INTERVAL   STATUS         READY
exam-prod-exam-platform-app     gcp-secret-manager   1h                 SecretSynced   True
exam-prod-exam-platform-db      gcp-secret-manager   1h                 SecretSynced   True
exam-prod-exam-platform-gcs     gcp-secret-manager   1h                 SecretSynced   True
exam-prod-exam-platform-redis   gcp-secret-manager   1h                 SecretSynced   True
```

### Health Check
```bash
$ curl -sk https://exam.example.com/api/v1/health/ready/ | jq .
{
  "status": "ready",
  "checks": {
    "postgresql": "connected",
    "mongodb": "not configured",
    "redis": "connected"
  }
}
```

### Ingress 상태
```bash
$ kubectl get ingress -n exam-platform-prod -o wide
NAME                      CLASS   HOSTS              ADDRESS        PORTS     AGE
exam-prod-exam-platform   nginx   exam.example.com   34.64.99.219   80, 443   5h54m
```

---

## 참고 자료

- [Kubernetes Probes 공식 문서](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
- [ArgoCD App of Apps Pattern](https://argo-cd.readthedocs.io/en/stable/operator-manual/cluster-bootstrapping/)
- [External Secrets Operator - GCP Provider](https://external-secrets.io/latest/provider/google-secrets-manager/)
- [Django ALLOWED_HOSTS 보안](https://docs.djangoproject.com/en/4.2/ref/settings/#allowed-hosts)
- [Cloud Build 2nd Gen Triggers](https://cloud.google.com/build/docs/automating-builds/create-manage-triggers)
