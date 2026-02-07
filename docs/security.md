# Security Architecture

## 개요

Exam Platform Backend(Django)의 보안 아키텍처를 정리한다.
인증, 권한, 입력 검증, 암호화, Secret 관리 등 주요 보안 영역별 구현 현황과 설정을 기술한다.

---

## 1. Authentication (인증)

### JWT (SimpleJWT)

| 항목 | 설정값 | 파일 |
|------|--------|------|
| Access Token 수명 | 15분 | `config/api.py:40` |
| Refresh Token 수명 | 7일 | `config/api.py:41` |
| Token Rotation | True | `config/api.py:42` |
| Blacklist After Rotation | True | `config/api.py:43` |

- Custom Serializer(`CustomTokenObtainPairSerializer`)가 `user_type`, `nick_name`, `email` Claim을 Token에 추가한다.
- Refresh Token은 **HttpOnly Cookie**로 전달하여 XSS를 통한 Token 탈취를 방지한다.

### Refresh Token Cookie 설정

```python
# apps/user/api/views.py
response.set_cookie(
    key="refresh_token",
    value=refresh_token,
    httponly=True,
    samesite="Lax",
    secure=True,          # Production only
    max_age=604800,       # 7일
)
```

### Password 정책

`config/base.py`에 Django 기본 Password Validator 4종을 적용한다.

| Validator | 설명 |
|-----------|------|
| `UserAttributeSimilarityValidator` | 사용자 속성과 유사한 Password 차단 |
| `MinimumLengthValidator` | 최소 길이 검증 |
| `CommonPasswordValidator` | 자주 사용되는 Password 차단 |
| `NumericPasswordValidator` | 숫자로만 이루어진 Password 차단 |

Password는 Django 기본 PBKDF2 Algorithm으로 hashing되며, `user.set_password()` / `user.check_password()`를 사용한다.

---

## 2. Authorization (권한)

### Permission Classes

`core/api/permissions.py`에 정의된 Custom Permission:

| Class | 조건 | 용도 |
|-------|------|------|
| `IsTeacher` | `user.user_type == "teacher"` | 문제/시험지/시험 CRUD |
| `IsStudent` | `user.user_type == "student"` | 시험 응시 |
| `IsOwnerOrTeacher` | Teacher이거나 Object 소유자 | 문제/시험 접근 제어 |
| `IsExamCreator` | `obj.create_user == request.user` | 시험 수정/삭제 |
| `IsQuestionOwner` | Creator만 수정 가능, 학생은 공유된 문제만 조회 | 문제 접근 제어 |

DRF Default Permission은 `IsAuthenticated`로 설정되어, 모든 API Endpoint에 인증이 필수이다.

---

## 3. Input Validation (입력 검증)

### XSS Sanitization

`core/api/fields.py`에 `XSSSanitizedCharField`를 구현하여 사용자 입력에서 HTML Tag를 제거한다.

```python
# 2단계 sanitization
value = re.sub(r"<script[^>]*>.*?</script>", "", value)   # <script> 제거
value = re.sub(r"<style[^>]*>.*?</style>", "", value)      # <style> 제거
value = bleach.clean(value, tags=[], strip=True)            # 나머지 HTML Tag 제거
```

**적용 Serializer:**

| App | Serializer | Field |
|-----|-----------|-------|
| user | `SubjectSerializer` | `subject_name` |
| user | `UserRegistrationSerializer` | `student_name`, `student_id`, `student_class`, `student_school`, `teacher_name`, `teacher_school` |
| testquestion | `OptionWriteSerializer` | `option` |
| testquestion | `QuestionCreateSerializer` | `name` |
| testpaper | `TestPaperCreateSerializer` | `name` |
| testpaper | `ManualGradeSerializer` | `comment` |
| examination | `ExaminationCreateSerializer` | `name` |

### JSON Field Schema 검증

`SaveDraftSerializer.validate_answers()`에서 답안 JSON의 구조를 검증한다.

| 검증 항목 | 설명 |
|-----------|------|
| Key 형식 | 문제 ID (숫자 문자열)만 허용 |
| Value 형식 | `dict` 타입만 허용 |
| 허용 Key | `answer`, `selected_options`, `is_correct`, `score` 만 허용 |

### SQL Injection 방어

- Django ORM만 사용한다. `.raw()`, `.extra()`, `RawSQL` 사용이 없음을 확인하였다.
- 모든 Query는 ORM의 parameterized query로 처리된다.

### File Upload 검증

`core/api/validators.py`에 3단계 검증을 구현한다.

| Validator | 검증 내용 |
|-----------|-----------|
| `validate_image_extension` | 허용 확장자: jpg, jpeg, png, gif |
| `validate_image_size` | 최대 5MB |
| `validate_image_mime_type` | Magic number(파일 Header bytes) 기반 실제 파일 형식 검증 |

Magic number 검증은 확장자만 변경한 악성 파일 업로드를 방지한다.

---

## 4. Transport Security (전송 보안)

### Production SSL/TLS 설정

`config/production.py`에서 아래 설정을 적용한다.

| 설정 | 값 | 효과 |
|------|---|------|
| `SECURE_SSL_REDIRECT` | True | HTTP를 HTTPS로 Redirect |
| `SECURE_HSTS_SECONDS` | 31536000 (1년) | HSTS Header 적용 |
| `SECURE_HSTS_INCLUDE_SUBDOMAINS` | True | Subdomain 포함 |
| `SECURE_HSTS_PRELOAD` | True | Browser Preload List 등록 가능 |
| `SESSION_COOKIE_SECURE` | True | HTTPS 전용 Session Cookie |
| `CSRF_COOKIE_SECURE` | True | HTTPS 전용 CSRF Cookie |

### Content Security Headers

| 설정 | 효과 |
|------|------|
| `SECURE_BROWSER_XSS_FILTER = True` | `X-XSS-Protection` Header 추가 |
| `SECURE_CONTENT_TYPE_NOSNIFF = True` | `X-Content-Type-Options: nosniff` Header 추가 |
| `X_FRAME_OPTIONS = "DENY"` | Clickjacking 방지 |

---

## 5. CORS / CSRF

### CORS 설정

`config/api.py`에서 허용 Origin을 Development Host로 제한한다.

```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    # ...
]
CORS_ALLOW_CREDENTIALS = True  # HttpOnly Cookie 전송 허용
```

Production 환경에서는 배포 Domain만 허용하도록 환경 변수로 관리한다.

### CSRF 설정

- `CsrfViewMiddleware`가 Middleware Stack에 포함되어 있다.
- JWT 인증 API는 CSRF 검증에서 제외된다 (DRF의 `SessionAuthentication` 미사용 시).
- Refresh Token Cookie는 `SameSite=Lax`로 설정하여 Cross-site 요청에서의 Cookie 전송을 제한한다.

---

## 6. Middleware Stack

`config/base.py` 기준 Middleware 순서:

| 순서 | Middleware | 역할 |
|------|-----------|------|
| 1 | `SecurityMiddleware` | HTTPS Redirect, HSTS |
| 2 | `SessionMiddleware` | Session 관리 |
| 3 | `CorsMiddleware` | CORS Header 처리 |
| 4 | `CommonMiddleware` | URL Normalization |
| 5 | `CsrfViewMiddleware` | CSRF 검증 |
| 6 | `AuthenticationMiddleware` | 사용자 인증 |
| 7 | `MessageMiddleware` | Flash Message |
| 8 | `XFrameOptionsMiddleware` | Clickjacking 방지 |

---

## 7. Secret Management

### 환경 변수 기반 관리

모든 민감 정보는 `os.getenv()`로 환경 변수에서 로드한다.

| Secret | 환경 변수 | 비고 |
|--------|-----------|------|
| Django Secret Key | `SECRET_KEY` | Production에서 미설정 시 `ValueError` 발생 |
| DB Password | `POSTGRES_PASSWORD` | - |
| MongoDB Password | `MONGODB_PASSWORD` | 선택적 |
| Redis URL | `REDIS_URL` | - |
| AWS Credentials | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | S3 사용 시 |

- Development: `.env` 파일 + `python-dotenv`로 로드
- Production: Kubernetes Secret / GCP Secret Manager에서 환경 변수로 주입

---

## 8. Error Handling

`core/api/exceptions.py`에서 Custom Exception Handler를 구현한다.

| 환경 | 동작 |
|------|------|
| Development (`DEBUG=True`) | 전체 Error 상세 노출 |
| Production (`DEBUG=False`) | 5xx: 일반 메시지 반환, 4xx: Validation Error 메시지 유지 |

Production에서 Stack trace, Internal 경로 등 민감 정보가 Client에 노출되지 않는다.

---

## 9. Logging

### Production Logging 설정

`config/production.py` 기준:

| 항목 | 설정 |
|------|------|
| Format | JSON |
| Log Level (Root) | WARNING |
| Log Level (django.security) | ERROR |
| File Rotation | 10MB / 10 backups |
| Output | Console + File (`logs/django.log`) |

---

## 10. Rate Limiting

### DRF Throttling

`config/api.py`에서 DRF 기본 Throttling을 설정한다.

| Scope | Rate | 적용 대상 |
|-------|------|-----------|
| `anon` | 30/minute | 비인증 사용자 전체 API |
| `user` | 120/minute | 인증 사용자 전체 API |
| `auth` | 10/minute | Login, Token Refresh, Registration Endpoint |

`auth` Scope는 `ScopedRateThrottle`로 아래 View에 개별 적용한다.

| View | 파일 |
|------|------|
| `CustomTokenObtainPairView` | `apps/user/api/views.py` |
| `CustomTokenRefreshView` | `apps/user/api/views.py` |
| `UserRegistrationView` | `apps/user/api/views.py` |

---

## 11. Security Review 결과 요약

2025-02 기준 Backend 전체 Security Review를 수행하였다.

### 검토 항목

- SQL Injection, Command Injection, Path Traversal
- Authentication Bypass, Privilege Escalation
- Hardcoded Secrets, 취약 암호화
- Deserialization, XSS, eval/exec
- Sensitive Data Logging, API Data Leakage

### 결과

**Actionable Vulnerability: 0건**

검토된 주요 후보와 기각 사유:

| 후보 | 기각 사유 |
|------|-----------|
| `SaveDraftSerializer` 답안 JSON XSS | React JSX 자동 Escape. 추가로 JSON Schema 검증 구현 완료 |
| `ManualGradeSerializer` comment XSS | `XSSSanitizedCharField` 적용 완료. React 자동 Escape와 이중 방어 |
| Manual Grade score 조작 | `validate()` 메서드에서 question max score 검증. Race condition은 이론적 수준 |
| JSON Field Schema 미검증 | DOS/Resource Exhaustion 범주. Django `DATA_UPLOAD_MAX_MEMORY_SIZE` 2.5MB 제한 |

### 확인된 보안 패턴

| 영역 | 구현 현황 |
|------|-----------|
| Authentication | JWT + HttpOnly Refresh Token Cookie |
| XSS Prevention | `XSSSanitizedCharField` + React 자동 Escape |
| CSRF Protection | Django Middleware + SameSite Cookie |
| SQL Injection | Django ORM 전용 (raw query 0건) |
| Password | PBKDF2 Hashing + 4종 Validator |
| Permission | Role 기반 Custom Permission Class |
| File Upload | Extension + Size + MIME Type 3단계 검증 |
| Secret Management | 환경 변수 기반 (Production 필수) |
| HTTPS/TLS | HSTS + SSL Redirect |
| Error Handling | Production에서 민감 정보 비노출 |

### 개선 권장 사항 (구현 완료)

아래 항목은 현재 취약점은 아니나, Defense-in-depth 관점에서 권장되어 구현을 완료하였다.

| 항목 | 이전 상태 | 적용 내용 | 상태 |
|------|-----------|-----------|------|
| Rate Limiting | 미설정 | DRF Throttling 전역 적용 + Login/Register `auth` Scope (10/min) | 완료 |
| `SaveDraftSerializer` 답안 검증 | Type 검증만 수행 | Key(숫자)/Value(dict)/허용 Key 제한 Schema 검증 추가 | 완료 |
| `ManualGradeSerializer` comment | 일반 `CharField` | `XSSSanitizedCharField` 적용 | 완료 |

---

## 12. Infrastructure Security

### GKE Cluster

| 설정 | 값 | 파일 |
|------|---|------|
| Workload Identity | `${project_id}.svc.id.goog` | `terraform/modules/gke/main.tf:88-90` |
| Private Nodes | `enable_private_nodes = true` | `terraform/modules/gke/main.tf:73` |
| Master Authorized Networks | Admin IP CIDR 허용 목록 | `terraform/environments/gcp-prod/terraform.tfvars:27-40` |
| Shielded Nodes - Secure Boot | `enable_secure_boot = true` | `terraform/modules/gke/main.tf:164` |
| Shielded Nodes - Integrity Monitoring | `enable_integrity_monitoring = true` | `terraform/modules/gke/main.tf:165` |
| Workload Metadata Config | `mode = GKE_METADATA` | `terraform/modules/gke/main.tf:160` |
| Network Policy (Calico) | 활성화 | `terraform/modules/gke/main.tf:99-107` |
| Deletion Protection | `true` | `terraform/modules/gke/main.tf:52` |
| Auto Repair / Auto Upgrade | `true` / `true` | `terraform/modules/gke/main.tf:145-146` |

**Node Service Account IAM** (최소 권한 원칙 적용):

| Role | 용도 |
|------|------|
| `roles/logging.logWriter` | Cloud Logging 전송 |
| `roles/monitoring.metricWriter` | Cloud Monitoring Metric 전송 |
| `roles/artifactregistry.reader` | Container Image Pull |

---

### Cloud SQL (PostgreSQL)

| 설정 | 값 | 파일 |
|------|---|------|
| SSL Mode | `ENCRYPTED_ONLY` | `terraform/modules/cloudsql/main.tf:55` |
| Public IP | `false` (Private VPC 전용) | `terraform/modules/cloudsql/main.tf:53` |
| Deletion Protection | `true` | `terraform/modules/cloudsql/main.tf:43` |
| Automated Backup | 매일 03:00 UTC | `terraform/modules/cloudsql/main.tf:59-60` |
| Point-in-Time Recovery | `true` (7일 Transaction Log 보관) | `terraform/modules/cloudsql/main.tf:61-62` |
| Query Insights | 활성화 (Application Tag, Client Address 기록) | `terraform/modules/cloudsql/main.tf:77-81` |
| Password | `random_password` 24자 (특수문자 포함) | `terraform/modules/cloudsql/main.tf:24-32` |
| Secret Manager 연동 | Password를 GCP Secret Manager에 저장 | `terraform/modules/cloudsql/main.tf:129-154` |

---

### Memorystore (Redis)

| 설정 | 값 | 파일 |
|------|---|------|
| Authentication | `auth_enabled = true` | `terraform/modules/memorystore/main.tf:31` |
| Transit Encryption | `SERVER_AUTHENTICATION` | `terraform/modules/memorystore/main.tf:32` |
| Network | Private VPC 전용 (`authorized_network`) | `terraform/modules/memorystore/main.tf:29` |

Application 측 Redis SSL 설정:

```yaml
# charts/exam-platform/values-prod.yaml
redisSSL: "True"
redisSSLCertReqs: "none"  # GCP Memorystore SERVER_AUTHENTICATION 모드 권장 설정
```

`redisSSLCertReqs: "none"`은 GCP Memorystore가 자체 서명 인증서를 사용하기 때문이며, Transit Encryption 자체는 활성 상태이다.

---

### Kubernetes NetworkPolicy

`charts/exam-platform/templates/networkpolicy.yaml`에서 Ingress/Egress 트래픽을 제어한다.

**Ingress 규칙:**

| Source | Port | 용도 |
|--------|------|------|
| 동일 Namespace Pod | 전체 | 내부 Pod 간 통신 |
| `ingress-nginx` Namespace | TCP 8000, 80 | Ingress Controller 트래픽 |

**Egress 규칙:**

| Destination | Port | 용도 |
|------------|------|------|
| 모든 Namespace | UDP/TCP 53 | DNS Resolution |
| 동일 Namespace Pod | 전체 | 내부 Pod 간 통신 |
| 외부 (`0.0.0.0/0`) | TCP 5432, 6379, 443 | Cloud SQL, Redis, GCS/외부 API |
| **차단:** `169.254.169.254/32` | - | GCP Metadata Server 접근 차단 |

---

### Kubernetes Pod Security

| 설정 | 값 | 파일 |
|------|---|------|
| `runAsNonRoot` | `true` | `charts/exam-platform/values.yaml` (podSecurityContext) |
| `runAsUser` | `1000` | `charts/exam-platform/values.yaml` |
| `allowPrivilegeEscalation` | `false` | `charts/exam-platform/values.yaml` (securityContext) |
| `capabilities.drop` | `[ALL]` | `charts/exam-platform/values.yaml` |
| `automountServiceAccountToken` | `false` | `charts/exam-platform/templates/serviceaccount.yaml:14` |

---

### Secret Management (Production)

Production 환경에서는 External Secrets Operator + GCP Secret Manager 조합으로 Secret을 관리한다.

```
GCP Secret Manager --> ClusterSecretStore --> ExternalSecret --> Kubernetes Secret --> Pod Env
```

| 구성 요소 | 역할 | 파일 |
|-----------|------|------|
| `ClusterSecretStore` | GCP Secret Manager Backend 연결 | `argocd/add-ons/external-secrets/cluster-secret-store.yaml` |
| `ExternalSecret` | Secret Manager Key -> K8s Secret 동기화 (1h 주기) | `charts/exam-platform/templates/external-secret.yaml` |
| Workload Identity | Pod -> GCP API 인증 (Static Key 없이) | `terraform/modules/gke/main.tf:88-90` |

관리 대상 Secret:

| Secret | Secret Manager Key |
|--------|-------------------|
| DB Host/Port/Name/User/Password | `examonline-prod-db-*` |
| Redis Host/Port/Password | `examonline-prod-redis-*` |
| Django Secret Key | `examonline-prod-django-secret-key` |
| JWT Secret Key | `examonline-prod-jwt-secret-key` |
| GCS Bucket Name | `examonline-prod-gcs-bucket-name` |

---

### Terraform State 보안

| 설정 | 값 | 파일 |
|------|---|------|
| Backend | GCS Remote (`examonline-tf-state-*` Bucket) | `terraform/environments/gcp-prod/main.tf:35-38` |
| Uniform Bucket-Level Access | `true` | `terraform/modules/gcs-state-bucket/main.tf:7` |
| Versioning | `true` | `terraform/modules/gcs-state-bucket/main.tf:10` |
| Force Destroy | `false` | `terraform/modules/gcs-state-bucket/main.tf:5` |

---

### ArgoCD Security

| 설정 | 값 | 파일 |
|------|---|------|
| Ingress TLS | Let's Encrypt (`letsencrypt-prod`) | `argocd/install/values.yaml:23, 26-29` |
| Backend Protocol | HTTPS | `argocd/install/values.yaml:22` |
| SSL Redirect | `true` | `argocd/install/values.yaml:21` |

**RBAC 정책:**

| Role | 권한 |
|------|------|
| `role:admin` | applications, clusters, repositories, projects 전체 |
| `role:developer` | `exam-platform/*` Application에 대해 get, sync, logs 만 허용 |

Repository 인증 정보는 Terraform `kubernetes_secret`으로 관리하며, Helm values에는 포함하지 않는다.

---

### CI/CD Pipeline Security

| 항목 | 구현 | 파일 |
|------|------|------|
| GCP 인증 | Workload Identity Federation (Static Key 미사용) | `.github/workflows/cd-*.yml` |
| Permissions | `contents: read`, `id-token: write` (최소 권한) | `.github/workflows/cd-*.yml` |
| Production 배포 | `workflow_dispatch` (수동 Trigger 필수) | `.github/workflows/cd-prod.yml:12` |
| Environment 분리 | Namespace 분리 (`exam-dev`, `exam-staging`, `exam-platform-prod`) | 각 Workflow |
| Image Registry | 환경별 Artifact Registry Repository 분리 | 각 Workflow |
| Deployment 검증 | `kubectl rollout status` 확인 후 완료 처리 | 각 Workflow |
| Rollback | Helm `--atomic` Flag (실패 시 자동 Rollback) | `cd-dev.yml`, `cd-staging.yml` |

---

## 13. Infrastructure Security Review 결과 요약

2026-02 기준 전체 인프라 코드(`terraform/`, `argocd/`, `charts/`, `.github/workflows/`)에 대한 Security Review를 수행하였다.

### 검토 항목

- Hardcoded Secrets/Credentials
- IAM/RBAC 과잉 권한
- Network 보안 (Private Cluster, NetworkPolicy, Metadata Server 차단)
- 암호화 설정 (TLS/SSL, 저장 시 암호화)
- CI/CD Pipeline Injection
- Terraform State 노출

### 결과

**Actionable Vulnerability: 0건**

검토된 주요 후보와 기각 사유:

| 후보 | 기각 사유 |
|------|-----------|
| Admin IP 하드코딩 (`terraform.tfvars`) | IP 주소는 Credential이 아닌 Network 설정값. GKE는 TLS 인증으로 보호됨 |
| Bootstrap `terraform.tfstate` commit | GCS Bucket 메타데이터만 포함. Secret/Password 미포함 |
| NetworkPolicy Metadata Server IPv6 우회 | GKE Metadata Server는 IPv4 전용. DNS Rebinding도 L3 NetworkPolicy에서 차단됨 |
| Node `cloud-platform` OAuth Scope | Workload Identity 활성화 상태에서 GCP 권장 설정. Pod는 Node Credential 미사용 |
| ArgoCD bcrypt cost=10 | 업계 표준 기본값. 16자 Random Password + bcrypt 조합은 brute-force 불가 |
| DB Password in Terraform State | GCS Remote Backend + UBLA. Secret Manager 이중 관리 |
| Redis TLS 인증서 검증 미수행 | GCP Memorystore `SERVER_AUTHENTICATION` 모드 권장 설정. Private VPC 내부 통신 |
| GCP Project ID 하드코딩 | Project ID는 Public Identifier. 운영 편의 문제이며 보안 취약점 아님 |

### 확인된 인프라 보안 제어

| 영역 | 구현 현황 |
|------|-----------|
| Cluster | Private Nodes + Workload Identity + Shielded Nodes + Master Authorized Networks |
| Database | Private IP + ENCRYPTED_ONLY SSL + Automated Backup + PITR |
| Cache | AUTH + Transit Encryption (SERVER_AUTHENTICATION) + Private VPC |
| Network | Calico NetworkPolicy + Metadata Server 차단 + Namespace Egress 제어 |
| Pod | runAsNonRoot + drop ALL Capabilities + Token Auto-mount 비활성화 |
| Secret | External Secrets Operator + GCP Secret Manager + Workload Identity |
| State | GCS Remote Backend + UBLA + Versioning |
| CI/CD | Workload Identity Federation + 수동 Production 배포 + Atomic Rollback |
| ArgoCD | TLS Ingress + Role 기반 RBAC + Repository Credential 분리 관리 |
