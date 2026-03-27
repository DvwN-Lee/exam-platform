# OnlineExam v2

레거시 온라인 시험 시스템(Django 2.1)을 최신 기술 스택(Django 5.2 + React 19)으로 리팩터링하고, 95% 테스트 커버리지를 달성한 풀스택 프로젝트

![Exam Platform Dashboard](docs/demo/screenshots/08-teacher-dashboard-after.png)

> **Demo 시나리오:** 교사 로그인부터 시험 생성, 학생 응시, 결과 확인까지의 전체 흐름을 Screenshot과 함께 확인할 수 있다. [Demo 문서 바로가기](docs/demo/README.md)

> **AI-Assisted Development** — 이 프로젝트는 Claude Code를 AI Pair Programmer로 활용하여
> Full-Stack + DevOps + IaC + 4단계 테스트를 갖춘 프로덕션 시스템을 구축한 프로젝트이다.
> [AI Development Workflow →](docs/ai-development.md)

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

### Development Tools
- **AI Pair Programmer**: Claude Code
- **CI/CD**: GitHub Actions
- **GitOps**: ArgoCD

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

### AI-Assisted Development

| 지표 | 수치 |
|------|------|
| 개발 기간 | 10주 (2025.12 ~ 2026.02) |
| 총 커밋 | 311 |
| 테스트 파일 | 67개 (Python 16 + TypeScript 40 + Go 11) |
| AI 활용 범위 | 9개 도메인 |
| MCP 연동 | 5개 서버 (GitHub, Playwright, Chrome DevTools, Serena, Context7) |

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
    ├── architecture/        # 아키텍처 문서 + ADR
    ├── demo/                # Demo 시나리오 + Screenshot
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
# 예상 출력: Creating examonline-postgres-1 ... done / Creating examonline-redis-1 ... done

# 3. Backend setup
cd examonline
uv sync                       # Python 의존성 설치 (uv 미설치 시: pip install uv)
uv run python manage.py migrate  # DB 마이그레이션 (OK 메시지 20개 이상 출력)
uv run python manage.py runserver
# 예상 출력: Starting development server at http://127.0.0.1:8000/

# 4. Frontend setup (new terminal)
cd frontend
npm install
npm run dev
# 예상 출력: VITE ready in ~300ms → http://localhost:5173/
```

> **문제 발생 시**: 포트 충돌, DB 연결 실패 등 일반적인 오류는 [Troubleshooting Guide](docs/troubleshooting.md)를 참고한다.

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

## Glossary

| 약어/용어 | 정의 |
|-----------|------|
| ADR | Architecture Decision Record — 아키텍처 의사결정 기록 |
| ArgoCD | Kubernetes 선언적 GitOps 연속 배포 도구 |
| CORS | Cross-Origin Resource Sharing — 교차 출처 리소스 공유 |
| CSRF | Cross-Site Request Forgery — 사이트 간 요청 위조 |
| ESO | External Secrets Operator — Kubernetes 외부 시크릿 연동 |
| GKE | Google Kubernetes Engine — Google 관리형 Kubernetes 서비스 |
| Helm | Kubernetes 패키지 매니저 |
| HPA | Horizontal Pod Autoscaler — 수평 파드 자동 확장 |
| HSTS | HTTP Strict Transport Security — HTTPS 강제 전환 정책 |
| JWT | JSON Web Token — 인증 토큰 표준 |
| PDB | Pod Disruption Budget — 파드 중단 허용 범위 설정 |
| PITR | Point-In-Time Recovery — 특정 시점 복구 |
| RBAC | Role-Based Access Control — 역할 기반 접근 제어 |
| UBLA | Uniform Bucket-Level Access — Cloud Storage 버킷 수준 통합 접근 제어 |
| Workload Identity | GKE Pod에 GCP IAM 서비스 계정을 매핑하는 인증 방식 |
| XSS | Cross-Site Scripting — 사이트 간 스크립팅 공격 |

## Onboarding Guide

처음 이 프로젝트를 접한다면, 역할에 따라 아래 순서로 문서를 읽는 것을 권장한다.

**공통 (전체 개요 파악)**
1. 이 README — 프로젝트 개요, 기술 스택, 구조
2. [Architecture Overview](docs/architecture/README.md) — 시스템 아키텍처 전체 구조
3. [Demo 시나리오](docs/demo/README.md) — 실제 사용 흐름 확인

**Backend 개발자**
4. [Backend README](examonline/README.md) — Django 앱 구조, API 설계
5. [Testing Strategy](docs/testing-strategy.md) — 테스트 전략 및 실행 방법
6. [Security Architecture](docs/security.md) — 인증/인가, 보안 정책

**Frontend 개발자**
4. [Frontend README](frontend/README.md) — React 앱 구조, 빌드 설정
5. [Feature Documentation](docs/features/README.md) — 기능별 상세 문서
6. [Animation System](docs/features/animation-system.md) — 애니메이션 패턴

**Infrastructure / DevOps**
4. [Terraform README](terraform/README.md) — GCP 인프라 코드
5. [ArgoCD README](argocd/README.md) — GitOps 배포 구성
6. [Secret Management](docs/secret-management.md) — 시크릿 관리 정책

## Documentation

### Architecture
- [Architecture Overview](docs/architecture/README.md) — 시스템 구조, 기술 스택, 배포 토폴로지 전체 설계
- [Architecture Decision Records](docs/architecture/adr/README.md) — 주요 기술 선택의 근거와 대안 분석
- [Secret Management](docs/secret-management.md) — ESO + GCP Secret Manager 기반 시크릿 관리 정책

### Backend
- [Backend README](examonline/README.md) — Django 앱 구조, Service Layer, API 설계 패턴
- [Troubleshooting Guide](examonline/docs/troubleshooting.md) — 개발 중 자주 발생하는 오류와 해결 방법
- [Database Normalization](examonline/docs/database-normalization.md) — DB 스키마 정규화 과정과 결정

### Frontend
- [Frontend README](frontend/README.md) — React 앱 구조, 빌드 설정, 개발 가이드
- [Feature Documentation](docs/features/README.md) — 기능별(인증, 대시보드, 시험 등) 상세 문서 인덱스
- [Animation System](docs/features/animation-system.md) — Framer Motion 기반 애니메이션 패턴

### Infrastructure
- [Terraform README](terraform/README.md) — GCP 인프라를 코드로 관리하는 IaC 구성
- [ArgoCD README](argocd/README.md) — App of Apps 패턴 기반 GitOps 배포
- [Security Architecture](docs/security.md) — 인증/인가, 네트워크, 전송 보안 전체 아키텍처

### AI Development
- [AI-Assisted Development Workflow](docs/ai-development.md) — Claude Code 활용 AI 페어 프로그래밍 워크플로우
- [ADR-007: Claude Code AI-Assisted Development](docs/architecture/adr/007-claude-code-ai-development.md) — AI 개발 도구 도입 결정 기록

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
| 7 | AI-Assisted Development Documentation | Done |

## License

MIT License
