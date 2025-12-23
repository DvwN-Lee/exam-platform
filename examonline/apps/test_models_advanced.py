"""
Models Layer 고급 테스트.

Bottom-up 테스트 전략에 따른 Model 계층 테스트:
- Field 유효성 검증
- Model Constraint 검증
- Business Logic 검증
- Edge Case 검증
"""

import pytest
from django.db import IntegrityError, transaction
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import timedelta


@pytest.mark.django_db
class TestExaminationInfoModel:
    """ExaminationInfo 모델 테스트"""

    @pytest.fixture(autouse=True)
    def setup(self, db):
        from user.models import UserProfile, SubjectInfo
        self.subject = SubjectInfo.objects.create(subject_name='Test Subject')
        self.user = UserProfile.objects.create_user(
            username='testuser', password='testpass', user_type='teacher'
        )

    def test_exam_state_choices_validation(self):
        """exam_state 필드의 choices 검증"""
        from examination.models import ExaminationInfo

        now = timezone.now()
        exam = ExaminationInfo(
            name='Test Exam',
            subject=self.subject,
            start_time=now,
            end_time=now + timedelta(hours=2),
            exam_state='0',  # 유효한 값
            create_user=self.user
        )
        exam.full_clean()  # ValidationError 없이 통과해야 함
        exam.save()

        assert exam.exam_state == '0'

    def test_exam_state_invalid_choice(self):
        """잘못된 exam_state 값 검증"""
        from examination.models import ExaminationInfo

        now = timezone.now()
        exam = ExaminationInfo(
            name='Test Exam',
            subject=self.subject,
            start_time=now,
            end_time=now + timedelta(hours=2),
            exam_state='9',  # 잘못된 값
            create_user=self.user
        )

        with pytest.raises(ValidationError):
            exam.full_clean()

    def test_exam_type_choices(self):
        """exam_type 필드의 choices 검증"""
        from examination.models import ExaminationInfo

        now = timezone.now()
        # 'pt' (보통) 테스트
        exam_pt = ExaminationInfo.objects.create(
            name='Test Exam PT',
            subject=self.subject,
            start_time=now,
            end_time=now + timedelta(hours=2),
            exam_type='pt',
            create_user=self.user
        )
        assert exam_pt.exam_type == 'pt'

        # 'ts' (특수) 테스트
        exam_ts = ExaminationInfo.objects.create(
            name='Test Exam TS',
            subject=self.subject,
            start_time=now,
            end_time=now + timedelta(hours=2),
            exam_type='ts',
            create_user=self.user
        )
        assert exam_ts.exam_type == 'ts'

    def test_name_max_length(self):
        """name 필드 max_length 검증 (50자)"""
        from examination.models import ExaminationInfo

        now = timezone.now()
        long_name = 'A' * 51  # 51자 (초과)

        exam = ExaminationInfo(
            name=long_name,
            subject=self.subject,
            start_time=now,
            end_time=now + timedelta(hours=2),
            create_user=self.user
        )

        with pytest.raises(ValidationError):
            exam.full_clean()

    def test_student_num_default_value(self):
        """student_num 기본값 검증"""
        from examination.models import ExaminationInfo

        now = timezone.now()
        exam = ExaminationInfo.objects.create(
            name='Test Exam',
            subject=self.subject,
            start_time=now,
            end_time=now + timedelta(hours=2),
            create_user=self.user
        )

        assert exam.student_num == 0
        assert exam.actual_num == 0

    def test_foreign_key_cascade_delete(self):
        """SubjectInfo 삭제 시 CASCADE 동작 검증"""
        from examination.models import ExaminationInfo
        from user.models import SubjectInfo

        temp_subject = SubjectInfo.objects.create(subject_name='Temp Subject')
        now = timezone.now()

        exam = ExaminationInfo.objects.create(
            name='Test Exam',
            subject=temp_subject,
            start_time=now,
            end_time=now + timedelta(hours=2),
            create_user=self.user
        )
        exam_id = exam.id

        # Subject 삭제 시 Exam도 삭제되어야 함
        temp_subject.delete()

        assert not ExaminationInfo.objects.filter(id=exam_id).exists()


@pytest.mark.django_db
class TestTestQuestionInfoModel:
    """TestQuestionInfo 모델 테스트"""

    @pytest.fixture(autouse=True)
    def setup(self, db):
        from user.models import UserProfile, SubjectInfo
        self.subject = SubjectInfo.objects.create(subject_name='Test Subject')
        self.user = UserProfile.objects.create_user(
            username='testuser', password='testpass', user_type='teacher'
        )

    def test_tq_type_choices_validation(self):
        """tq_type 필드의 choices 검증"""
        from testquestion.models import TestQuestionInfo

        valid_types = ['xz', 'pd', 'tk']

        for tq_type in valid_types:
            question = TestQuestionInfo(
                name=f'Question {tq_type}',
                subject=self.subject,
                score=10,
                tq_type=tq_type,
                tq_degree='jd',
                create_user=self.user
            )
            question.full_clean()
            question.save()
            assert question.tq_type == tq_type

    def test_tq_type_invalid_choice(self):
        """잘못된 tq_type 값 검증"""
        from testquestion.models import TestQuestionInfo

        question = TestQuestionInfo(
            name='Invalid Question',
            subject=self.subject,
            score=10,
            tq_type='xx',  # 잘못된 값
            tq_degree='jd',
            create_user=self.user
        )

        with pytest.raises(ValidationError):
            question.full_clean()

    def test_tq_degree_choices_validation(self):
        """tq_degree 필드의 choices 검증"""
        from testquestion.models import TestQuestionInfo

        valid_degrees = ['jd', 'zd', 'kn']

        for tq_degree in valid_degrees:
            question = TestQuestionInfo(
                name=f'Question {tq_degree}',
                subject=self.subject,
                score=10,
                tq_type='xz',
                tq_degree=tq_degree,
                create_user=self.user
            )
            question.full_clean()
            question.save()
            assert question.tq_degree == tq_degree

    def test_name_max_length(self):
        """name 필드 max_length 검증 (500자)"""
        from testquestion.models import TestQuestionInfo

        long_name = 'A' * 501  # 501자 (초과)

        question = TestQuestionInfo(
            name=long_name,
            subject=self.subject,
            score=10,
            tq_type='xz',
            tq_degree='jd',
            create_user=self.user
        )

        with pytest.raises(ValidationError):
            question.full_clean()

    def test_is_del_default_false(self):
        """is_del 기본값 False 검증"""
        from testquestion.models import TestQuestionInfo

        question = TestQuestionInfo.objects.create(
            name='Test Question',
            subject=self.subject,
            score=10,
            tq_type='xz',
            tq_degree='jd',
            create_user=self.user
        )

        assert question.is_del is False

    def test_is_share_default_false(self):
        """is_share 기본값 False 검증"""
        from testquestion.models import TestQuestionInfo

        question = TestQuestionInfo.objects.create(
            name='Test Question',
            subject=self.subject,
            score=10,
            tq_type='xz',
            tq_degree='jd',
            create_user=self.user
        )

        assert question.is_share is False

    def test_foreign_key_protect_on_delete(self):
        """SubjectInfo 삭제 시 PROTECT 동작 검증"""
        from testquestion.models import TestQuestionInfo
        from user.models import SubjectInfo

        temp_subject = SubjectInfo.objects.create(subject_name='Temp Subject')

        question = TestQuestionInfo.objects.create(
            name='Test Question',
            subject=temp_subject,
            score=10,
            tq_type='xz',
            tq_degree='jd',
            create_user=self.user
        )

        # PROTECT이므로 삭제 시 IntegrityError 발생해야 함
        with pytest.raises(Exception):  # ProtectedError
            temp_subject.delete()

    def test_create_user_set_null_on_delete(self):
        """create_user 삭제 시 SET_NULL 동작 검증"""
        from testquestion.models import TestQuestionInfo
        from user.models import UserProfile

        temp_user = UserProfile.objects.create_user(
            username='tempuser', password='testpass', user_type='teacher'
        )

        question = TestQuestionInfo.objects.create(
            name='Test Question',
            subject=self.subject,
            score=10,
            tq_type='xz',
            tq_degree='jd',
            create_user=temp_user
        )
        question_id = question.id

        # 사용자 삭제
        temp_user.delete()

        # 문제는 남아있고 create_user는 NULL이어야 함
        question.refresh_from_db()
        assert question.id == question_id
        assert question.create_user is None


@pytest.mark.django_db
class TestTestPaperInfoModel:
    """TestPaperInfo 모델 테스트"""

    @pytest.fixture(autouse=True)
    def setup(self, db):
        from user.models import UserProfile, SubjectInfo
        self.subject = SubjectInfo.objects.create(subject_name='Test Subject')
        self.user = UserProfile.objects.create_user(
            username='testuser', password='testpass', user_type='teacher'
        )

    def test_total_score_default_value(self):
        """total_score 기본값 100 검증"""
        from testpaper.models import TestPaperInfo

        paper = TestPaperInfo.objects.create(
            name='Test Paper',
            subject=self.subject,
            tp_degree='jd',
            create_user=self.user
        )

        assert paper.total_score == 100

    def test_passing_score_default_value(self):
        """passing_score 기본값 60 검증"""
        from testpaper.models import TestPaperInfo

        paper = TestPaperInfo.objects.create(
            name='Test Paper',
            subject=self.subject,
            tp_degree='jd',
            create_user=self.user
        )

        assert paper.passing_score == 60

    def test_tp_degree_choices_validation(self):
        """tp_degree 필드의 choices 검증"""
        from testpaper.models import TestPaperInfo

        valid_degrees = ['jd', 'zd', 'kn']

        for tp_degree in valid_degrees:
            paper = TestPaperInfo(
                name=f'Paper {tp_degree}',
                subject=self.subject,
                tp_degree=tp_degree,
                create_user=self.user
            )
            paper.full_clean()
            paper.save()
            assert paper.tp_degree == tp_degree

    def test_name_max_length(self):
        """name 필드 max_length 검증 (50자)"""
        from testpaper.models import TestPaperInfo

        long_name = 'A' * 51  # 51자 (초과)

        paper = TestPaperInfo(
            name=long_name,
            subject=self.subject,
            tp_degree='jd',
            create_user=self.user
        )

        with pytest.raises(ValidationError):
            paper.full_clean()


@pytest.mark.django_db
class TestTestPaperTestQModel:
    """TestPaperTestQ 모델 테스트 (M:N Through Model)"""

    @pytest.fixture(autouse=True)
    def setup(self, db):
        from user.models import UserProfile, SubjectInfo
        from testpaper.models import TestPaperInfo
        from testquestion.models import TestQuestionInfo

        self.subject = SubjectInfo.objects.create(subject_name='Test Subject')
        self.user = UserProfile.objects.create_user(
            username='testuser', password='testpass', user_type='teacher'
        )

        self.paper = TestPaperInfo.objects.create(
            name='Test Paper',
            subject=self.subject,
            tp_degree='jd',
            create_user=self.user
        )

        self.question1 = TestQuestionInfo.objects.create(
            name='Question 1',
            subject=self.subject,
            score=10,
            tq_type='xz',
            tq_degree='jd',
            create_user=self.user
        )

        self.question2 = TestQuestionInfo.objects.create(
            name='Question 2',
            subject=self.subject,
            score=10,
            tq_type='xz',
            tq_degree='jd',
            create_user=self.user
        )

    def test_unique_together_constraint(self):
        """unique_together (test_paper, test_question) 검증"""
        from testpaper.models import TestPaperTestQ

        # 첫 번째 매핑 생성
        TestPaperTestQ.objects.create(
            test_paper=self.paper,
            test_question=self.question1,
            score=10,
            order=1
        )

        # 동일한 조합으로 다시 생성 시도
        with pytest.raises(IntegrityError):
            with transaction.atomic():
                TestPaperTestQ.objects.create(
                    test_paper=self.paper,
                    test_question=self.question1,
                    score=10,
                    order=2
                )

    def test_ordering_by_order_field(self):
        """order 필드 기준 정렬 검증"""
        from testpaper.models import TestPaperTestQ

        # 역순으로 생성
        TestPaperTestQ.objects.create(
            test_paper=self.paper,
            test_question=self.question2,
            score=10,
            order=2
        )
        TestPaperTestQ.objects.create(
            test_paper=self.paper,
            test_question=self.question1,
            score=10,
            order=1
        )

        # order 순으로 정렬되어야 함
        paper_questions = TestPaperTestQ.objects.filter(test_paper=self.paper)

        assert paper_questions[0].test_question == self.question1
        assert paper_questions[1].test_question == self.question2

    def test_score_default_value(self):
        """score 기본값 5 검증"""
        from testpaper.models import TestPaperTestQ

        mapping = TestPaperTestQ.objects.create(
            test_paper=self.paper,
            test_question=self.question1,
            order=1
        )

        assert mapping.score == 5

    def test_order_default_value(self):
        """order 기본값 1 검증"""
        from testpaper.models import TestPaperTestQ

        mapping = TestPaperTestQ.objects.create(
            test_paper=self.paper,
            test_question=self.question1,
            score=10
        )

        assert mapping.order == 1

    def test_cascade_delete_on_paper(self):
        """TestPaperInfo 삭제 시 CASCADE 동작 검증"""
        from testpaper.models import TestPaperInfo, TestPaperTestQ

        temp_paper = TestPaperInfo.objects.create(
            name='Temp Paper',
            subject=self.subject,
            tp_degree='jd',
            create_user=self.user
        )

        mapping = TestPaperTestQ.objects.create(
            test_paper=temp_paper,
            test_question=self.question1,
            score=10,
            order=1
        )
        mapping_id = mapping.id

        # Paper 삭제
        temp_paper.delete()

        # Mapping도 삭제되어야 함
        assert not TestPaperTestQ.objects.filter(id=mapping_id).exists()


@pytest.mark.django_db
class TestTestScoresModel:
    """TestScores 모델 테스트"""

    @pytest.fixture(autouse=True)
    def setup(self, db):
        from user.models import UserProfile, SubjectInfo, StudentsInfo
        from testpaper.models import TestPaperInfo

        self.subject = SubjectInfo.objects.create(subject_name='Test Subject')
        self.user = UserProfile.objects.create_user(
            username='testuser', password='testpass', user_type='student'
        )
        self.student = StudentsInfo.objects.create(
            user=self.user,
            student_name='Test Student'
        )
        self.paper = TestPaperInfo.objects.create(
            name='Test Paper',
            subject=self.subject,
            tp_degree='jd',
            total_score=100,
            passing_score=60,
            create_user=self.user
        )

    def test_test_score_default_zero(self):
        """test_score 기본값 0 검증"""
        from testpaper.models import TestScores

        score = TestScores.objects.create(
            user=self.student,
            test_paper=self.paper
        )

        assert score.test_score == 0

    def test_detail_records_default_empty_dict(self):
        """detail_records 기본값 빈 딕셔너리 검증"""
        from testpaper.models import TestScores

        score = TestScores.objects.create(
            user=self.student,
            test_paper=self.paper
        )

        assert score.detail_records == {}

    def test_is_submitted_default_false(self):
        """is_submitted 기본값 False 검증"""
        from testpaper.models import TestScores

        score = TestScores.objects.create(
            user=self.student,
            test_paper=self.paper
        )

        assert score.is_submitted is False

    def test_time_used_default_zero(self):
        """time_used 기본값 0 검증"""
        from testpaper.models import TestScores

        score = TestScores.objects.create(
            user=self.student,
            test_paper=self.paper
        )

        assert score.time_used == 0

    def test_detail_records_json_storage(self):
        """detail_records JSON 저장 검증"""
        from testpaper.models import TestScores

        answer_data = {
            '1': {'answer': 'A', 'is_correct': True, 'score': 10},
            '2': {'answer': 'B', 'is_correct': False, 'score': 0}
        }

        score = TestScores.objects.create(
            user=self.student,
            test_paper=self.paper,
            detail_records=answer_data
        )

        # DB에서 다시 조회
        score.refresh_from_db()

        assert score.detail_records == answer_data
        assert score.detail_records['1']['is_correct'] is True
        assert score.detail_records['2']['score'] == 0

    def test_test_paper_set_null_on_delete(self):
        """test_paper 삭제 시 SET_NULL 동작 검증"""
        from testpaper.models import TestPaperInfo, TestScores

        temp_paper = TestPaperInfo.objects.create(
            name='Temp Paper',
            subject=self.subject,
            tp_degree='jd',
            create_user=self.user
        )

        score = TestScores.objects.create(
            user=self.student,
            test_paper=temp_paper,
            test_score=80
        )
        score_id = score.id

        # Paper 삭제
        temp_paper.delete()

        # Score는 남아있고 test_paper는 NULL이어야 함
        score.refresh_from_db()
        assert score.id == score_id
        assert score.test_paper is None
        assert score.test_score == 80  # 점수는 유지


@pytest.mark.django_db
class TestOptionInfoModel:
    """OptionInfo 모델 테스트"""

    @pytest.fixture(autouse=True)
    def setup(self, db):
        from user.models import UserProfile, SubjectInfo
        from testquestion.models import TestQuestionInfo

        self.subject = SubjectInfo.objects.create(subject_name='Test Subject')
        self.user = UserProfile.objects.create_user(
            username='testuser', password='testpass', user_type='teacher'
        )
        self.question = TestQuestionInfo.objects.create(
            name='Test Question',
            subject=self.subject,
            score=10,
            tq_type='xz',
            tq_degree='jd',
            create_user=self.user
        )

    def test_option_max_length(self):
        """option 필드 max_length 검증 (100자)"""
        from testquestion.models import OptionInfo

        long_option = 'A' * 101  # 101자 (초과)

        option = OptionInfo(
            test_question=self.question,
            option=long_option,
            is_right=True
        )

        with pytest.raises(ValidationError):
            option.full_clean()

    def test_is_right_default_true(self):
        """is_right 기본값 True 검증"""
        from testquestion.models import OptionInfo

        option = OptionInfo.objects.create(
            test_question=self.question,
            option='Test Option'
        )

        assert option.is_right is True

    def test_cascade_delete_on_question(self):
        """TestQuestionInfo 삭제 시 CASCADE 동작 검증"""
        from testquestion.models import TestQuestionInfo, OptionInfo

        temp_question = TestQuestionInfo.objects.create(
            name='Temp Question',
            subject=self.subject,
            score=10,
            tq_type='xz',
            tq_degree='jd',
            create_user=self.user
        )

        option = OptionInfo.objects.create(
            test_question=temp_question,
            option='Option A',
            is_right=True
        )
        option_id = option.id

        # Question 삭제
        temp_question.delete()

        # Option도 삭제되어야 함
        assert not OptionInfo.objects.filter(id=option_id).exists()

    def test_multiple_options_per_question(self):
        """한 문제에 여러 옵션 생성 검증"""
        from testquestion.models import OptionInfo

        options_data = [
            ('Option A', True),
            ('Option B', False),
            ('Option C', False),
            ('Option D', False),
        ]

        for option_text, is_right in options_data:
            OptionInfo.objects.create(
                test_question=self.question,
                option=option_text,
                is_right=is_right
            )

        # 4개의 옵션이 생성되었는지 확인
        assert OptionInfo.objects.filter(test_question=self.question).count() == 4

        # 정답은 1개인지 확인
        assert OptionInfo.objects.filter(
            test_question=self.question,
            is_right=True
        ).count() == 1
