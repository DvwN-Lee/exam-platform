# Terraform Infrastructure

examonline 프로젝트를 위한 AWS Infrastructure as Code 구성입니다.

## 구조

```
terraform/
├── backend/                    # Remote State 인프라
│   ├── main.tf                # S3 bucket + DynamoDB table
│   ├── variables.tf
│   └── outputs.tf
├── modules/                    # 재사용 가능한 모듈
│   ├── vpc/                   # VPC, Subnet, NAT Gateway
│   ├── eks/                   # EKS Cluster, Node Group
│   ├── rds/                   # PostgreSQL RDS
│   ├── elasticache/           # Redis ElastiCache
│   ├── s3/                    # S3 Bucket
│   └── ecr/                   # ECR Repository
└── environments/              # 환경별 구성
    ├── dev/                   # Development
    ├── staging/               # Staging
    └── prod/                  # Production
```

## 사전 요구사항

- Terraform >= 1.0.0
- AWS CLI configured
- AWS 계정 및 적절한 IAM 권한

## 환경별 특성

| 특성 | Dev | Staging | Prod |
|------|-----|---------|------|
| VPC CIDR | 10.0.0.0/16 | 10.1.0.0/16 | 10.2.0.0/16 |
| AZ 수 | 2 | 2 | 3 |
| NAT Gateway | Single | Single | Per AZ |
| EKS Nodes | t3.medium (1-3) | t3.large (2-5) | t3.xlarge (3-10) |
| RDS | db.t3.micro | db.t3.small | db.t3.medium |
| RDS Multi-AZ | No | No | Yes |
| Redis Nodes | 1 | 2 (HA) | 3 (HA) |
| Deletion Protection | No | Yes | Yes |

## 초기 설정

### 1. Remote State Backend 생성

```bash
cd terraform/backend
terraform init
terraform plan
terraform apply
```

### 2. 환경 배포

```bash
# Development
cd terraform/environments/dev
terraform init
terraform plan -var-file=terraform.tfvars
terraform apply -var-file=terraform.tfvars

# Staging
cd terraform/environments/staging
terraform init
terraform plan -var-file=terraform.tfvars
terraform apply -var-file=terraform.tfvars

# Production
cd terraform/environments/prod
terraform init
terraform plan -var-file=terraform.tfvars
terraform apply -var-file=terraform.tfvars
```

## 모듈 설명

### VPC Module

Public/Private/Database Subnet을 포함한 VPC 구성입니다.

**주요 리소스:**
- VPC with DNS support
- Public Subnets (ALB, NAT Gateway용)
- Private Subnets (EKS nodes용)
- Database Subnets (RDS, ElastiCache용)
- NAT Gateway (Private subnet outbound용)
- Route Tables

**출력 값:**
- `vpc_id`, `public_subnet_ids`, `private_subnet_ids`
- `db_subnet_group_name`, `elasticache_subnet_group_name`

### EKS Module

Managed Kubernetes Cluster 구성입니다.

**주요 리소스:**
- EKS Cluster
- Managed Node Group
- IAM Roles (Cluster, Node)
- OIDC Provider (IRSA용)
- Security Groups

**출력 값:**
- `cluster_endpoint`, `cluster_certificate_authority_data`
- `oidc_provider_arn` (IRSA용)
- `node_security_group_id`

### RDS Module

PostgreSQL Database 구성입니다.

**주요 리소스:**
- RDS Instance (PostgreSQL)
- Parameter Group
- Security Group

**출력 값:**
- `db_instance_endpoint`, `db_instance_port`
- `db_instance_password` (auto-generated if not provided)

### ElastiCache Module

Redis Cache 구성입니다.

**주요 리소스:**
- ElastiCache Replication Group
- Parameter Group
- Security Group

**출력 값:**
- `primary_endpoint_address`, `reader_endpoint_address`
- `auth_token` (auto-generated if transit encryption enabled)

### S3 Module

Object Storage 구성입니다.

**주요 리소스:**
- S3 Bucket
- Versioning, Encryption
- CORS Configuration
- Lifecycle Rules
- CloudFront OAI (optional)

### ECR Module

Container Registry 구성입니다.

**주요 리소스:**
- ECR Repositories
- Lifecycle Policy
- Image Scanning

## 민감 정보 관리

Database 비밀번호 등 민감 정보는 다음 방법으로 관리합니다:

1. **환경 변수**
   ```bash
   export TF_VAR_database_password="secure-password"
   ```

2. **AWS Secrets Manager** (권장)
   - 별도 Secrets Manager에서 비밀번호 관리
   - Kubernetes External Secrets Operator로 주입

3. **Terraform Cloud/Enterprise**
   - Sensitive variables로 관리

## EKS 접근

배포 후 EKS Cluster에 접근하려면:

```bash
# kubeconfig 업데이트
aws eks update-kubeconfig --name examonline-dev --region ap-northeast-2

# 확인
kubectl get nodes
kubectl get pods -A
```

## 비용 최적화

**Development:**
- Single NAT Gateway
- t3.micro/t3.medium instances
- No Multi-AZ

**Production:**
- Reserved Instances 고려
- Spot Instances for non-critical workloads
- S3 Lifecycle policies for cost savings

## 주의사항

1. **`terraform apply`는 실제 AWS 리소스를 생성**합니다. 비용이 발생할 수 있습니다.

2. **Production 환경 변경 시** 반드시 `terraform plan`을 먼저 검토하세요.

3. **Deletion Protection**이 활성화된 리소스는 직접 삭제 불가합니다.

4. **State 파일**은 민감 정보를 포함할 수 있으므로 S3 버킷 접근을 제한하세요.

## 문제 해결

### State Lock 해제

DynamoDB lock이 남아있는 경우:
```bash
terraform force-unlock <LOCK_ID>
```

### State 불일치

실제 리소스와 State가 불일치하는 경우:
```bash
terraform refresh
# 또는 특정 리소스만
terraform import <resource_address> <resource_id>
```
