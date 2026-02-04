# GCP Staging Terraform 환경

## 개요

GCP Staging 환경의 Infrastructure를 Terraform으로 관리한다. ArgoCD를 통한 GitOps 배포 Pipeline을 포함한다.

## 파일 구조

| 파일 | 용도 |
|---|---|
| `main.tf` | Provider 선언, Backend 설정, Infrastructure Module 호출 |
| `kubernetes.tf` | Kubernetes, Helm, kubectl Provider 설정 |
| `argocd.tf` | ArgoCD Helm Release, Root Application, Repository Credentials |
| `variables.tf` | 입력 변수 정의 |
| `terraform.tfvars` | 환경별 변수 값 |
| `outputs.tf` | Output 정의 |
| `workload-identity.tf` | GKE Workload Identity 설정 |
| `secret-manager.tf` | Secret Manager 관련 리소스 |

## Provider 목록

| Provider | 용도 |
|---|---|
| `hashicorp/google ~> 5.0` | GCP 리소스 관리 |
| `hashicorp/kubernetes ~> 2.24` | Kubernetes 리소스 관리 |
| `hashicorp/helm ~> 2.12` | Helm Chart 배포 |
| `hashicorp/random ~> 3.6` | Random 값 생성 |
| `gavinbunney/kubectl ~> 1.14` | CRD 기반 Kubernetes Manifest 배포 |

### `kubectl` Provider 도입 배경

`hashicorp/kubernetes`의 `kubernetes_manifest`는 `terraform plan` 시점에 대상 CRD가 Cluster에 존재해야 한다. ArgoCD Application CRD는 Helm Release로 설치되므로, Fresh Cluster에서 `plan` -> `apply` 순서 실행 시 CRD 미존재로 실패한다.

`gavinbunney/kubectl`의 `kubectl_manifest`는 `plan` 시점에 CRD 검증을 수행하지 않아 이 문제를 해결한다.

## ArgoCD 구성

### Root Application (App of Apps)

Terraform이 관리하는 유일한 ArgoCD Application이다. Git Repository의 `argocd/` 디렉토리를 Source로 하여, 하위 Application과 Project를 자동 동기화한다.

- **Resource**: `kubectl_manifest.root_app`
- **Source Path**: `argocd/` (`generated/*.yaml`, `projects/*.yaml`)
- **Sync Policy**: Automated (prune, selfHeal)

### Repository Credentials

ArgoCD가 Private Git Repository에 접근하기 위한 SSH Deploy Key를 Kubernetes Secret으로 관리한다.

- **Resource**: `kubernetes_secret.argocd_repo_creds`
- **SSH Key Source**: GCP Secret Manager (`argocd-repo-ssh-key`)

SSH Key는 `TF_VAR_` 환경변수가 아닌 GCP Secret Manager에서 `data` source로 조회한다. CI/CD Pipeline에서 환경변수 주입 없이 자동으로 SSH Key를 참조할 수 있다.

## 사전 요구사항

### GCP Secret Manager에 SSH Key 등록

ArgoCD Repository 접근용 SSH Deploy Key를 Secret Manager에 등록해야 한다. Terraform `apply` 전 1회 수행한다.

```bash
# Secret 생성
gcloud secrets create argocd-repo-ssh-key \
  --project=titanium-k3s-20260123

# SSH Key 등록
gcloud secrets versions add argocd-repo-ssh-key \
  --data-file=~/.ssh/argocd_staging_deploy_key \
  --project=titanium-k3s-20260123
```

Terraform을 실행하는 Service Account에 `roles/secretmanager.secretAccessor` 권한이 필요하다.

### 필수 GCP API

```bash
gcloud services enable \
  secretmanager.googleapis.com \
  container.googleapis.com \
  compute.googleapis.com \
  sqladmin.googleapis.com \
  redis.googleapis.com \
  artifactregistry.googleapis.com \
  servicenetworking.googleapis.com \
  --project=titanium-k3s-20260123
```

## 배포 절차

### 초기 배포 (Fresh Cluster)

```bash
cd terraform/environments/gcp-staging

# Provider 초기화
terraform init -upgrade

# Plan 및 Apply
terraform plan -var-file=terraform.tfvars
terraform apply -var-file=terraform.tfvars
```

### 기존 `kubernetes_manifest` State 마이그레이션

`kubernetes_manifest.root_app`에서 `kubectl_manifest.root_app`으로 전환한 경우, 기존 State를 제거해야 한다.

```bash
# 기존 State 제거 (Cluster의 실제 리소스는 유지됨)
terraform state rm kubernetes_manifest.root_app

# 새 Resource로 Import 또는 Apply
terraform plan -var-file=terraform.tfvars
terraform apply -var-file=terraform.tfvars
```

## Destroy 시 주의사항

### `kubernetes_namespace.argocd` 삭제 지연

ArgoCD Helm Chart는 CRD에 `resource-policy: keep` Annotation을 설정한다. Namespace 삭제 시 CRD Finalizer가 정리될 때까지 대기가 발생한다. `kubernetes_namespace.argocd`에 `timeouts { delete = "10m" }`을 설정하여 충분한 대기 시간을 확보한다.

### `google_service_networking_connection` 삭제 실패

Cloud SQL, Memorystore 등이 VPC Peering을 사용 중인 상태에서 `google_service_networking_connection`을 삭제하면 실패한다. `deletion_policy = "ABANDON"`을 설정하여, Terraform State에서만 제거하고 실제 Peering Connection은 GCP에 유지하도록 한다. GCP는 해당 Peering을 사용하는 서비스가 모두 삭제된 후 자동으로 정리한다.

## 검증

```bash
# ArgoCD Root Application 확인
kubectl get applications -n argocd

# Repository Credentials Secret 확인
kubectl get secret repo-exam-platform -n argocd

# ArgoCD Sync 상태 확인
kubectl get applications root-app -n argocd -o jsonpath='{.status.sync.status}'
```
