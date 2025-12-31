# 데이터베이스 정규화/비정규화 분석 및 개선

## 개요

OnlineExam 프로젝트의 Django 모델을 정규화/비정규화 관점에서 분석하고, 데이터 무결성과 성능을 개선하기 위한 Schema 변경 작업을 수행했습니다.

**작업 일자**: 2025-12-18
**데이터베이스**: PostgreSQL 18

---

## 분석 배경

기존 Django 2.1.4 프로젝트를 Django 5.2 LTS로 업그레이드하면서, 데이터베이스 Schema의 정규화 수준과 성능 최적화 필요성을 검토했습니다.

### 분석 대상 앱

```
apps/
├── user/           # 사용자, 학생, 교사, 과목 관리
├── testquestion/   # 문제 및 선택지 관리
├── testpaper/      # 시험지 및 성적 관리
├── examination/    # 시험 관리
└── operation/      # 운영 기능 (댓글, 즐겨찾기, 메시지)
```

---

## 식별된 문제점

### 1. 관계 설정의 부적절성

#### 문제: TeacherInfo.user - ForeignKey 사용
```python
# BEFORE
class TeacherInfo(models.Model):
    user = models.ForeignKey(UserProfile, on_delete=models.CASCADE)
```

**문제점**:
- 한 사용자가 여러 TeacherInfo 레코드를 가질 수 있음 (1:N)
- 비즈니스 로직상 한 사용자는 하나의 교사 프로필만 가져야 함
- 데이터 중복 가능성

**해결책**: OneToOneField로 변경
```python
# AFTER
class TeacherInfo(models.Model):
    user = models.OneToOneField(UserProfile, on_delete=models.CASCADE)
```

**효과**:
- 1:1 관계 강제, 데이터베이스 레벨에서 UNIQUE 제약 조건 자동 생성
- 중복 데이터 방지

---

### 2. Cascade 전략의 부적절성

#### 문제: 과목 삭제 시 연쇄 삭제
```python
# BEFORE
class TeacherInfo(models.Model):
    subject = models.ForeignKey(SubjectInfo, on_delete=models.CASCADE)

class TestQuestionInfo(models.Model):
    subject = models.ForeignKey(SubjectInfo, on_delete=models.CASCADE)
```

**문제점**:
- 과목 삭제 시 해당 과목의 모든 교사 정보와 문제가 삭제됨
- 실수로 과목 삭제 시 데이터 손실 위험

**해결책**: PROTECT로 변경
```python
# AFTER
class TeacherInfo(models.Model):
    subject = models.ForeignKey(SubjectInfo, on_delete=models.PROTECT)

class TestQuestionInfo(models.Model):
    subject = models.ForeignKey(SubjectInfo, on_delete=models.PROTECT)

class TestPaperInfo(models.Model):
    subject = models.ForeignKey(SubjectInfo, on_delete=models.PROTECT)
```

**효과**:
- 과목에 연결된 데이터가 있으면 삭제 불가
- 데이터 무결성 보호

---

#### 문제: 사용자 삭제 시 문제/시험지 삭제
```python
# BEFORE
class TestQuestionInfo(models.Model):
    creat_user = models.ForeignKey(UserProfile, on_delete=models.CASCADE)

class TestPaperInfo(models.Model):
    create_user = models.ForeignKey(UserProfile, on_delete=models.CASCADE)
```

**문제점**:
- 출제자/작성자 탈퇴 시 모든 문제와 시험지가 삭제됨
- 다른 사용자가 해당 문제/시험지를 사용 중일 수 있음

**해결책**: SET_NULL로 변경
```python
# AFTER
class TestQuestionInfo(models.Model):
    creat_user = models.ForeignKey(UserProfile, on_delete=models.SET_NULL, null=True)

class TestPaperInfo(models.Model):
    create_user = models.ForeignKey(UserProfile, on_delete=models.SET_NULL, null=True)
```

**효과**:
- 사용자 삭제 시 작성자 정보만 NULL로 설정
- 문제와 시험지는 보존됨

---

#### 문제: 시험지 삭제 시 성적 삭제
```python
# BEFORE
class TestScores(models.Model):
    test_paper = models.ForeignKey(TestPaperInfo, on_delete=models.CASCADE)
```

**문제점**:
- 시험지 삭제 시 모든 성적 기록이 삭제됨
- 성적 이력 관리가 불가능함

**해결책**: SET_NULL로 변경
```python
# AFTER
class TestScores(models.Model):
    test_paper = models.ForeignKey(TestPaperInfo, on_delete=models.SET_NULL, null=True)
```

**효과**:
- 시험지 삭제해도 성적 기록은 보존됨
- 감사(audit) 추적 가능

---

### 3. M:N 매핑 테이블의 정보 부족

#### 문제: TestPaperTestQ - 순서와 배점 정보 없음
```python
# BEFORE
class TestPaperTestQ(models.Model):
    test_paper = models.ForeignKey(TestPaperInfo, on_delete=models.CASCADE)
    test_question = models.ForeignKey(TestQuestionInfo, on_delete=models.CASCADE)
```

**문제점**:
1. 시험지 내 문제 순서를 지정할 수 없음
2. 같은 문제라도 시험지마다 다른 배점을 줄 수 없음
3. 중복 문제 추가 방지 불가

**해결책**: 필드와 제약 조건 추가
```python
# AFTER
class TestPaperTestQ(models.Model):
    test_paper = models.ForeignKey(TestPaperInfo, on_delete=models.CASCADE)
    test_question = models.ForeignKey(TestQuestionInfo, on_delete=models.CASCADE)
    score = models.IntegerField(default=5, verbose_name='문제 배점')
    order = models.PositiveIntegerField(default=1, verbose_name='문제 순서')

    class Meta:
        ordering = ['order']
        unique_together = ('test_paper', 'test_question')
        indexes = [
            models.Index(fields=['test_paper', 'order']),
        ]
```

**효과**:
- 문제 순서 관리 가능
- 시험지별 개별 배점 설정 가능
- 중복 문제 추가 방지
- 순서별 조회 성능 향상

---

### 4. 성능 최적화 - 인덱스 부족

#### 문제: 자주 조회되는 필드에 인덱스 없음

**해결책**: 복합 인덱스 추가

**TestQuestionInfo**:
```python
class Meta:
    indexes = [
        models.Index(fields=['subject', 'tq_type', 'tq_degree']),  # 과목/유형/난이도 필터링
        models.Index(fields=['is_del', 'is_share']),               # 삭제/공유 상태 필터링
    ]
```

**TestScores**:
```python
class Meta:
    indexes = [
        models.Index(fields=['user', 'test_paper']),  # 학생별 성적 조회
    ]
```

**효과**:
- WHERE 절에서 자주 사용되는 조합에 대한 조회 성능 향상
- 테이블 Full Scan 방지

---

### 5. 전략적 비정규화

#### 문제: 시험지의 문제 수 조회 비용
```sql
-- 매번 JOIN과 COUNT 필요
SELECT COUNT(*)
FROM testpaper_testpapertestq
WHERE test_paper_id = 1;
```

**해결책**: question_count 필드 추가 (비정규화)
```python
# AFTER
class TestPaperInfo(models.Model):
    question_count = models.IntegerField(default=0, verbose_name='총 문항 수')
```

**효과**:
- 문제 수 조회 시 JOIN 불필요
- 시험지 목록 조회 성능 향상

**향후 작업**:
- Django Signal을 사용하여 TestPaperTestQ 변경 시 자동 업데이트
```python
@receiver(post_save, sender=TestPaperTestQ)
@receiver(post_delete, sender=TestPaperTestQ)
def update_question_count(sender, instance, **kwargs):
    count = TestPaperTestQ.objects.filter(test_paper=instance.test_paper).count()
    instance.test_paper.question_count = count
    instance.test_paper.save(update_fields=['question_count'])
```

---

### 6. 상세 데이터 추적 부족

#### 문제: TestScores - 총점만 저장
```python
# BEFORE
class TestScores(models.Model):
    test_score = models.IntegerField(default=0, verbose_name='시험 성적')
```

**문제점**:
- 어떤 문제를 맞았는지/틀렸는지 알 수 없음
- 오답 노트 기능 구현 불가
- 학습 분석 불가

**해결책**: JSONField로 상세 답안 기록
```python
# AFTER
class TestScores(models.Model):
    test_score = models.IntegerField(default=0, verbose_name='시험 성적')
    detail_records = models.JSONField(default=dict, verbose_name='상세 답안 기록', blank=True)
```

**데이터 구조 예시**:
```json
{
  "answers": [
    {
      "question_id": 1,
      "student_answer": "A",
      "correct_answer": "B",
      "is_correct": false,
      "score": 0,
      "time_spent": 45
    },
    {
      "question_id": 2,
      "student_answer": "C",
      "correct_answer": "C",
      "is_correct": true,
      "score": 5,
      "time_spent": 30
    }
  ],
  "submitted_at": "2025-12-18T10:30:00Z"
}
```

**효과**:
- 문제별 정답률 분석
- 오답 노트 기능 구현 가능
- 학습 패턴 분석 가능
- PostgreSQL의 JSONField 쿼리 기능 활용

---

## 적용된 개선사항 요약

| 모델 | 변경 내용 | 목적 |
|------|----------|------|
| **TeacherInfo** | `user`: ForeignKey → OneToOneField | 1:1 관계 강제 |
| **TeacherInfo** | `subject`: CASCADE → PROTECT | 과목 삭제 방지 |
| **TestQuestionInfo** | `subject`: default → PROTECT | 과목 삭제 방지 |
| **TestQuestionInfo** | `creat_user`: default → SET_NULL | 출제자 삭제 시 문제 보존 |
| **TestQuestionInfo** | `image`: nullable 추가 | 선택적 이미지 업로드 |
| **TestQuestionInfo** | 인덱스 추가 (subject, type, degree) | 필터링 성능 향상 |
| **TestQuestionInfo** | 인덱스 추가 (is_del, is_share) | 상태 필터링 성능 향상 |
| **TestPaperInfo** | `subject`: default → PROTECT | 과목 삭제 방지 |
| **TestPaperInfo** | `create_user`: default → SET_NULL | 작성자 삭제 시 시험지 보존 |
| **TestPaperInfo** | `question_count` 필드 추가 | 문항 수 빠른 조회 (비정규화) |
| **TestPaperTestQ** | `score` 필드 추가 | 문제별 배점 설정 |
| **TestPaperTestQ** | `order` 필드 추가 | 문제 순서 지정 |
| **TestPaperTestQ** | `unique_together` 제약 추가 | 중복 문제 방지 |
| **TestPaperTestQ** | 인덱스 추가 (test_paper, order) | 순서별 조회 성능 향상 |
| **TestScores** | `test_paper`: default → SET_NULL | 시험지 삭제 시 성적 보존 |
| **TestScores** | `detail_records` 필드 추가 | 상세 답안 기록 (JSONField) |
| **TestScores** | 인덱스 추가 (user, test_paper) | 학생별 성적 조회 성능 향상 |

---

## 마이그레이션 적용 결과

### 생성된 마이그레이션 파일

```
apps/user/migrations/
└── 0003_alter_emailverifyrecord_id_and_more.py

apps/testquestion/migrations/
└── 0004_alter_optioninfo_create_time_alter_optioninfo_id_and_more.py

apps/testpaper/migrations/
└── 0004_alter_testpapertestq_options_and_more.py

apps/examination/migrations/
└── 0004_alter_examinationinfo_create_time_and_more.py

apps/operation/migrations/
└── 0003_alter_examcomments_add_time_alter_examcomments_id_and_more.py
```

### 검증 결과

```bash
# Django 시스템 체크
$ python manage.py check
System check identified no issues (0 silenced).

# 마이그레이션 적용
$ python manage.py migrate
Operations to perform:
  Apply all migrations: admin, auth, contenttypes, examination, operation, sessions, testpaper, testquestion, user
Running migrations:
  Applying examination.0004_alter_examinationinfo_create_time_and_more... OK
  Applying operation.0003_alter_examcomments_add_time_alter_examcomments_id_and_more... OK
  Applying user.0003_alter_emailverifyrecord_id_and_more... OK
  Applying testquestion.0004_alter_optioninfo_create_time_alter_optioninfo_id_and_more... OK
  Applying testpaper.0004_alter_testpapertestq_options_and_more... OK
```

---

## 데이터베이스 Schema 검증

### TestPaperTestQ 테이블
```sql
\d testpaper_testpapertestq

Indexes:
    "testpaper_testpapertestq_pkey" PRIMARY KEY, btree (id)
    "testpaper_t_test_pa_1f1ee0_idx" btree (test_paper_id, "order")  -- NEW
    "testpaper_testpapertestq_test_paper_id_test_quest_4290996c_uniq"
        UNIQUE CONSTRAINT, btree (test_paper_id, test_question_id)  -- NEW
```

### TestScores 테이블
```sql
\d testpaper_testscores

Columns:
    detail_records | jsonb | not null  -- NEW

Indexes:
    "testpaper_t_user_id_2010e0_idx" btree (user_id, test_paper_id)  -- NEW
```

### TeacherInfo 테이블
```sql
\d user_teacherinfo

Indexes:
    "user_teacherinfo_user_id_96257e2f_uniq" UNIQUE CONSTRAINT, btree (user_id)  -- NEW
```

---

## 향후 개선 사항

### 1. Signal을 통한 자동 업데이트

**TestPaperInfo.question_count 자동 갱신**:
```python
# apps/testpaper/signals.py
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import TestPaperTestQ

@receiver([post_save, post_delete], sender=TestPaperTestQ)
def update_question_count(sender, instance, **kwargs):
    paper = instance.test_paper
    paper.question_count = paper.testpapertestq_set.count()
    paper.save(update_fields=['question_count'])
```

### 2. TestQuestionInfo 정규화 고려

**현재 상황**:
- `score` 필드가 TestQuestionInfo에 존재하지만 사용되지 않음
- TestPaperTestQ.score로 문제별 배점 관리

**검토 필요**:
- TestQuestionInfo.score 필드 제거 또는 용도 변경
- "기본 배점"으로 활용 후 TestPaperTestQ에서 override 가능하도록 설정

### 3. 하이브리드 DB 아키텍처 (Phase 후반)

**MongoDB로 이동 고려 대상**:
- `TestScores.detail_records` - 시험 응시 이벤트 로그
- `operation.UserMessage` - 메시지 이력
- `operation.ExamComments` - 댓글 데이터
- Analytics/Audit 데이터

---

## 참고 자료

### 정규화 형식 (Normal Forms)

**제1정규형 (1NF)**: 모든 속성값은 원자값
**제2정규형 (2NF)**: 부분 함수 종속 제거
**제3정규형 (3NF)**: 이행 함수 종속 제거
**BCNF**: 모든 결정자가 후보키 (대부분 준수)

### 적용된 설계 원칙

1. **참조 무결성**: PROTECT, SET_NULL, CASCADE 적절히 사용
2. **성능 최적화**: 전략적 비정규화 (question_count)
3. **확장성**: JSONField를 통한 유연한 데이터 구조
4. **감사 추적**: 삭제된 데이터의 이력 보존 (SET_NULL)
5. **인덱스 전략**: 복합 인덱스를 통한 쿼리 최적화

---

## 작업 이력

| 날짜 | 작업 |
|------|------|
| 2025-12-18 | 데이터베이스 Schema 분석 |
| 2025-12-18 | 모델 정의 수정 (5개 모델, 17개 변경) |
| 2025-12-18 | 마이그레이션 생성 및 적용 |
| 2025-12-18 | PostgreSQL Schema 검증 완료 |
| 2025-12-18 | 정규화 문서 작성 |

---

**문서 버전**: 1.0
**최종 수정일**: 2025-12-18
