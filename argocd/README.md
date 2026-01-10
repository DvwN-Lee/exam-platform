# ArgoCD GitOps

ArgoCD 기반 GitOps 배포 구성입니다.

## Directory 구조

```
argocd/
├── install/
│   └── values.yaml              # ArgoCD Helm 설치 values
├── projects/
│   └── exam-platform.yaml       # AppProject 정의
├── applications/
│   ├── exam-dev.yaml            # Dev Application
│   ├── exam-staging.yaml        # Staging Application
│   └── exam-prod.yaml           # Prod Application
└── README.md
```

## ArgoCD 설치

### 사전 요구사항

- Kubernetes Cluster (GKE)
- Helm 3.x
- kubectl

### 설치

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

## Application 배포

### AppProject 생성

```bash
kubectl apply -f argocd/projects/exam-platform.yaml
```

### Application 생성

```bash
# Dev 환경
kubectl apply -f argocd/applications/exam-dev.yaml

# Staging 환경
kubectl apply -f argocd/applications/exam-staging.yaml

# Production 환경
kubectl apply -f argocd/applications/exam-prod.yaml
```

## 환경별 설정

| 환경 | Namespace | Sync Policy | Self-Heal |
|------|-----------|-------------|-----------|
| Dev | exam-dev | Automated | Yes |
| Staging | exam-staging | Automated | Yes |
| Prod | exam-prod | Manual | No |

## Sync Wave 순서

| Wave | Resources |
|------|-----------|
| -1 | Namespace |
| 0 | ConfigMap, Secret, ServiceAccount |
| 1 | Backend Deployment, Service |
| 2 | Frontend Deployment, Service |
| 3 | Ingress, HPA |

## Application 관리

### 상태 확인

```bash
# 전체 Application 목록
argocd app list

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
