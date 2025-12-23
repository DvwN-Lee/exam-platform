# Troubleshooting Guide

Backend 개발 및 테스트 과정에서 발생한 문제와 해결 방법을 정리한 문서.

## 목차

1. [Model Import Error](#1-model-import-error)
2. [Fixture Field Error](#2-fixture-field-error)
3. [URL Path Mismatch](#3-url-path-mismatch)
4. [N+1 Query Problem](#4-n1-query-problem)
5. [Mock Data in Production Code](#5-mock-data-in-production-code)

---

## 1. Model Import Error

### 증상

```
ImportError: cannot import name 'TeachersInfo' from 'user.models'
```

### 원인

Model class 이름의 단수/복수 형태 혼동. Django 프로젝트에서 Model 이름은 일반적으로 단수형을 사용한다.

### 해결

```python
# 잘못된 코드
from user.models import TeachersInfo

# 올바른 코드
from user.models import TeacherInfo
```

### 예방

- Model 이름 작성 시 단수형 사용 원칙 준수
- IDE의 자동 완성 기능 활용
- Import 전 `models.py` 파일 확인

---

## 2. Fixture Field Error

### 증상

```
TypeError: StudentsInfo() got unexpected keyword arguments: 'subject'
```

### 원인

`StudentsInfo` Model에 존재하지 않는 `subject` field를 fixture에서 사용. `subject` field는 `TeacherInfo`에만 존재한다.

### 해결

```python
# 잘못된 코드
@pytest.fixture
def student_info(student_user, subject):
    return StudentsInfo.objects.create(
        user=student_user,
        student_name="Test Student",
        student_id="20230001",
        subject=subject  # StudentsInfo에는 subject field가 없음
    )

# 올바른 코드
@pytest.fixture
def student_info(student_user):
    return StudentsInfo.objects.create(
        user=student_user,
        student_name="Test Student",
        student_id="20230001"
    )
```

### Model Field 참조

| Model | 주요 Field |
|-------|----------|
| `StudentsInfo` | `user`, `student_name`, `student_id` |
| `TeacherInfo` | `user`, `teacher_name`, `subject` |

---

## 3. URL Path Mismatch

### 증상

```
AssertionError: 404 != 200
```

테스트에서 API 호출 시 404 응답 반환.

### 원인

test code에서 사용한 URL path와 실제 `urls.py`에 등록된 path 불일치.

### 분석

```python
# urls.py 확인
router.register('exams', ExamTakingViewSet, basename='exam-taking')

# 실제 생성되는 URL
/api/v1/exams/
/api/v1/exams/available/
/api/v1/exams/{pk}/start/
```

### 해결

```python
# 잘못된 코드
url = "/api/v1/taking/available/"

# 올바른 코드
url = "/api/v1/exams/available/"
```

### 예방

- URL 작성 전 `urls.py` 파일 확인
- Django shell에서 URL reverse 테스트
  ```python
  from django.urls import reverse
  reverse('exam-taking-available')
  ```

---

## 4. N+1 Query Problem

### 증상

- API 응답 시간이 data 증가에 따라 선형적으로 증가
- Database query 수가 결과 row 수에 비례하여 증가

### 원인

Serializer에서 관련 object 접근 시 개별 query가 발생하는 구조.

```python
# 문제가 되는 code (N+1 발생)
class ExaminationListSerializer(serializers.ModelSerializer):
    def get_testpaper(self, obj):
        # 각 exam마다 DB query 발생
        exam_paper = obj.exampaperinfo_set.first()
        if exam_paper and exam_paper.paper:
            return {'id': exam_paper.paper.id, 'name': exam_paper.paper.name}
        return None
```

### 해결: Prefetch + to_attr 사용

Django의 `Prefetch` object와 `to_attr`을 사용하여 N+1 query 문제를 해결한다. 이 방식은 Django 내부 API에 의존하지 않아 안정적이다.

**Step 1: ViewSet에서 Prefetch 설정**

```python
from django.db.models import Prefetch

class ExaminationViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        base_qs = ExaminationInfo.objects.all().select_related(
            'subject', 'create_user'
        ).prefetch_related(
            Prefetch(
                'exampaperinfo_set',
                queryset=ExamPaperInfo.objects.select_related(
                    'paper__subject', 'paper__create_user'
                ),
                to_attr='prefetched_exam_papers'
            ),
        )
        return base_qs
```

**Step 2: Serializer에서 to_attr attribute 사용**

```python
def get_testpaper(self, obj):
    # to_attr로 지정된 attribute 사용 (추가 DB query 없음)
    exam_papers = getattr(obj, 'prefetched_exam_papers', None)
    if exam_papers is None:
        # prefetch가 안 된 경우 fallback (단일 조회 시)
        exam_papers = obj.exampaperinfo_set.all()

    for exam_paper in exam_papers:
        if exam_paper.paper:
            return {'id': exam_paper.paper.id, 'name': exam_paper.paper.name}
    return None
```

### 참고: _prefetched_objects_cache 방식

Django 내부 API인 `_prefetched_objects_cache`를 직접 접근하는 방식도 존재하나, Django version upgrade 시 호환성 문제가 발생할 수 있어 권장하지 않는다.

```python
# 비권장: Django 내부 API 의존
exam_papers = getattr(obj, '_prefetched_objects_cache', {}).get('exampaperinfo_set')
```

### 검증

Django Debug Toolbar 또는 django-silk를 사용하여 query 수 확인:

```python
# settings.py (개발 환경)
INSTALLED_APPS += ['debug_toolbar']
MIDDLEWARE += ['debug_toolbar.middleware.DebugToolbarMiddleware']
```

---

## 5. Mock Data in Production Code

### 증상

- Dashboard API가 항상 동일한 data 반환
- 실제 data와 API 응답이 불일치

### 원인

개발 초기 단계에서 hardcoded mock data를 반환하도록 구현된 코드가 그대로 남아있음.

```python
# 문제가 되는 코드
class StudentDashboardView(APIView):
    def get(self, request):
        # Mock data 반환
        return Response({
            'statistics': {
                'total_exams_taken': 5,  # hardcoded
                'average_score': 85.2,   # hardcoded
                'pass_rate': 80.0,       # hardcoded
            }
        })
```

### 해결

실제 DB query로 교체:

```python
class StudentDashboardView(APIView):
    def get(self, request):
        student_info = request.user.studentsinfo

        # 실제 data 집계
        submissions = TestScores.objects.filter(
            user=student_info,
            is_submitted=True
        ).select_related('exam', 'test_paper')

        total_exams_taken = submissions.count()
        avg_result = submissions.aggregate(avg=Avg('test_score'))
        average_score = round(avg_result['avg'] or 0, 1)

        # 합격률 계산
        if total_exams_taken > 0:
            passed = submissions.filter(
                test_score__gte=F('test_paper__passing_score')
            ).count()
            pass_rate = round((passed / total_exams_taken) * 100, 1)
        else:
            pass_rate = 0

        return Response({
            'statistics': {
                'total_exams_taken': total_exams_taken,
                'average_score': average_score,
                'pass_rate': pass_rate,
            }
        })
```

### 예방

- Mock data 사용 시 `# TODO: Replace with real data` 주석 추가
- Code review 체크리스트에 mock data 검토 항목 포함
- 테스트에서 다양한 data로 응답 검증

---

## 일반적인 디버깅 팁

### 1. pytest 상세 출력

```bash
pytest -v --tb=short  # 간략한 traceback
pytest -v --tb=long   # 상세 traceback
pytest -v -s          # print 문 출력
```

### 2. 특정 테스트만 실행

```bash
pytest apps/user/api/test_dashboard_coverage.py::TestStudentDashboard::test_student_dashboard_success -v
```

### 3. Django shell에서 query 테스트

```bash
python manage.py shell

>>> from examination.models import ExaminationInfo
>>> ExaminationInfo.objects.all().query
```

### 4. Query Logging 활성화

```python
# settings.py
LOGGING = {
    'version': 1,
    'handlers': {
        'console': {'class': 'logging.StreamHandler'},
    },
    'loggers': {
        'django.db.backends': {
            'level': 'DEBUG',
            'handlers': ['console'],
        },
    },
}
```

---

## 참고 문서

- [Coverage Improvement Report](./coverage-improvement-report.md)
- [Phase 4 API Test Results](./phase4-api-test-results.md)
- [Django QuerySet API Reference](https://docs.djangoproject.com/en/5.0/ref/models/querysets/)
