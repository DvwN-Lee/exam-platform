# Terraform Bootstrap

Terraform State Bucket을 관리하기 위한 Bootstrap 구성.

---

## 개요

이 디렉토리는 Terraform State를 저장하는 GCS Bucket을 IaC로 관리합니다.
Bootstrap은 다른 Terraform 환경보다 먼저 실행되어야 하며, State Bucket 생성 후 해당 Bucket을 Backend로 사용합니다.

---

## 디렉토리 구조

```
bootstrap/
├── main.tf           # Provider 및 모듈 호출
├── variables.tf      # 입력 변수 정의
├── outputs.tf        # 출력 값 정의
└── README.md         # 본 문서
```

---

## 실행 순서

### Phase 1: 초기 실행 (Local State)

```bash
cd terraform/bootstrap

# 변수 설정
export TF_VAR_project_id="titanium-k3s-20260123"
export TF_VAR_environment="staging"

# 초기화 및 계획
terraform init
terraform plan

# 적용 (새 Bucket 생성 시)
terraform apply
```

### Phase 2: 기존 Bucket Import (선택)

기존에 수동 생성된 Bucket이 있는 경우:

```bash
terraform import module.state_bucket.google_storage_bucket.state \
  examonline-tf-state-titanium-k3s-20260123
```

### Phase 3: Backend 마이그레이션

State Bucket 생성 후, `main.tf`의 backend 블록 주석을 해제하고:

```bash
terraform init -migrate-state
```

---

## 변수

| 변수명 | 설명 | 기본값 |
|--------|------|--------|
| `project_id` | GCP Project ID | (필수) |
| `region` | GCP Region | `asia-northeast3` |
| `environment` | Environment 이름 | `staging` |
| `location` | GCS Bucket 위치 | `asia-northeast3` |

---

## 출력

| 출력명 | 설명 |
|--------|------|
| `state_bucket_name` | 생성된 State Bucket 이름 |
| `state_bucket_url` | GCS URL |
| `backend_config` | 다른 환경에서 사용할 Backend 설정 |

---

## 주의사항

- Bootstrap은 다른 Terraform 환경보다 먼저 실행해야 합니다.
- State Bucket에는 `force_destroy = false`가 설정되어 있어 실수로 삭제되지 않습니다.
- Versioning이 활성화되어 State 복구가 가능합니다.
- 90일 이상 된 이전 버전은 자동으로 NEARLINE Storage Class로 변경됩니다.
