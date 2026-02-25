# Exam Platform Helm Chart

Exam Platform(Django Backend + React Frontend)을 Kubernetes에 배포하기 위한 Helm Chart이다.

---

## Chart 정보

| 항목 | 값 |
|------|-----|
| Chart 이름 | `exam-platform` |
| Chart 버전 | 0.1.0 |
| App 버전 | 1.0.0 |
| API 버전 | v2 |
| 유형 | application |

---

## 디렉토리 구조

```
charts/exam-platform/
├── Chart.yaml                         # Chart 메타데이터
├── templates/
│   ├── _helpers.tpl                   # Template Helper 함수
│   ├── backend/
│   │   ├── deployment.yaml            # Django + Gunicorn Deployment
│   │   ├── hpa.yaml                   # HorizontalPodAutoscaler
│   │   └── service.yaml               # Backend Service (ClusterIP:8000)
│   ├── frontend/
│   │   ├── deployment.yaml            # Nginx + React SPA Deployment
│   │   └── service.yaml               # Frontend Service (ClusterIP:80)
│   ├── configmap.yaml                 # 비민감 환경 변수 (ALLOWED_HOSTS, DEBUG 등)
│   ├── secret.yaml                    # Inline Secret (Local/Dev 전용)
│   ├── external-secret.yaml           # ESO 연동 (Staging/Production)
│   ├── ingress.yaml                   # Ingress 규칙
│   ├── ingress-auth-rewrite.yaml      # Auth Redirect Ingress (선택)
│   ├── networkpolicy.yaml             # Calico Network Policy
│   ├── serviceaccount.yaml            # ServiceAccount (Workload Identity)
│   ├── namespace.yaml                 # Namespace 생성
│   └── NOTES.txt                      # 배포 후 안내 메시지
├── values.yaml                        # Default 값 (Development 기준)
├── values-local.yaml                  # Local 개발 환경
├── values-dev.yaml                    # Dev 환경
├── values-e2e.yaml                    # E2E 테스트 환경
├── values-staging.yaml                # Staging 환경
└── values-prod.yaml                   # Production 환경
```

---

## 환경별 Values 파일

| 파일 | 용도 | Secret 방식 | Namespace |
|------|------|-------------|-----------|
| `values.yaml` | Default 값 (기본 설정) | Inline (`secret.yaml`) | `exam-platform` |
| `values-local.yaml` | Local 개발 | Inline (`secret.yaml`) | `exam-platform` |
| `values-dev.yaml` | Dev 환경 | ExternalSecret (GCP SM) | `exam-dev` |
| `values-e2e.yaml` | E2E 테스트 | Inline (`secret.yaml`) | `exam-e2e` |
| `values-staging.yaml` | Staging 환경 | ExternalSecret (GCP SM) | `exam-platform-staging` |
| `values-prod.yaml` | Production 환경 | ExternalSecret (GCP SM) | `exam-platform-prod` |

---

## 주요 설정 항목

### Backend

| 항목 | Default | Staging | Production |
|------|---------|---------|------------|
| Replica | 1 | 2 | 2 (HPA: 1~10) |
| CPU Request/Limit | 100m / 500m | 200m / 1000m | 150m / 1000m |
| Memory Request/Limit | 256Mi / 512Mi | 512Mi / 1Gi | 512Mi / 1Gi |
| Gunicorn Workers | 2 | 3 | 2 |
| HPA | 미사용 | 미사용 | CPU 70% / Memory 80% |
| PDB | 미사용 | 미사용 | minAvailable: 1 |
| Startup Probe | 미사용 | 사용 | 사용 |

### Frontend

| 항목 | Default | Staging | Production |
|------|---------|---------|------------|
| Replica | 1 | 2 | 1 |
| CPU Request/Limit | 50m / 200m | 100m / 500m | 50m / 200m |
| Memory Request/Limit | 64Mi / 128Mi | 128Mi / 256Mi | 64Mi / 128Mi |

### Secret 관리

| 환경 | 방식 | 설정 |
|------|------|------|
| Local/Dev (inline) | `secrets.create: true` | `secret.yaml` 렌더링 |
| Staging/Production | `externalSecrets.enabled: true` | `external-secret.yaml` 렌더링 (GCP Secret Manager 동기화) |

### Pod Security

| 설정 | 값 |
|------|-----|
| `runAsNonRoot` | `true` |
| `runAsUser` | `1000` |
| `allowPrivilegeEscalation` | `false` |
| `capabilities.drop` | `[ALL]` |

---

## 배포 명령어

### Local 개발

```bash
helm upgrade --install exam-platform ./charts/exam-platform \
  --values ./charts/exam-platform/values-local.yaml \
  --namespace exam-platform \
  --create-namespace
```

### Staging

```bash
helm upgrade --install exam-platform ./charts/exam-platform \
  --values ./charts/exam-platform/values-staging.yaml \
  --namespace exam-platform-staging \
  --create-namespace \
  --set backend.image.tag="staging-v1.0.0" \
  --set frontend.image.tag="staging-v1.0.0" \
  --atomic \
  --timeout 10m
```

### Production

Production 환경은 ArgoCD를 통해 배포된다. 수동 배포가 필요한 경우:

```bash
helm upgrade --install exam-platform ./charts/exam-platform \
  --values ./charts/exam-platform/values-prod.yaml \
  --namespace exam-platform-prod \
  --set backend.image.repository="asia-northeast3-docker.pkg.dev/{PROJECT_ID}/prod-exam-platform/backend" \
  --set backend.image.tag="{SHORT_SHA}" \
  --set frontend.image.repository="asia-northeast3-docker.pkg.dev/{PROJECT_ID}/prod-exam-platform/frontend" \
  --set frontend.image.tag="{SHORT_SHA}" \
  --atomic \
  --timeout 10m
```

### Template 렌더링 확인

```bash
helm template exam-platform ./charts/exam-platform \
  --values ./charts/exam-platform/values-staging.yaml \
  --debug
```

---

## 관련 문서

| 문서 | 설명 |
|------|------|
| [Architecture Overview](../../docs/architecture/README.md) | 전체 아키텍처 (Section 5.3) |
| [ADR-005](../../docs/architecture/adr/005-helm-app-of-apps-pattern.md) | Helm App of Apps Pattern 결정 |
| [Secret Management](../../docs/secret-management.md) | Secret 관리 운영 가이드 |
| [ADR-006](../../docs/architecture/adr/006-external-secrets-gcp-secret-manager.md) | External Secrets 결정 |
