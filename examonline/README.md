# ExamOnline Backend

Django 기반 온라인 시험 관리 시스템의 Backend API 서버.

## 기술 스택

- **Framework**: Django 5.2 LTS, Django REST Framework
- **Language**: Python 3.14
- **Primary DB**: PostgreSQL 18
- **Secondary DB**: MongoDB 8.0
- **Cache**: Redis 8.0
- **Auth**: JWT (Simple JWT)

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

# 마이그레이션
uv run python manage.py migrate

# Django 개발 서버
uv run python manage.py runserver
```

## 프로젝트 구조

```
examonline/
├── apps/                   # Django 앱
│   ├── examination/        # 시험 관리
│   │   ├── api/
│   │   │   ├── views.py          # 시험 CRUD
│   │   │   ├── taking_views.py   # 시험 응시 API
│   │   │   └── serializers.py
│   │   └── models.py
│   ├── testpaper/          # 시험지 관리
│   │   ├── api/
│   │   │   ├── views.py
│   │   │   └── scores_views.py   # 성적 관리
│   │   └── models.py
│   ├── testquestion/       # 문제 관리
│   ├── user/               # 사용자 관리
│   │   ├── api/
│   │   └── services.py     # Dashboard Service
│   └── operation/          # 운영 기능
├── config/                 # 환경별 설정
├── core/                   # 공통 모듈
│   └── api/
│       └── pagination.py   # 페이지네이션
├── docker/                 # Docker 설정
├── docs/                   # 문서
└── manage.py
```

## 개발 현황

### Backend API 개발 상세 단계

**Phase 1-2: Foundation** (완료)
- Django 5.2 + DRF 설정
- PostgreSQL, MongoDB, Redis 연동
- JWT 인증 (HttpOnly Cookie 기반 Refresh Token)
- 역할 기반 권한 (IsTeacher, IsStudent)

**Phase 3: Question Management API** (완료)
- Question CRUD, 필터링, 검색
- 문제 공유 기능, 문제 은행 관리

**Phase 4: Examination System API** (완료)
- TestPaper Management
- Examination Scheduling
- Exam Taking (시작, 답안 저장, 제출)
- Scores & Grading

**Phase 5: Performance Optimization** (완료)
- N+1 Query 최적화 (`select_related`, `prefetch_related`)
- Database Index 추가
- Service Pattern 적용 (Dashboard)
- Query Reuse 최적화

### Test Coverage

```
268 passed in 36.94s
Coverage: 95%
```

| 영역 | Coverage |
|------|----------|
| examination API | 77-100% |
| testpaper API | 94-97% |
| testquestion API | 91-98% |
| user API | 82-99% |
| models | 92-100% |
| services | 78% |

## 테스트 실행

```bash
# 전체 테스트 실행
uv run pytest

# Coverage 리포트 생성
uv run pytest apps/ --cov=apps --cov-report=term --cov-report=html

# 특정 앱 테스트
uv run pytest apps/user/
uv run pytest apps/testpaper/

# HTML 리포트 확인
open htmlcov/index.html
```

## API 문서

구현된 API endpoint:

### 사용자 관리
- `POST /api/v1/auth/register/` - 회원가입
- `POST /api/v1/auth/token/` - 로그인
- `POST /api/v1/auth/token/refresh/` - Token 갱신
- `GET /api/v1/users/me/` - 프로필 조회
- `PATCH /api/v1/users/me/` - 프로필 수정
- `PUT /api/v1/users/me/change-password/` - 비밀번호 변경

### 과목 관리
- `GET /api/v1/subjects/` - 과목 목록
- `POST /api/v1/subjects/` - 과목 생성 (교사)
- `PATCH /api/v1/subjects/{id}/` - 과목 수정 (교사)
- `DELETE /api/v1/subjects/{id}/` - 과목 삭제 (교사)

### 문제 관리
- `GET /api/v1/questions/` - 문제 목록
- `POST /api/v1/questions/` - 문제 생성 (교사)
- `GET /api/v1/questions/{id}/` - 문제 상세
- `PATCH /api/v1/questions/{id}/` - 문제 수정 (작성자)
- `DELETE /api/v1/questions/{id}/` - 문제 삭제 (작성자)
- `POST /api/v1/questions/{id}/share/` - 문제 공유 (작성자)
- `GET /api/v1/questions/my/` - 내 문제 목록 (교사)
- `GET /api/v1/questions/shared/` - 공유 문제 목록

### 시험지 관리
- `GET /api/v1/papers/` - 시험지 목록
- `POST /api/v1/papers/` - 시험지 생성 (교사)
- `GET /api/v1/papers/{id}/` - 시험지 상세
- `PATCH /api/v1/papers/{id}/` - 시험지 수정 (작성자)
- `DELETE /api/v1/papers/{id}/` - 시험지 삭제 (작성자)
- `POST /api/v1/papers/{id}/add_questions/` - 문제 추가 (작성자)
- `DELETE /api/v1/papers/{id}/remove-question/{question_id}/` - 문제 제거 (작성자)
- `GET /api/v1/papers/{id}/preview/` - 시험지 미리보기

### 성적 관리
- `GET /api/v1/scores/my/` - 내 성적 목록 (학생)
- `GET /api/v1/scores/my/{exam_id}/` - 특정 시험 성적 (학생)
- `GET /api/v1/scores/exam/{exam_id}/` - 시험별 성적 목록 (교사)
- `POST /api/v1/scores/{score_id}/grade/` - 성적 채점 (교사)

## 성능 최적화

### Database Index

```python
# ExaminationInfo
- exam_state_idx (exam_state)
- exam_time_range_idx (start_time, end_time)
- exam_create_user_idx (create_user)

# ExamPaperInfo
- exam_paper_idx (exam, paper)

# ExamStudentsInfo
- exam_student_idx (exam, student)
- student_exam_lookup_idx (student)
```

### N+1 Query 해결

- `select_related`: 1:1, ForeignKey 관계
- `prefetch_related`: M:N, Reverse ForeignKey 관계
- Dictionary Caching: Loop 내 조회 최적화

### Service Pattern

Dashboard 비즈니스 로직을 Service 계층으로 분리:

```python
# apps/user/services.py
class StudentDashboardService:
    def get_dashboard_data(self) -> dict:
        # Query Reuse로 중복 쿼리 제거
        ...

class TeacherDashboardService:
    def get_dashboard_data(self) -> dict:
        ...
```

## 보안

### JWT HttpOnly Cookie

Refresh Token을 HttpOnly Cookie에 저장하여 XSS 공격 방어:

```python
# apps/user/api/views.py
response.set_cookie(
    key='refresh_token',
    value=refresh_token,
    httponly=True,
    secure=not settings.DEBUG,
    samesite='Lax',
    max_age=60 * 60 * 24 * 7,
)
```

## 문서

- [Troubleshooting Guide](./docs/troubleshooting.md)
- [Database Normalization](./docs/database-normalization.md)
- [Phase 3 Testing Plan](./docs/phase3-testing-plan.md)
- [Phase 4 API Test Results](./docs/phase4-api-test-results.md)
- [Coverage Improvement Report](./docs/coverage-improvement-report.md)

## 관련 프로젝트

- [Frontend README](../frontend/README.md)
