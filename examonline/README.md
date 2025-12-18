# ExamOnline

Django 기반 온라인 시험 관리 시스템

## 기술 스택

- Backend: Django 5.2 LTS, Python 3.14
- Primary DB: PostgreSQL 18
- Secondary DB: MongoDB 8.0
- Cache: Redis 8.0
- Frontend: React 19 + TypeScript 6.x + Vite 6.x

## 개발 환경 설정

### 필수 요구사항

- Python 3.14+
- uv (패키지 관리자)
- Docker & Docker Compose

### 설치

```bash
# 의존성 설치
uv sync

# 개발 의존성 포함 설치
uv sync --all-extras

# 가상환경 활성화
source .venv/bin/activate
```

### 개발 서버 실행

```bash
# DB 컨테이너 시작
docker compose -f docker-compose.dev.yml up -d

# Django 개발 서버
uv run python manage.py runserver
```

## 프로젝트 구조

```
examonline/
├── apps/           # Django 앱
├── config/         # 환경별 설정
├── docker/         # Docker 설정
└── manage.py
```
