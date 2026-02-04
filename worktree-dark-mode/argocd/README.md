# ArgoCD GitOps (App of Apps Pattern)

ArgoCD 기반 GitOps 배포 구성입니다. App of Apps 패턴을 적용하여 Terraform과 ArgoCD의 책임을 분리했습니다.

## 아키텍처

```
Terraform (인프라 Bootstrap)
├── 인프라 (VPC, GKE, Cloud SQL, Redis, GCS, GAR)
├── Secret Manager
├── IAM / Workload Identity
├── ArgoCD 설치 (Helm)
└── Root App (유일한 Application)

ArgoCD (GitOps - Root App이 관리)
├── applications/overlays/* (환경별 Application)
├── projects/* (AppProject)
└── add-ons/* (ESO 등 Add-on)
```

## Directory 구조

```
argocd/
├── bootstrap/
│   └── root-app.yaml               # Root Application (Terraform이 적용)
├── applications/
│   ├── base/
│   │   ├── exam-platform.yaml      # 공통 Application Template
│   │   └── kustomization.yaml
│   └── overlays/
│       ├── dev/
│       │   └── kustomization.yaml  # Dev 환경 오버라이드
│       ├── staging/
│       │   └── kustomization.yaml  # Staging 환경 오버라이드
│       └── prod/
│           └── kustomization.yaml  # Prod 환경 오버라이드
├── projects/
│   └── exam-platform.yaml          # AppProject 정의
├── add-ons/
│   ├── external-secrets/
│   │   ├── application.yaml        # ESO Helm Chart Application
│   │   ├── cluster-secret-store.yaml
│   │   └── kustomization.yaml
│   └── kustomization.yaml
├── install/
│   └── values.yaml                 # ArgoCD Helm 설치 values
└── README.md
```

## 책임 분리

| 구분 | Terraform | ArgoCD (GitOps) |
|------|-----------|-----------------|
| 담당 | 인프라 프로비저닝 | Application 배포 |
| 범위 | VPC, GKE, Cloud SQL, Redis, GCS, GAR, Secret Manager, IAM | Applications, Projects, ESO Add-on |
| 변경 시점 | 인프라 변경 시 | `git push` 시 자동 |

## ArgoCD 설치

### 사전 요구사항

- Kubernetes Cluster (GKE)
- Helm 3.x
- kubectl

### 설치

Terraform을 통해 자동 설치됩니다.

```bash
cd terraform/environments/gcp-staging
terraform apply
```

수동 설치가 필요한 경우:

```bash
# 1. ArgoCD namespace 생성
kubectl create namespace argocd

# 2. ArgoCD Helm repository 추가
helm repo add argo https://argoproj.github.io/argo-helm
helm repo update

# 3. ArgoCD 설치
helm install argocd argo/argo-cd \
  -n argocd \
  -f argocd/install/values.yaml

# 4. 초기 admin password 확인
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d
```

### ArgoCD CLI 설치

```bash
# macOS
brew install argocd

# Linux
curl -sSL -o argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
chmod +x argocd
sudo mv argocd /usr/local/bin/
```

### CLI 로그인

```bash
# Port forward (로컬 테스트용)
kubectl port-forward svc/argocd-server -n argocd 8080:443

# 로그인
argocd login localhost:8080
```

## Application 관리

### App of Apps Pattern

Root App이 나머지 모든 Application을 자동으로 관리합니다. 새 Application이나 환경을 추가하려면:

1. `argocd/applications/overlays/`에 새 디렉토리 생성
2. `kustomization.yaml` 작성
3. Git commit/push

Root App이 변경을 감지하고 자동으로 새 Application을 생성합니다.

### 환경별 설정

| 환경 | Namespace | Sync Policy | Self-Heal |
|------|-----------|-------------|-----------|
| Dev | exam-dev | Automated | Yes |
| Staging | exam-staging | Automated | Yes |
| Prod | exam-prod | Manual | No |

### 상태 확인

```bash
# 전체 Application 목록
argocd app list

# Root App 상태 (모든 하위 Application 포함)
argocd app get root-app

# 특정 Application 상태
argocd app get exam-dev
argocd app get exam-staging
argocd app get exam-prod
```

### 수동 Sync

```bash
# Dev 환경 sync
argocd app sync exam-dev

# Production 환경 sync (수동 승인 필요)
argocd app sync exam-prod
```

### Refresh

```bash
# Hard refresh (Git에서 최신 상태 가져오기)
argocd app get exam-dev --hard-refresh
```

## Add-ons 관리

### External Secrets Operator

ESO는 ArgoCD Application으로 관리됩니다. 설정 변경 시:

1. `argocd/add-ons/external-secrets/application.yaml` 수정
2. Git commit/push
3. ArgoCD가 자동으로 변경 적용

### ClusterSecretStore

GCP Secret Manager와의 연동 설정:

```yaml
# argocd/add-ons/external-secrets/cluster-secret-store.yaml
spec:
  provider:
    gcpsm:
      # GCP Project ID (Terraform이 자동 치환)
      # 실제 값: titanium-k3s-20260123
      projectID: <YOUR_PROJECT_ID>
```

## Sync Wave 순서

| Wave | Resources |
|------|-----------|
| -1 | Namespace |
| 0 | ConfigMap, Secret, ServiceAccount |
| 1 | Backend Deployment, Service |
| 2 | Frontend Deployment, Service |
| 3 | Ingress, HPA |

## Rollback

### ArgoCD UI

1. ArgoCD Web UI 접속
2. Application 선택
3. History and Rollback 탭
4. 원하는 revision 선택 후 Rollback

### ArgoCD CLI

```bash
# Revision history 확인
argocd app history exam-prod

# 특정 revision으로 rollback
argocd app rollback exam-prod <REVISION>
```

### Kubernetes 직접 Rollback (긴급)

```bash
# 이전 ReplicaSet으로 rollback
kubectl rollout undo deployment/exam-platform-backend -n exam-prod
kubectl rollout undo deployment/exam-platform-frontend -n exam-prod

# 특정 revision으로 rollback
kubectl rollout undo deployment/exam-platform-backend \
  -n exam-prod --to-revision=<REVISION>
```

## Troubleshooting

### Application Sync 실패

```bash
# Sync 상태 및 오류 확인
argocd app get exam-dev

# 상세 로그 확인
argocd app logs exam-dev
```

### OutOfSync 상태 지속

```bash
# Diff 확인
argocd app diff exam-dev

# Hard refresh 후 재시도
argocd app get exam-dev --hard-refresh
argocd app sync exam-dev
```

### Pod 문제

```bash
# Pod 상태 확인
kubectl get pods -n exam-dev

# Pod 로그 확인
kubectl logs -n exam-dev -l app.kubernetes.io/name=exam-platform-backend

# Pod describe
kubectl describe pod -n exam-dev -l app.kubernetes.io/name=exam-platform-backend
```

### ESO 문제

```bash
# ClusterSecretStore 상태 확인
kubectl get clustersecretstore

# ExternalSecret 상태 확인
kubectl get externalsecrets -A

# ESO Controller 로그 확인
kubectl logs -n external-secrets -l app.kubernetes.io/name=external-secrets
```

## RBAC

### Role 구조

| Role | 권한 |
|------|------|
| admin | 모든 Application/Repository 관리 |
| developer | dev/staging sync 가능, prod 조회만 |
| viewer | 조회 전용 |

### 그룹 매핑

```yaml
# values.yaml에서 설정
configs:
  rbac:
    policy.csv: |
      g, admin-group, role:admin
      g, dev-group, role:developer
```

## 알림 설정

Slack 알림 설정은 `argocd/install/values.yaml`의 notifications 섹션에서 관리합니다.

### Secret 생성

```bash
kubectl create secret generic argocd-notifications-secret \
  -n argocd \
  --from-literal=slack-token=<SLACK_TOKEN>
```

### 알림 종류

| Trigger | 설명 |
|---------|------|
| on-deployed | 배포 성공 시 |
| on-sync-failed | Sync 실패 시 |
| on-health-degraded | Health 저하 시 |

## Migration Guide

기존 Terraform 관리 리소스에서 App of Apps 패턴으로 마이그레이션:

### Step 1: Terraform State에서 기존 리소스 제거

```bash
cd terraform/environments/gcp-staging

# Application 리소스 제거 (클러스터에서는 유지됨)
terraform state rm kubernetes_manifest.argocd_project
terraform state rm kubernetes_manifest.argocd_app_staging

# ESO 리소스 제거 (ArgoCD가 재생성)
terraform state rm kubernetes_namespace.external_secrets
terraform state rm helm_release.external_secrets
terraform state rm kubernetes_manifest.cluster_secret_store
```

### Step 2: Terraform Apply

```bash
terraform plan   # Root App 생성만 표시되어야 함
terraform apply
```

### Step 3: ArgoCD Adoption 확인

```bash
# Root App이 기존 Application을 입양했는지 확인
kubectl get applications -n argocd

# 모든 Application이 Synced 상태인지 확인
kubectl get applications -n argocd -o wide
```
