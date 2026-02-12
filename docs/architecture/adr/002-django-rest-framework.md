# ADR-002: Django REST Framework Backend Stack

## 상태 (Status)

`승인됨`

## 일자 (Date)

2025-03-15

## 상황 (Context)

Exam Platform Backend는 다음 기능을 제공해야 한다.

- 사용자 관리 (Teacher/Student Role 기반)
- 시험 문제, 시험지, 시험 일정 CRUD
- JWT 기반 인증/인가
- Role 기반 접근 제어 (RBAC)
- PostgreSQL ORM 지원
- OpenAPI Schema 자동 생성

Backend Framework로 Django, FastAPI, Spring Boot, Express.js를 검토했다.

## 결정 (Decision)

**Django 5.2 + Django REST Framework(DRF) 3.15**를 Backend Stack으로 채택한다.

주요 구성:
- `SimpleJWT`로 JWT 인증 (Access Token + HttpOnly Cookie Refresh Token)
- `drf-spectacular`로 OpenAPI Schema 자동 생성
- `django-filter`로 Query Filtering
- `bleach`로 XSS Sanitization
- `psycopg 3`으로 PostgreSQL 연결
- `Gunicorn`으로 WSGI Server 운영

## 이유 (Rationale)

### 검토 대안

| 대안 | 장점 | 단점 |
|------|------|------|
| **Django + DRF** | 성숙한 ORM, Admin, Auth 내장, DRF Serializer/Permission 체계 | 비동기 제한적, 학습 곡선 |
| **FastAPI** | 비동기 Native, 자동 문서화, 높은 성능 | ORM 미내장, Auth/Admin 직접 구현 필요 |
| **Spring Boot** | Enterprise 생태계, 강타입 | JVM 메모리 오버헤드, 설정 복잡성 |
| **Express.js** | 경량, 빠른 프로토타이핑 | 구조화 부재, 자체 설계 필요 |

### 선택 사유

- **내장 Auth 시스템**: `AbstractUser` 확장으로 `UserProfile` 구현, `SimpleJWT`와 즉시 통합 가능
- **DRF Permission 체계**: `IsTeacher`, `IsStudent`, `IsOwnerOrTeacher` 등 Custom Permission Class를 선언적으로 정의 가능
- **ORM 생산성**: Model 정의로 Migration 자동 생성, `django-filter`와 결합하여 Filtering/Ordering 최소 코드로 구현
- **Serializer 검증**: 입력 Validation, Nested Serialization, Custom Field(`XSSSanitizedCharField`) 등 일관된 데이터 처리

## 결과 (Consequences)

### 긍정적 결과

- `AbstractUser` 기반 UserProfile + StudentInfo/TeacherInfo 1:1 관계로 Role 확장 구현
- DRF ViewSet + Router 조합으로 RESTful API Endpoint 일관성 확보
- `drf-spectacular`로 Swagger UI 자동 생성, Frontend 개발 시 API 명세 즉시 참조 가능
- Django Admin으로 데이터 관리 화면 추가 개발 없이 사용 가능

### 부정적 결과 / 트레이드오프

- 동기 처리 기반으로 WebSocket, 실시간 기능 추가 시 `channels` 등 별도 구성 필요
- Django ORM의 N+1 Query 문제에 대한 지속적 관리 필요 (`select_related`, `prefetch_related`)
- Full-Stack Framework 특성상 사용하지 않는 내장 기능(Admin Template 등)도 포함

## 참고 자료 (References)

- [Architecture Overview - Section 2, 3](../README.md)
- `examonline/config/`: Django 설정 (base, local, production)
- `examonline/apps/`: Django App 구조
