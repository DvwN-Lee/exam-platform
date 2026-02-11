# OnlineExam v2

레거시 온라인 시험 시스템(Django 2.1)을 최신 기술 스택(Django 5.2 + React 19)으로 리팩터링하고, 95% 테스트 커버리지를 달성한 풀스택 프로젝트

![Exam Platform Dashboard](docs/demo/screenshots/08-teacher-dashboard-after.png)

> **Demo 시나리오:** 교사 로그인부터 시험 생성, 학생 응시, 결과 확인까지의 전체 흐름을 Screenshot과 함께 확인할 수 있다. [Demo 문서 바로가기](docs/demo/README.md)

## Migration Story

| Before | After |
|--------|-------|
| Django 2.1 | Django 5.2 LTS |
| Python 3.6 | Python 3.14 |
| jQuery/Vanilla JS | React 19 + TypeScript |
| 테스트 없음 | 95% 커버리지 (957개 테스트) |
| FBV | CBV/ViewSet + Service Layer |

## Tech Stack

### Backend
- **Framework**: Django 5.2 LTS, Django REST Framework 3.16
- **Database**: PostgreSQL 18, MongoDB 8, Redis 8
- **Authentication**: SimpleJWT (HttpOnly Cookie)
- **Testing**: pytest 8.3+ (95% 커버리지)
- **Package Manager**: uv

### Frontend
- **Framework**: React 19, TypeScript 5.9
- **Build**: Vite 7.2
- **Styling**: Tailwind CSS 4.1, shadcn/ui
- **State**: Zustand 5.0, TanStack Query 5.90
- **Routing**: TanStack Router 1.141
- **Charts**: Recharts 3.6
- **Animation**: Framer Motion 12.23
- **Testing**: Playwright E2E

## Key Features

### 역할 기반 접근 제어 (RBAC)
- 학생/교사 역할 분리
- Custom Permission 클래스
- Frontend Route Guard (beforeLoad)

### 성능 최적화
- N+1 쿼리 해결 (select_related, prefetch_related)
- Service Layer 패턴으로 Query 재사용
- Database Index 최적화

### 보안
- JWT + HttpOnly Cookie (XSS 방지)
- XSS Sanitization (bleach + regex)
- CORS / CSRF / HSTS / Secure Cookie
- Input Validation (Zod + DRF Serializer)
- File Upload 3단계 검증 (Extension + Size + MIME Type)

### 테스트 주도 개발
- Backend: 957개 테스트 함수, 95% 커버리지
- Frontend: Playwright E2E 테스트
- 변경에 대한 자신감 있는 리팩터링

## Project Structure

```
exam-platform/
├── examonline/              # Django Backend
│   ├── apps/
│   │   ├── user/            # 사용자 관리 + Service Layer
│   │   ├── testquestion/    # 문제 관리
│   │   ├── testpaper/       # 시험지 관리
│   │   └── examination/     # 시험 관리
│   ├── core/api/            # 공통 API 컴포넌트
│   ├── config/              # 환경별 설정
│   └── docs/                # Backend 문서
├── frontend/                # React Frontend
│   ├── src/
│   │   ├── features/        # 페이지별 기능 모듈
│   │   ├── components/      # 재사용 컴포넌트
│   │   ├── api/             # API 클라이언트
│   │   └── stores/          # 상태 관리
│   └── e2e/                 # Playwright 테스트
├── terraform/               # GCP Infrastructure as Code
│   ├── modules/             # 재사용 Terraform Module
│   └── environments/        # 환경별 설정 (staging, prod)
├── argocd/                  # ArgoCD GitOps (App of Apps)
│   ├── applications/        # 환경별 Application Overlay
│   ├── install/             # ArgoCD Helm Values
│   └── add-ons/             # External Secrets 등
├── charts/exam-platform/    # Helm Chart
│   ├── templates/           # K8s Manifest Template
│   └── values-*.yaml        # 환경별 Values
├── .github/workflows/       # CI/CD Pipeline
└── docs/                    # 프로젝트 문서
    └── features/            # 기능별 상세 문서
```

## Getting Started

### Local Development

#### Prerequisites
- Python 3.14+
- Node.js 22+
- Docker & Docker Compose
- uv (Python package manager)

#### Quick Start

```bash
# 1. Clone repository
git clone https://github.com/DvwN-Lee/exam-platform.git
cd exam-platform

# 2. Start database services
docker compose -f examonline/docker-compose.dev.yml up -d

# 3. Backend setup
cd examonline
uv sync
uv run python manage.py migrate
uv run python manage.py runserver

# 4. Frontend setup (new terminal)
cd frontend
npm install
npm run dev
```

#### Local Access URLs
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000/api/v1/
- API Docs (Swagger): http://localhost:8000/api/docs/
- API Docs (ReDoc): http://localhost:8000/api/redoc/

### Cloud (GKE Production)

Production 환경은 GCP GKE Cluster에 배포되며, ArgoCD GitOps로 관리한다.

#### Prerequisites
- `gcloud` CLI 인증 완료
- GKE Cluster 접근 권한 (Master Authorized Networks에 등록된 IP)
- `kubectl`, `helm` 설치

#### Cluster 접속

```bash
# GKE Cluster 인증 정보 획득
gcloud container clusters get-credentials prod-exam-cluster \
  --zone asia-northeast3-a \
  --project <PROJECT_ID>

# Cluster 상태 확인
kubectl get nodes
kubectl get pods -n exam-platform-prod
```

#### Cloud Access URLs

| URL | 설명 | 비고 |
|-----|------|------|
| ~~`https://exam-platform.me`~~ | Production Frontend | NGINX Ingress + Let's Encrypt TLS |
| ~~`https://exam-platform.me/api/v1/`~~ | Production API | Backend (Gunicorn) |

**DNS 및 Ingress 구성:**
- Domain `exam-platform.me`의 A Record를 Terraform으로 생성한 Static IP(`google_compute_address`)에 연결하여 서비스를 제공했다.
- NGINX Ingress Controller가 `/api`, `/admin` 요청을 Backend Service로, `/` 요청을 Frontend Service로 라우팅한다.
- TLS 인증서는 cert-manager + Let's Encrypt(`letsencrypt-prod` ClusterIssuer)를 통해 자동 발급 및 갱신된다.

> **참고:** 프로젝트 완료 후 GCP 및 DNS 연결 해제로 인해 `exam-platform.me`는 현재 접속이 불가하다. 서비스 재개 시 GKE Cluster 복구, DNS A Record 재연결이 필요하다.

## Testing

### Backend
```bash
cd examonline
uv run pytest --cov=apps --cov-report=html
# Coverage: 95% (957 tests)
```

### Frontend
```bash
cd frontend
npm run build          # TypeScript check + build
npx playwright test    # E2E tests
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register/` | 회원가입 |
| POST | `/api/v1/auth/token/` | JWT Token 발급 |
| POST | `/api/v1/auth/token/refresh/` | Token 갱신 |

### User Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/users/me/` | 내 정보 조회 |
| PATCH | `/api/v1/users/me/` | 프로필 수정 |
| GET | `/api/v1/dashboard/` | 대시보드 데이터 |

### Examination System
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/questions/` | 문제 목록 |
| GET | `/api/v1/testpapers/` | 시험지 목록 |
| GET | `/api/v1/examinations/` | 시험 목록 |
| POST | `/api/v1/exams/{id}/submit/` | 시험 제출 |

## Documentation

### Backend
- [Backend README](examonline/README.md)
- [Troubleshooting Guide](examonline/docs/troubleshooting.md)
- [Database Normalization](examonline/docs/database-normalization.md)

### Frontend
- [Frontend README](frontend/README.md)
- [Feature Documentation](docs/features/README.md)
- [Animation System](docs/features/animation-system.md)

### Infrastructure
- [Terraform README](terraform/README.md)
- [ArgoCD README](argocd/README.md)
- [Security Architecture](docs/security.md)

## Infrastructure

### GCP (Google Cloud Platform)

| 구성 요소 | 서비스 | 설정 |
|-----------|--------|------|
| Cluster | GKE (e2-standard-2) | Private Nodes, Workload Identity, Shielded Nodes |
| Database | Cloud SQL (PostgreSQL 16) | Private IP, ENCRYPTED_ONLY SSL, PITR |
| Cache | Memorystore (Redis 7.0) | AUTH + Transit Encryption |
| Registry | Artifact Registry | 환경별 Repository 분리 |
| Secret | Secret Manager + External Secrets Operator | Workload Identity 기반 |
| Storage | Cloud Storage | Terraform State + Application Assets |

### CI/CD

| Pipeline | Trigger | 배포 방식 |
|----------|---------|----------|
| CI | Push / PR (main, develop, feature/*, release/*) | ruff + mypy + pytest + Docker Build |
| CD Dev | CI 성공 (main) | Helm Upgrade (atomic) |
| CD Staging | CI 성공 (release/*) | Helm Upgrade (atomic) |
| CD Production | 수동 (workflow_dispatch) | ArgoCD Image Tag Patch |

### GitOps (ArgoCD)

App of Apps 패턴으로 Application 배포를 관리한다.

| 환경 | Namespace | Sync Policy |
|------|-----------|-------------|
| Dev | exam-dev | Automated (prune, selfHeal) |
| Staging | exam-staging | Automated (prune, selfHeal) |
| Production | exam-platform-prod | Automated (prune, selfHeal) |

## Development Phases

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Infrastructure (Django 5.2, PostgreSQL, Docker) | Done |
| 2 | Core Backend API (JWT, RBAC) | Done |
| 3 | Question Management API | Done |
| 4 | Examination System API | Done |
| 5 | Frontend Development (React 19) | Done |
| 6 | DevOps & Deployment (GKE, ArgoCD, CI/CD) | Done |

## License

MIT License
