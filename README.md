# OnlineExam v2 - 온라인 시험 관리 시스템

Django 5.2 + React 19 기반 현대적인 온라인 시험 관리 시스템

## 프로젝트 개요

기존 Django 2.1 온라인 시험 시스템을 최신 기술 스택으로 완전히 재구성한 풀스택 + DevOps 프로젝트입니다.

### 기술 스택

**Backend:**
- Django 5.2 LTS
- Python 3.14
- Django REST Framework 3.16
- SimpleJWT (JWT 인증)
- PostgreSQL 18
- MongoDB 8 (로그 및 분석)
- Redis 8 (캐시 및 Celery)
- Celery 5.5 (비동기 작업)

**Frontend:**
- React 19
- TypeScript 6
- Vite 6
- Tailwind CSS
- shadcn/ui

**DevOps:**
- Docker & Docker Compose
- Kubernetes + Helm
- Terraform (IaC)
- ArgoCD (GitOps)
- GitHub Actions (CI/CD)
- Prometheus + Grafana + Loki (모니터링)

### 프로젝트 구조

```
OnlineExam-v2/
├── examonline/          # Django Backend
│   ├── apps/            # Django 앱
│   │   ├── user/        # 사용자 관리
│   │   ├── testquestion/# 문제 관리
│   │   ├── testpaper/   # 시험지 관리
│   │   ├── examination/ # 시험 관리
│   │   └── operation/   # 운영 (댓글, 메시지)
│   ├── core/            # 공통 유틸리티
│   │   └── api/         # 공통 API 컴포넌트
│   ├── config/          # 설정
│   │   ├── base.py      # 공통 설정
│   │   ├── local.py     # 개발 환경 설정
│   │   ├── production.py# 운영 환경 설정
│   │   └── api.py       # DRF 설정
│   └── docs/            # 문서
├── ui-mockups/          # Frontend UI 목업
└── frontend/            # React Frontend (예정)
```

## 개발 환경 설정

### 사전 요구사항

- Python 3.14+
- uv (Python package manager)
- PostgreSQL 18
- MongoDB 8
- Redis 8
- Docker & Docker Compose

### 설치 방법

1. Repository clone:
```bash
git clone https://github.com/yourusername/OnlineExam-v2.git
cd OnlineExam-v2/examonline
```

2. 의존성 설치:
```bash
uv sync
```

3. Database 서비스 시작:
```bash
docker compose -f docker-compose.dev.yml up -d
```

4. Migration 실행:
```bash
uv run python manage.py migrate
```

5. 개발 서버 시작:
```bash
uv run python manage.py runserver
```

6. API 문서 접근:
- Swagger UI: http://localhost:8000/api/docs/
- ReDoc: http://localhost:8000/api/redoc/

## API Endpoint

### 인증
- `POST /api/v1/auth/register/` - 회원가입
- `POST /api/v1/auth/token/` - JWT Token 발급
- `POST /api/v1/auth/token/refresh/` - Token 갱신

### 사용자
- `GET /api/v1/users/me/` - 내 정보 조회
- `PATCH /api/v1/users/me/` - 프로필 수정
- `PUT /api/v1/users/me/change-password/` - 비밀번호 변경

### 과목
- `GET /api/v1/subjects/` - 과목 목록
- `POST /api/v1/subjects/` - 과목 생성 (교사 전용)

## 기능

### Phase 1: Infrastructure (완료)
- Django 5.2 LTS 업그레이드
- PostgreSQL 18 + MongoDB 8 + Redis 8
- Docker Compose 설정
- Database 정규화

### Phase 2: Backend API (완료)
- Django REST Framework
- JWT 인증
- 역할 기반 권한 (학생/교사)
- Swagger/OpenAPI 문서화
- 사용자 관리 API

### Phase 3: 문제 관리 (진행 중)
- 문제 CRUD
- 문제 은행
- 문제 공유
- 객관식, 주관식, OX 문제

### Phase 4: 시험 관리 (계획)
- 시험지 생성
- 시험 일정 관리
- 학생 등록
- 실시간 시험 응시

### Phase 5: Frontend (계획)
- React 19 + TypeScript
- Tailwind CSS를 활용한 현대적 UI
- 실시간 업데이트
- 반응형 디자인

## 문서

- [Database 정규화 문서](examonline/docs/database-normalization.md)
- [UI 목업](ui-mockups/README.md)

## 기여

포트폴리오 및 학습 프로젝트입니다. Issue 및 Pull Request를 환영합니다.

## 라이선스

MIT License
