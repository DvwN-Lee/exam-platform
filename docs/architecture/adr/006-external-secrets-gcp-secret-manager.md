# ADR-006: External Secrets + GCP Secret Manager

## 상태 (Status)

`승인됨`

## 일자 (Date)

2025-04-10

## 상황 (Context)

Exam Platform의 Backend Pod는 다음 민감 정보를 필요로 한다.

- Database 접속 정보 (POSTGRES_HOST, PORT, DB, USER, PASSWORD)
- Redis 접속 정보 (REDIS_HOST, PORT, PASSWORD)
- Application Secret (SECRET_KEY, JWT_SECRET_KEY)
- GCS Bucket 정보 (GCS_BUCKET_NAME)

Kubernetes Secret 관리 방식으로 Git 내 Sealed Secrets, Vault, External Secrets Operator(ESO) + GCP Secret Manager를 검토했다.

## 결정 (Decision)

**External Secrets Operator(ESO) + GCP Secret Manager**를 Secret 관리 체계로 채택한다.

### 인증 구조

```
GCP Secret Manager -> (Workload Identity) -> ESO -> Kubernetes Secret -> Pod (env mount)
```

### ExternalSecret 구성 (4건)

| ExternalSecret | 포함 Secret |
|----------------|-------------|
| `exam-platform-db` | POSTGRES_HOST, PORT, DB, USER, PASSWORD |
| `exam-platform-redis` | REDIS_HOST, PORT, PASSWORD |
| `exam-platform-app` | SECRET_KEY, JWT_SECRET_KEY |
| `exam-platform-gcs` | GCS_BUCKET_NAME |

### 환경별 적용

| 환경 | Secret 방식 |
|------|-------------|
| Local/Dev | Helm `secret.yaml` Inline (직접 값 입력) |
| Staging/Production | ExternalSecret (GCP Secret Manager 동기화, 1시간 Refresh) |

## 이유 (Rationale)

### 검토 대안

| 대안 | 장점 | 단점 |
|------|------|------|
| **ESO + GCP Secret Manager** | Workload Identity 통합, GCP Native, 자동 Sync | ESO Operator 관리 필요 |
| **HashiCorp Vault** | Multi-Cloud, 동적 Secret, 세밀한 정책 | 별도 Cluster 운영 부담, 복잡한 초기 설정 |
| **Sealed Secrets** | Git에 암호화된 Secret 저장 가능 | Key Rotation 수동, Cloud Secret Manager 미통합 |
| **Git 내 평문 Secret** | 구현 단순 | 보안 위험 (Git History에 노출) |

### 선택 사유

- **Workload Identity 연계**: Service Account Key 파일 없이 GKE Pod에서 GCP Secret Manager에 접근. Credential 파일 관리 부담 제거
- **단일 Secret 관리 지점**: GCP Secret Manager에서 모든 Secret을 중앙 관리. Kubernetes Secret은 ESO가 자동 동기화
- **GCP 인프라 통합**: Terraform으로 Cloud SQL, Memorystore 생성 시 함께 Secret Manager에 값을 등록하여 일관된 Provisioning
- **Auto Refresh**: 1시간 간격 Sync로 Secret Manager 값 변경 시 수동 `kubectl` 작업 없이 반영

## 결과 (Consequences)

### 긍정적 결과

- Git Repository에 Secret 평문이 포함되지 않음 (ExternalSecret Manifest에는 Key 이름만 명시)
- Workload Identity 기반으로 Service Account Key 파일 불필요 -> Credential 유출 위험 제거
- Secret 변경 시 GCP Secret Manager에서만 수정하면 ESO가 자동 반영
- 환경별 Secret 방식 분기 (`secret.yaml` vs `external-secret.yaml`)로 Local 개발 편의성 확보

### 부정적 결과 / 트레이드오프

- ESO Operator를 Cluster에 별도 설치 및 관리해야 함
- 1시간 Refresh 간격으로 인해 긴급 Secret 변경 시 최대 1시간 지연 가능 (수동 Sync로 해결 가능)
- Local/Dev 환경에서는 `secret.yaml`에 값을 직접 입력해야 하므로 관리 방식이 이원화
- Workload Identity 설정 오류 시 Pod에서 Secret Manager 접근 불가 -> Bootstrap 순서 중요

## 참고 자료 (References)

- [Architecture Overview - Section 7.4](../README.md)
- [Secret Management 운영 가이드](../../secret-management.md)
- `charts/exam-platform/templates/external-secret.yaml`: ExternalSecret 정의
- `charts/exam-platform/templates/secret.yaml`: Inline Secret (Dev/Local)
