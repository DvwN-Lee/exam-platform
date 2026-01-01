# OnlineExam v2

레거시 온라인 시험 시스템(Django 2.1)을 최신 기술 스택(Django 5.2 + React 19)으로 리팩터링하고, 95% 테스트 커버리지를 달성한 풀스택 프로젝트

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
- CORS 설정
- Input Validation (Zod)

### 테스트 주도 개발
- Backend: 957개 테스트 함수, 95% 커버리지
- Frontend: Playwright E2E 테스트
- 변경에 대한 자신감 있는 리팩터링

## Project Structure

```
OnlineExam-v2/
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
└── docs/                    # 프로젝트 문서
    └── features/            # 기능별 상세 문서
```

## Getting Started

### Prerequisites
- Python 3.14+
- Node.js 22+
- Docker & Docker Compose
- uv (Python package manager)

### Quick Start

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

### Access URLs
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000/api/v1/
- API Docs (Swagger): http://localhost:8000/api/docs/
- API Docs (ReDoc): http://localhost:8000/api/redoc/

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

### Code Review
- [Backend Code Review](refactor/backend-code-review.md)
- [Frontend Code Review](refactor/frontend-code-review.md)

## Development Phases

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Infrastructure (Django 5.2, PostgreSQL, Docker) | Done |
| 2 | Core Backend API (JWT, RBAC) | Done |
| 3 | Question Management API | Done |
| 4 | Examination System API | Done |
| 5 | Frontend Development (React 19) | Done |
| 6 | DevOps & Deployment | In Progress |

## License

MIT License
