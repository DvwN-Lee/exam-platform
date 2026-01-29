# Terraform Infrastructure

examonline 프로젝트를 위한 GCP Infrastructure as Code 구성이다.

## 구조

```
terraform/
├── bootstrap/                 # State Bucket 초기 생성
│   ├── main.tf
│   ├── variables.tf
│   └── outputs.tf
├── backend/                   # Remote State Backend 구성
│   ├── main.tf
│   ├── variables.tf
│   └── outputs.tf
├── modules/                   # 재사용 가능한 Module
│   ├── gcp-vpc/              # VPC Network, Subnet, Cloud NAT
│   ├── gke/                  # GKE Cluster, Node Pool
│   ├── cloudsql/             # Cloud SQL (PostgreSQL)
│   ├── memorystore/          # Memorystore (Redis)
│   ├── gcs/                  # Cloud Storage Bucket
│   ├── gcs-state-bucket/     # Terraform State Bucket
│   └── gar/                  # Artifact Registry
└── environments/
    └── gcp-staging/          # GCP Staging 환경
```

## 사전 요구사항

- Terraform >= 1.0.0
- `gcloud` CLI 인증 완료
- GCP Project 및 적절한 IAM 권한

## 환경 배포

### 1. State Bucket 생성 (최초 1회)

```bash
cd terraform/bootstrap
terraform init
terraform apply
```

### 2. Staging 환경 배포

```bash
cd terraform/environments/gcp-staging
terraform init
terraform plan -var-file=terraform.tfvars
terraform apply -var-file=terraform.tfvars
```

## Module 구성

| Module | 설명 | 주요 리소스 |
|--------|------|-------------|
| `gcp-vpc` | VPC Network | Network, Public/Private Subnet, Cloud Router, Cloud NAT, Firewall |
| `gke` | GKE Cluster | Cluster, Node Pool, Master Authorized Networks |
| `cloudsql` | Cloud SQL | PostgreSQL Instance, Database, User, Password |
| `memorystore` | Memorystore | Redis Instance |
| `gcs` | Cloud Storage | Bucket, Lifecycle, IAM |
| `gar` | Artifact Registry | Docker Repository |

## 민감 정보 관리

Database Password 등 민감 정보는 다음 방식으로 관리한다.

1. **GCP Secret Manager** (운영 권장)
   - Terraform이 생성한 Secret을 Secret Manager에 저장
   - External Secrets Operator가 Kubernetes Secret으로 동기화
2. **`terraform.tfvars`**
   - `.gitignore`에 의해 Git tracking 제외
   - SSH Key 등 CI/CD 환경에서 주입

## GKE Cluster 접근

```bash
gcloud container clusters get-credentials staging-exam-cluster \
  --region asia-northeast3 \
  --project <PROJECT_ID>

kubectl get nodes
kubectl get pods -A
```

## 주의사항

1. `terraform apply`는 실제 GCP 리소스를 생성하며 비용이 발생할 수 있다.
2. Production 환경 변경 시 반드시 `terraform plan`을 먼저 검토한다.
3. `deletion_protection`이 활성화된 리소스는 Terraform으로 직접 삭제할 수 없다.
4. State 파일은 민감 정보를 포함하므로 GCS Bucket 접근 권한을 제한한다.
