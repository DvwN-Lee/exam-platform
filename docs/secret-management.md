# Secret Management 운영 가이드

Exam Platform의 Secret 관리 체계와 운영 절차를 기술한다.

---

## 인증 구조

```
GCP Secret Manager
    |
    | (Workload Identity - Service Account Key 불필요)
    v
External Secrets Operator (ESO)
    |
    | (1시간 간격 자동 Sync)
    v
Kubernetes Secret
    |
    | (env mount)
    v
Backend Pod
```

- GKE ServiceAccount에 Workload Identity Annotation을 설정하여 GCP IAM Role과 연결
- ESO의 `ClusterSecretStore`가 Workload Identity를 통해 GCP Secret Manager에 접근
- `ExternalSecret` Resource가 GCP Secret Manager의 값을 Kubernetes Secret으로 동기화

---

## 관리 대상 Secret 목록

### ExternalSecret 구성 (Staging/Production)

| ExternalSecret | Kubernetes Secret Name | 포함 Key |
|----------------|----------------------|----------|
| `exam-platform-db` | `exam-platform-db` | `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` |
| `exam-platform-redis` | `exam-platform-redis` | `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` |
| `exam-platform-app` | `exam-platform-app` | `SECRET_KEY`, `JWT_SECRET_KEY` |
| `exam-platform-gcs` | `exam-platform-gcs` | `GCS_BUCKET_NAME` |

### GCP Secret Manager Key Naming

GCP Secret Manager에서 각 Secret은 다음 형식으로 저장된다.

```
exam-platform-{환경}-{카테고리}
```

각 Secret은 JSON 형태로 여러 Key-Value Pair를 포함한다.

---

## 환경별 Secret 처리

| 환경 | 방식 | 설명 |
|------|------|------|
| **Local** | `secret.yaml` Inline | `values-local.yaml`에 직접 값 입력 |
| **Dev** | `secret.yaml` Inline | `values-dev.yaml`에 직접 값 입력 |
| **Staging** | ExternalSecret | GCP Secret Manager 자동 동기화 (1h Refresh) |
| **Production** | ExternalSecret | GCP Secret Manager 자동 동기화 (1h Refresh) |

Local/Dev 환경에서는 `charts/exam-platform/templates/secret.yaml`이 렌더링되며, Staging/Production에서는 `external-secret.yaml`이 렌더링된다. Values 파일의 `externalSecrets.enabled` 플래그로 분기한다.

---

## Bootstrap 절차 (초기 환경 구성)

새 환경에서 Secret 체계를 구성하는 절차이다.

### 1. GCP Secret Manager에 Secret 등록

Terraform으로 Cloud SQL, Memorystore를 생성하면 접속 정보가 출력된다. 해당 값을 GCP Secret Manager에 수동 등록한다.

```bash
# DB Secret 등록
gcloud secrets create exam-platform-{ENV}-db \
  --replication-policy="automatic"

gcloud secrets versions add exam-platform-{ENV}-db \
  --data-file=- <<EOF
{
  "POSTGRES_HOST": "...",
  "POSTGRES_PORT": "5432",
  "POSTGRES_DB": "...",
  "POSTGRES_USER": "...",
  "POSTGRES_PASSWORD": "..."
}
EOF

# Redis Secret 등록
gcloud secrets create exam-platform-{ENV}-redis \
  --replication-policy="automatic"

gcloud secrets versions add exam-platform-{ENV}-redis \
  --data-file=- <<EOF
{
  "REDIS_HOST": "...",
  "REDIS_PORT": "6379",
  "REDIS_PASSWORD": "..."
}
EOF

# App Secret 등록
gcloud secrets create exam-platform-{ENV}-app \
  --replication-policy="automatic"

gcloud secrets versions add exam-platform-{ENV}-app \
  --data-file=- <<EOF
{
  "SECRET_KEY": "...",
  "JWT_SECRET_KEY": "..."
}
EOF

# GCS Secret 등록
gcloud secrets create exam-platform-{ENV}-gcs \
  --replication-policy="automatic"

gcloud secrets versions add exam-platform-{ENV}-gcs \
  --data-file=- <<EOF
{
  "GCS_BUCKET_NAME": "..."
}
EOF
```

### 2. Workload Identity 설정

GKE ServiceAccount와 GCP ServiceAccount를 연결한다.

```bash
# GCP ServiceAccount에 Secret Manager 접근 권한 부여
gcloud projects add-iam-policy-binding {PROJECT_ID} \
  --member="serviceAccount:{GSA_NAME}@{PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Workload Identity 바인딩
gcloud iam service-accounts add-iam-policy-binding \
  {GSA_NAME}@{PROJECT_ID}.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="serviceAccount:{PROJECT_ID}.svc.id.goog[{NAMESPACE}/{KSA_NAME}]"
```

### 3. ESO 설치 및 ClusterSecretStore 생성

ESO Helm Chart를 설치하고 ClusterSecretStore를 생성한다. 이 과정은 Cluster 최초 구성 시 1회 수행한다.

### 4. ExternalSecret 배포 확인

ArgoCD Sync 후 ExternalSecret 상태를 확인한다.

```bash
kubectl get externalsecret -n {NAMESPACE}
# STATUS가 SecretSynced인지 확인
```

---

## Secret Rotation 절차

### 정기 Rotation

1. GCP Secret Manager에서 새 Secret Version 추가
2. ESO가 1시간 이내 자동 동기화
3. Pod Restart로 새 Secret 적용 (env mount 방식이므로 Restart 필요)

```bash
# 1. 새 Secret Version 추가
gcloud secrets versions add exam-platform-{ENV}-app \
  --data-file=- <<EOF
{
  "SECRET_KEY": "{NEW_VALUE}",
  "JWT_SECRET_KEY": "{NEW_VALUE}"
}
EOF

# 2. 즉시 동기화 (1시간 대기 불가 시)
kubectl annotate externalsecret exam-platform-app \
  -n {NAMESPACE} \
  force-sync=$(date +%s) --overwrite

# 3. Pod Rolling Restart
kubectl rollout restart deployment exam-platform-backend -n {NAMESPACE}
```

### 긴급 Rotation (Secret 유출 시)

1. 즉시 GCP Secret Manager에서 새 Secret Version 등록
2. 유출된 Secret Version 비활성화 (`gcloud secrets versions disable`)
3. ESO 강제 동기화 (위의 `annotate` 명령)
4. Pod Rolling Restart
5. Incident Log에 기록

---

## 문제 해결

### ExternalSecret이 Sync되지 않는 경우

```bash
# ExternalSecret 상태 확인
kubectl describe externalsecret {NAME} -n {NAMESPACE}

# ESO Controller 로그 확인
kubectl logs -n external-secrets deployment/external-secrets -f
```

주요 원인:
- Workload Identity 설정 오류 (IAM Binding 누락)
- GCP Secret Manager에 해당 Secret이 존재하지 않음
- ClusterSecretStore의 ProjectID 불일치

### Pod에서 Secret이 비어 있는 경우

- ExternalSecret의 `status.conditions`에서 에러 메시지 확인
- Kubernetes Secret이 생성되었는지 확인: `kubectl get secret {NAME} -n {NAMESPACE}`
- Secret의 Data 필드 확인: `kubectl get secret {NAME} -n {NAMESPACE} -o jsonpath='{.data}'`

---

## 참고 자료

| 문서 | 설명 |
|------|------|
| [Architecture Overview - Section 7.4](./architecture/README.md) | Secret Management 아키텍처 |
| [ADR-006](./architecture/adr/006-external-secrets-gcp-secret-manager.md) | ESO + Secret Manager 결정 근거 |
| `charts/exam-platform/templates/external-secret.yaml` | ExternalSecret 정의 |
| `charts/exam-platform/templates/secret.yaml` | Inline Secret (Dev/Local) |
