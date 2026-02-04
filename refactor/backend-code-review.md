# Backend 코드 리뷰 리포트

## 개요

| 항목 | 내용 |
|------|------|
| **프로젝트** | OnlineExam-v2 Backend (Django REST Framework) |
| **리뷰 범위** | 보안, 성능 최적화, 시공간 복잡도, 하드코딩 |
| **리뷰 일자** | 2025-12-31 |

---

## 1. 보안 이슈

### 1.1 [Critical] 환경 변수 파일 관리

**위치**: `examonline/.env`

`.env` 파일이 `.gitignore`에 포함되어 있으나, 현재 파일에 테스트용 자격증명이 하드코딩되어 있음:

```
SECRET_KEY=your-secret-key-here-change-in-production
POSTGRES_PASSWORD=exampass
POSTGRES_USER=examuser
```

**위험도**: Critical
**영향**: 코드 저장소가 공개되거나 유출될 경우 데이터베이스 접근 가능

**권장 조치**:
1. `.env` 파일을 git history에서 완전히 제거 (`git filter-branch` 또는 `BFG Repo-Cleaner`)
2. `.env.example` 파일만 유지하고 실제 값은 비워둘 것
3. Production 환경에서는 환경 변수 관리 도구 사용 (AWS Secrets Manager, Vault 등)

---

### 1.2 [High] Exception 정보 노출

**위치**: `examonline/core/api/exceptions.py:21`

```python
custom_response_data = {
    'error': {
        'code': exc.__class__.__name__.upper(),
        'message': str(exc),  # 민감한 정보 포함 가능
        'details': response.data
    }
}
```

**위험도**: High
**영향**: Stack trace, 파일 경로, 쿼리 정보 등 민감한 정보가 클라이언트에 노출될 수 있음

**권장 조치**:
```python
def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is not None:
        # Production에서는 일반적인 메시지만 반환
        if not settings.DEBUG:
            message = '요청을 처리할 수 없습니다.'
        else:
            message = str(exc)
        custom_response_data = {
            'error': {
                'code': exc.__class__.__name__.upper(),
                'message': message,
                'details': response.data if isinstance(response.data, dict) else {'detail': response.data}
            }
        }
        response.data = custom_response_data
    return response
```

---

### 1.3 [High] API 문서 무인증 노출

**위치**: `examonline/examonline/urls.py:19-22`

```python
path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
```

**위험도**: High
**영향**: 모든 API 엔드포인트, 파라미터, 응답 구조가 공개됨

**권장 조치**:
- Production 환경에서 비활성화하거나 인증 요구
- 조건부 URL 패턴 사용:
```python
if settings.DEBUG:
    urlpatterns += [
        path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
        path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    ]
```

---

### 1.4 [Medium] Admin 패널 기본 경로

**위치**: `examonline/examonline/urls.py:17`

```python
path('admin/', admin.site.urls),
```

**위험도**: Medium
**영향**: 공격자가 `/admin/` 경로로 직접 접근하여 Brute Force 공격 가능

**권장 조치**:
- 경로를 예측 불가능한 값으로 변경: `path('secure-admin-xyz123/', admin.site.urls)`
- 2FA 적용 또는 IP 화이트리스트 설정

---

### 1.5 [Medium] 입력 값 XSS 필터링 부재

**위치**: 모든 Serializer의 텍스트 필드

시험 이름, 문제 이름, 과목명 등에 HTML/JavaScript 필터링이 없음.

**위험도**: Medium
**영향**: Stored XSS 공격 가능 (DB에 악성 스크립트 저장 후 다른 사용자에게 실행)

**권장 조치**:
- `django-bleach` 또는 `django-html-sanitizer` 적용
- 또는 Serializer에서 `bleach.clean()` 처리:
```python
import bleach

class ExaminationCreateSerializer(serializers.ModelSerializer):
    def validate_name(self, value):
        return bleach.clean(value, tags=[], strip=True)
```

---

### 1.6 [Low] 파일 업로드 검증 부재

**위치**: `examonline/apps/user/models.py:17`

```python
image = models.ImageField()
```

**위험도**: Low
**영향**: 악성 파일 업로드 가능성 (이미지 위장 스크립트 등)

**권장 조치**:
- 파일 타입 검증 (magic number 확인)
- 파일 크기 제한
- 업로드 경로를 웹 루트 외부로 설정
```python
from django.core.validators import FileExtensionValidator

image = models.ImageField(
    upload_to='profile_images/',
    validators=[FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png'])],
)
```

---

## 2. 성능 및 시공간 복잡도 이슈

### 2.1 [Critical] Serializer 메서드에서 N+1 쿼리

#### 2.1.1 ExaminationDetailSerializer.get_testpaper()

**위치**: `examonline/apps/examination/api/serializers.py:183-200`

```python
def get_testpaper(self, obj):
    from examination.models import ExamPaperInfo
    exam_paper = ExamPaperInfo.objects.filter(exam=obj).select_related('paper', 'paper__subject').first()
    # ViewSet에서 prefetch했더라도 여기서 다시 쿼리 실행
```

**복잡도**: O(n) 쿼리 (n = 시험 수)
**영향**: 시험 목록 조회 시 각 시험마다 추가 DB 쿼리 발생

**권장 조치**:
```python
def get_testpaper(self, obj):
    # prefetch된 데이터 우선 사용
    exam_papers = getattr(obj, 'prefetched_exam_papers', None)
    if exam_papers:
        exam_paper = exam_papers[0] if exam_papers else None
        if exam_paper and exam_paper.paper:
            subject_data = None
            if exam_paper.paper.subject:
                subject_data = {
                    'id': exam_paper.paper.subject.id,
                    'subject_name': exam_paper.paper.subject.subject_name,
                }
            return {
                'id': exam_paper.paper.id,
                'name': exam_paper.paper.name,
                'subject': subject_data,
                'question_count': exam_paper.paper.question_count,
            }
    # fallback: prefetch가 없는 경우
    exam_paper = ExamPaperInfo.objects.filter(exam=obj).select_related('paper', 'paper__subject').first()
    # ... (기존 로직)
```

---

#### 2.1.2 ExaminationDetailSerializer.get_enrolled_students_count()

**위치**: `examonline/apps/examination/api/serializers.py:206-208`

```python
def get_enrolled_students_count(self, obj):
    return ExamStudentsInfo.objects.filter(exam=obj).count()
```

**복잡도**: O(n) 쿼리
**권장 조치**: ViewSet에서 `annotate` 사용

```python
# ViewSet에서
queryset = ExaminationInfo.objects.annotate(
    enrolled_count=Count('examstudentsinfo')
)

# Serializer에서
def get_enrolled_students_count(self, obj):
    return getattr(obj, 'enrolled_count', 0)
```

---

#### 2.1.3 ExamQuestionSerializer.get_assigned_score()

**위치**: `examonline/apps/examination/api/serializers.py:414-423`

```python
def get_assigned_score(self, obj):
    paper_id = self.context.get('paper_id')
    if paper_id:
        try:
            pq = TestPaperTestQ.objects.get(test_paper_id=paper_id, test_question=obj)
            return pq.score
        except TestPaperTestQ.DoesNotExist:
            return 0
```

**복잡도**: O(n) 쿼리 (n = 문제 수)
**권장 조치**: Context에 미리 조회한 dict 전달

```python
# View에서 context 설정
paper_questions = TestPaperTestQ.objects.filter(test_paper=paper)
scores_dict = {pq.test_question_id: pq.score for pq in paper_questions}
serializer = ExamQuestionSerializer(
    questions, many=True,
    context={'paper_id': paper.id, 'scores_dict': scores_dict}
)

# Serializer에서
def get_assigned_score(self, obj):
    scores_dict = self.context.get('scores_dict', {})
    return scores_dict.get(obj.id, 0)
```

---

### 2.2 [High] Loop 내 개별 쿼리 (N+1)

#### 2.2.1 ExamTakingViewSet.my_submissions()

**위치**: `examonline/apps/examination/api/taking_views.py:547-559`

```python
for submission in submissions:
    if submission.detail_records:
        for q_id, record in submission.detail_records.items():
            try:
                question = TestQuestionInfo.objects.get(id=int(q_id))  # N+1!
```

**복잡도**: O(n*m) 쿼리 (n = 제출 수, m = 문제 수)
**영향**: 제출 10개, 문제 20개 = 200회 쿼리

**권장 조치**:
```python
# 모든 question_id를 미리 수집
all_question_ids = set()
for submission in submissions:
    if submission.detail_records:
        all_question_ids.update(int(q_id) for q_id in submission.detail_records.keys())

# Bulk 조회
questions_dict = {
    q.id: q for q in TestQuestionInfo.objects.filter(id__in=all_question_ids)
    .select_related('subject')
    .prefetch_related('optioninfo_set')
}

# Loop에서 Dict 조회 (O(1))
for submission in submissions:
    if submission.detail_records:
        for q_id, record in submission.detail_records.items():
            question = questions_dict.get(int(q_id))
            if question:
                # ... 처리
```

---

#### 2.2.2 ExamTakingViewSet.result()

**위치**: `examonline/apps/examination/api/taking_views.py:602-614`

동일한 N+1 패턴 존재. 위와 동일한 방식으로 수정 필요.

---

### 2.3 [Medium] 대규모 데이터 메모리 사용

**위치**: `examonline/apps/user/services.py:40-41`

```python
submissions_qs = self._get_submissions()
submissions_list = list(submissions_qs)  # 전체 데이터를 메모리에 로드
```

**복잡도**: O(n) 메모리 (n = 제출 수)
**영향**: 학생 1000명, 시험 50개 = 50,000 records, detail_records JSON 포함 시 50MB+ 메모리

**권장 조치**:
1. 필요한 필드만 조회:
```python
submissions_qs = self._get_submissions().only(
    'id', 'test_score', 'submit_time', 'exam_id', 'test_paper_id'
)
```

2. 대시보드는 최근 N개만 조회:
```python
# 최근 100개로 제한
submissions_qs = self._get_submissions()[:100]
```

3. Redis 캐싱 도입:
```python
from django.core.cache import cache

cache_key = f'student_dashboard_{self.student_info.id}'
data = cache.get(cache_key)
if data is None:
    data = self._compute_dashboard_data()
    cache.set(cache_key, data, timeout=300)  # 5분 캐시
```

---

### 2.4 [Medium] 다중 Aggregate 쿼리

**위치**: `examonline/apps/user/services.py:518-556`

```python
# _get_question_statistics()
user_questions = TestQuestionInfo.objects.filter(create_user=self.user, is_del=False)
total_questions = user_questions.count()  # Query 1
shared_questions = user_questions.filter(is_share=True).count()  # Query 2
type_counts = user_questions.values('tq_type').annotate(count=Count('id'))  # Query 3
degree_counts = user_questions.values('tq_degree').annotate(count=Count('id'))  # Query 4
this_month_count = user_questions.filter(create_time__gte=this_month_start).count()  # Query 5
last_month_count = user_questions.filter(...).count()  # Query 6
```

**복잡도**: 6회 쿼리
**권장 조치**: 단일 쿼리로 통합

```python
from django.db.models import Case, When, IntegerField, Count

stats = user_questions.aggregate(
    total=Count('id'),
    shared=Count(Case(When(is_share=True, then=1), output_field=IntegerField())),
    this_month=Count(Case(
        When(create_time__gte=this_month_start, then=1),
        output_field=IntegerField()
    )),
    last_month=Count(Case(
        When(create_time__gte=last_month_start, create_time__lt=this_month_start, then=1),
        output_field=IntegerField()
    )),
)
```

---

## 3. 코드 품질 이슈

### 3.1 [Medium] 상태 검증 TOCTOU 취약점

**위치**: `examonline/apps/examination/api/views.py` (enroll_students 등)

```python
if exam.exam_state != '0':
    return Response(...)
# 이 사이에 다른 요청이 상태를 변경할 수 있음
# ... 이후 로직 실행
```

**권장 조치**:
```python
from django.db import transaction

@action(detail=True, methods=['post'])
def enroll_students(self, request, pk=None):
    with transaction.atomic():
        # Row Lock 적용
        exam = ExaminationInfo.objects.select_for_update().get(pk=pk)
        if exam.exam_state != '0':
            return Response({'detail': '시험이 시작되어 학생을 등록할 수 없습니다.'}, status=400)
        # ... 안전하게 처리
```

---

### 3.2 [Low] 코드 중복

**위치**: 다수의 Serializer에서 동일한 직렬화 로직 반복

예: `creat_user` 필드 직렬화가 여러 Serializer에서 중복됨

**권장 조치**: Mixin 생성
```python
class UserSerializerMixin:
    def get_creat_user(self, obj):
        if obj.create_user:
            return {
                'id': obj.create_user.id,
                'nick_name': obj.create_user.nick_name,
            }
        return None

class ExaminationListSerializer(UserSerializerMixin, serializers.ModelSerializer):
    creat_user = serializers.SerializerMethodField()
    # ...
```

---

## 4. 긍정적인 측면

### 4.1 잘 구현된 부분

| 영역 | 구현 내용 | 위치 |
|------|----------|------|
| **쿼리 최적화** | Query Reuse 패턴 (공통 데이터 1회 조회 후 재사용) | `services.py:40-74` |
| **쿼리 최적화** | `select_related()`, `prefetch_related()` 적극 활용 | 전역 |
| **쿼리 최적화** | Bulk 조회 패턴 (Dict로 O(1) 접근) | `taking_views.py:311-335` |
| **트랜잭션** | `@transaction.atomic` 데코레이터로 원자성 보장 | `taking_views.py:237, 378` |
| **보안 설정** | HTTPS 강제, HSTS 설정, 보안 헤더 | `config/production.py:22-31` |
| **보안 설정** | PostgreSQL SSL 연결 | `config/production.py:44-46` |
| **인증/인가** | JWT + HttpOnly Cookie (XSS 방지) | `user/api/views.py:47-62` |
| **인증/인가** | RBAC 기반 세분화된 권한 클래스 | `core/api/permissions.py` |
| **인증/인가** | Token Rotation, Blacklist 활성화 | `config/api.py` |
| **DB 설계** | 주요 필드에 적절한 인덱스 정의 | `models.py` (각 앱) |

---

## 5. 권장 조치 우선순위

### 즉시 조치 (Critical)

| 순번 | 이슈 | 예상 작업량 |
|------|------|------------|
| 1 | `.env` 파일 git history에서 제거 | 30분 |
| 2 | `ExaminationDetailSerializer.get_testpaper()` N+1 수정 | 1시간 |
| 3 | `ExamTakingViewSet.my_submissions()`, `result()` N+1 수정 | 2시간 |

### 단기 조치 (High)

| 순번 | 이슈 | 예상 작업량 |
|------|------|------------|
| 4 | Exception handler 민감 정보 필터링 | 30분 |
| 5 | API 문서 Production 비활성화 | 30분 |
| 6 | `get_enrolled_students_count()` annotate로 변경 | 1시간 |
| 7 | `get_assigned_score()` bulk 조회로 변경 | 1시간 |

### 중기 조치 (Medium)

| 순번 | 이슈 | 예상 작업량 |
|------|------|------------|
| 8 | XSS 필터링 적용 (django-bleach) | 2시간 |
| 9 | Admin 경로 변경 | 15분 |
| 10 | 대시보드 페이지네이션/캐싱 | 4시간 |
| 11 | Aggregate 쿼리 통합 | 2시간 |

### 장기 조치 (Low)

| 순번 | 이슈 | 예상 작업량 |
|------|------|------------|
| 12 | 파일 업로드 검증 | 1시간 |
| 13 | 코드 중복 제거 (Mixin 도입) | 3시간 |

---

## 6. 파일 위치 참조

| 이슈 | 파일 | 라인 |
|------|------|------|
| 환경 변수 | `examonline/.env` | 전체 |
| Exception 노출 | `examonline/core/api/exceptions.py` | 21 |
| API 문서 노출 | `examonline/examonline/urls.py` | 19-22 |
| N+1 (get_testpaper) | `examonline/apps/examination/api/serializers.py` | 183-200 |
| N+1 (get_enrolled_students_count) | `examonline/apps/examination/api/serializers.py` | 206-208 |
| N+1 (get_assigned_score) | `examonline/apps/examination/api/serializers.py` | 414-423 |
| N+1 (my_submissions) | `examonline/apps/examination/api/taking_views.py` | 547-559 |
| N+1 (result) | `examonline/apps/examination/api/taking_views.py` | 602-614 |
| 메모리 사용 | `examonline/apps/user/services.py` | 40-41 |
| 다중 쿼리 | `examonline/apps/user/services.py` | 518-556 |
| TOCTOU | `examonline/apps/examination/api/views.py` | enroll_students |
| Production 보안 | `examonline/config/production.py` | 22-31 |

---

## 결론

전반적으로 Django 모범 사례를 따르고 있으며, 쿼리 최적화와 보안 설정이 잘 되어 있습니다. 주요 개선 영역은 다음과 같습니다:

1. **Serializer 메서드에서의 N+1 쿼리 문제**: prefetch된 데이터 활용 또는 bulk 조회 패턴 적용
2. **환경 변수 관리**: git history 정리 및 secrets 관리 도구 도입
3. **Exception 정보 노출**: Production 환경에서 민감 정보 필터링

위에 제시된 권장 조치를 우선순위에 따라 적용하면 성능과 보안 모두 향상될 것입니다.
