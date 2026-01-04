"""
Serializers Layer 단위 테스트.

Bottom-up 테스트 전략에 따른 Serializer 계층 테스트:
- Field 유효성 검증
- SerializerMethodField 반환값 검증
- Nested Serializer 검증
- Validation 규칙 검증
"""

import pytest
from django.utils import timezone
from datetime import timedelta
from rest_framework.exceptions import ValidationError
from unittest.mock import Mock


@pytest.mark.django_db
class TestQuestionSerializers:
    """Question 관련 Serializer 테스트"""

    @pytest.fixture(autouse=True)
    def setup(self, db):
        from user.models import UserProfile, SubjectInfo
        from testquestion.models import TestQuestionInfo, OptionInfo

        self.subject = SubjectInfo.objects.create(subject_name='Test Subject')
        self.user = UserProfile.objects.create_user(
            username='testteacher',
            password='testpass',
            user_type='teacher',
            nick_name='Test Teacher'
        )

        self.question = TestQuestionInfo.objects.create(
            name='Test Question',
            subject=self.subject,
            score=10,
            tq_type='xz',
            tq_degree='jd',
            create_user=self.user
        )

        # 옵션 생성
        self.option1 = OptionInfo.objects.create(
            test_question=self.question,
            option='Option A',
            is_right=True
        )
        self.option2 = OptionInfo.objects.create(
            test_question=self.question,
            option='Option B',
            is_right=False
        )

    def test_option_read_serializer_fields(self):
        """OptionReadSerializer 필드 반환 검증"""
        from testquestion.api.serializers import OptionReadSerializer

        serializer = OptionReadSerializer(self.option1)
        data = serializer.data

        assert 'id' in data
        assert 'option' in data
        assert 'is_right' in data
        assert 'create_time' in data
        assert data['option'] == 'Option A'
        assert data['is_right'] is True

    def test_option_write_serializer_id_optional(self):
        """OptionWriteSerializer의 id 필드는 optional"""
        from testquestion.api.serializers import OptionWriteSerializer

        # id 없이 유효
        data = {'option': 'New Option', 'is_right': False}
        serializer = OptionWriteSerializer(data=data)
        assert serializer.is_valid()

        # id 포함해도 유효
        data_with_id = {'id': 1, 'option': 'New Option', 'is_right': False}
        serializer_with_id = OptionWriteSerializer(data=data_with_id)
        assert serializer_with_id.is_valid()

    def test_question_list_serializer_get_creat_user(self):
        """QuestionListSerializer의 get_creat_user 메서드 검증"""
        from testquestion.api.serializers import QuestionListSerializer

        serializer = QuestionListSerializer(self.question)
        data = serializer.data

        assert 'creat_user' in data
        assert data['creat_user']['id'] == self.user.id
        assert data['creat_user']['nick_name'] == 'Test Teacher'

    def test_question_list_serializer_get_creat_user_null(self):
        """create_user가 None인 경우 get_creat_user 반환값 검증"""
        from testquestion.api.serializers import QuestionListSerializer
        from testquestion.models import TestQuestionInfo

        question_no_user = TestQuestionInfo.objects.create(
            name='No User Question',
            subject=self.subject,
            score=5,
            tq_type='pd',
            tq_degree='zd',
            create_user=None
        )

        serializer = QuestionListSerializer(question_no_user)
        data = serializer.data

        assert data['creat_user'] is None

    def test_question_list_serializer_get_options_empty(self):
        """QuestionListSerializer의 get_options는 빈 배열 반환"""
        from testquestion.api.serializers import QuestionListSerializer

        serializer = QuestionListSerializer(self.question)
        data = serializer.data

        assert data['options'] == []

    def test_question_detail_serializer_includes_options(self):
        """QuestionDetailSerializer는 옵션 포함"""
        from testquestion.api.serializers import QuestionDetailSerializer

        serializer = QuestionDetailSerializer(self.question)
        data = serializer.data

        assert 'options' in data
        assert len(data['options']) == 2
        assert data['options'][0]['option'] in ['Option A', 'Option B']

    def test_question_create_serializer_xz_requires_options(self):
        """객관식(xz) 문제는 최소 2개 옵션 필요"""
        from testquestion.api.serializers import QuestionCreateSerializer

        # 옵션 없음 -> 오류
        data = {
            'name': 'New Question',
            'subject_id': self.subject.id,
            'score': 10,
            'tq_type': 'xz',
            'tq_degree': 'jd',
            'options': []
        }

        serializer = QuestionCreateSerializer(data=data)
        assert not serializer.is_valid()
        assert 'options' in serializer.errors

    def test_question_create_serializer_xz_requires_correct_answer(self):
        """객관식 문제는 최소 1개 정답 필요"""
        from testquestion.api.serializers import QuestionCreateSerializer

        # 정답 없는 옵션들
        data = {
            'name': 'New Question',
            'subject_id': self.subject.id,
            'score': 10,
            'tq_type': 'xz',
            'tq_degree': 'jd',
            'options': [
                {'option': 'A', 'is_right': False},
                {'option': 'B', 'is_right': False},
            ]
        }

        serializer = QuestionCreateSerializer(data=data)
        assert not serializer.is_valid()
        assert 'options' in serializer.errors

    def test_question_create_serializer_xz_valid(self):
        """객관식 문제 유효한 경우"""
        from testquestion.api.serializers import QuestionCreateSerializer

        data = {
            'name': 'Valid Question',
            'subject_id': self.subject.id,
            'score': 10,
            'tq_type': 'xz',
            'tq_degree': 'jd',
            'options': [
                {'option': 'A', 'is_right': True},
                {'option': 'B', 'is_right': False},
            ]
        }

        serializer = QuestionCreateSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

    def test_question_create_serializer_pd_no_options_required(self):
        """주관식(pd) 문제는 옵션 필수 아님"""
        from testquestion.api.serializers import QuestionCreateSerializer

        data = {
            'name': 'Subjective Question',
            'subject_id': self.subject.id,
            'score': 10,
            'tq_type': 'pd',
            'tq_degree': 'jd',
            'options': []
        }

        serializer = QuestionCreateSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

    def test_question_update_serializer_validates_options(self):
        """QuestionUpdateSerializer도 객관식 옵션 검증"""
        from testquestion.api.serializers import QuestionUpdateSerializer

        # 객관식 문제에 대해 옵션 1개만 제공
        data = {
            'options': [{'option': 'A', 'is_right': True}]
        }

        serializer = QuestionUpdateSerializer(instance=self.question, data=data, partial=True)
        assert not serializer.is_valid()
        assert 'options' in serializer.errors

    def test_question_share_serializer_requires_is_share(self):
        """QuestionShareSerializer는 is_share 필수"""
        from testquestion.api.serializers import QuestionShareSerializer

        # is_share 없음
        serializer = QuestionShareSerializer(data={})
        assert not serializer.is_valid()
        assert 'is_share' in serializer.errors

        # is_share 있음
        serializer_valid = QuestionShareSerializer(data={'is_share': True})
        assert serializer_valid.is_valid()


@pytest.mark.django_db
class TestTestPaperSerializers:
    """TestPaper 관련 Serializer 테스트"""

    @pytest.fixture(autouse=True)
    def setup(self, db):
        from user.models import UserProfile, SubjectInfo
        from testpaper.models import TestPaperInfo, TestPaperTestQ
        from testquestion.models import TestQuestionInfo, OptionInfo

        self.subject = SubjectInfo.objects.create(subject_name='Test Subject')
        self.user = UserProfile.objects.create_user(
            username='testteacher',
            password='testpass',
            user_type='teacher',
            nick_name='Test Teacher'
        )

        self.question1 = TestQuestionInfo.objects.create(
            name='Question 1',
            subject=self.subject,
            score=10,
            tq_type='xz',
            tq_degree='jd',
            create_user=self.user
        )
        OptionInfo.objects.create(test_question=self.question1, option='A', is_right=True)
        OptionInfo.objects.create(test_question=self.question1, option='B', is_right=False)

        self.question2 = TestQuestionInfo.objects.create(
            name='Question 2',
            subject=self.subject,
            score=10,
            tq_type='xz',
            tq_degree='zd',
            create_user=self.user
        )
        OptionInfo.objects.create(test_question=self.question2, option='A', is_right=True)
        OptionInfo.objects.create(test_question=self.question2, option='B', is_right=False)

        self.paper = TestPaperInfo.objects.create(
            name='Test Paper',
            subject=self.subject,
            tp_degree='jd',
            total_score=20,
            passing_score=12,
            question_count=2,
            create_user=self.user
        )

        TestPaperTestQ.objects.create(
            test_paper=self.paper,
            test_question=self.question1,
            score=10,
            order=1
        )
        TestPaperTestQ.objects.create(
            test_paper=self.paper,
            test_question=self.question2,
            score=10,
            order=2
        )

    def test_paper_question_write_serializer_min_value(self):
        """PaperQuestionWriteSerializer의 min_value 검증"""
        from testpaper.api.serializers import PaperQuestionWriteSerializer

        # score 0 -> 오류 (min_value=1)
        data = {
            'question_id': self.question1.id,
            'score': 0,
            'order': 1
        }
        serializer = PaperQuestionWriteSerializer(data=data)
        assert not serializer.is_valid()
        assert 'score' in serializer.errors

        # order 0 -> 오류 (min_value=1)
        data_order = {
            'question_id': self.question1.id,
            'score': 5,
            'order': 0
        }
        serializer_order = PaperQuestionWriteSerializer(data=data_order)
        assert not serializer_order.is_valid()
        assert 'order' in serializer_order.errors

    def test_paper_question_write_serializer_valid(self):
        """PaperQuestionWriteSerializer 유효한 경우"""
        from testpaper.api.serializers import PaperQuestionWriteSerializer

        data = {
            'question_id': self.question1.id,
            'score': 10,
            'order': 1
        }
        serializer = PaperQuestionWriteSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

    def test_testpaper_list_serializer_get_creat_user(self):
        """TestPaperListSerializer의 get_creat_user 메서드 검증"""
        from testpaper.api.serializers import TestPaperListSerializer

        serializer = TestPaperListSerializer(self.paper)
        data = serializer.data

        assert 'creat_user' in data
        assert data['creat_user']['id'] == self.user.id
        assert data['creat_user']['nick_name'] == 'Test Teacher'

    def test_testpaper_detail_serializer_includes_questions(self):
        """TestPaperDetailSerializer는 문제 목록 포함"""
        from testpaper.api.serializers import TestPaperDetailSerializer

        serializer = TestPaperDetailSerializer(self.paper)
        data = serializer.data

        assert 'questions' in data
        assert len(data['questions']) == 2

    def test_testpaper_create_serializer_duplicate_questions(self):
        """TestPaperCreateSerializer 중복 문제 검증"""
        from testpaper.api.serializers import TestPaperCreateSerializer

        data = {
            'name': 'New Paper',
            'subject_id': self.subject.id,
            'tp_degree': 'jd',
            'passing_score': 60,
            'questions': [
                {'question_id': self.question1.id, 'score': 10, 'order': 1},
                {'question_id': self.question1.id, 'score': 10, 'order': 2},  # 중복
            ]
        }

        serializer = TestPaperCreateSerializer(data=data)
        assert not serializer.is_valid()
        assert 'questions' in serializer.errors

    def test_testpaper_update_serializer_duplicate_questions(self):
        """TestPaperUpdateSerializer 중복 문제 검증"""
        from testpaper.api.serializers import TestPaperUpdateSerializer

        data = {
            'questions': [
                {'question_id': self.question1.id, 'score': 10, 'order': 1},
                {'question_id': self.question1.id, 'score': 10, 'order': 2},  # 중복
            ]
        }

        serializer = TestPaperUpdateSerializer(instance=self.paper, data=data, partial=True)
        assert not serializer.is_valid()
        assert 'questions' in serializer.errors

    def test_add_questions_serializer_empty(self):
        """AddQuestionsSerializer 빈 questions 검증"""
        from testpaper.api.serializers import AddQuestionsSerializer

        data = {'questions': []}
        serializer = AddQuestionsSerializer(data=data)
        assert not serializer.is_valid()
        assert 'questions' in serializer.errors

    def test_add_questions_serializer_duplicate(self):
        """AddQuestionsSerializer 중복 문제 검증"""
        from testpaper.api.serializers import AddQuestionsSerializer

        data = {
            'questions': [
                {'question_id': self.question1.id, 'score': 10, 'order': 1},
                {'question_id': self.question1.id, 'score': 10, 'order': 2},
            ]
        }
        serializer = AddQuestionsSerializer(data=data)
        assert not serializer.is_valid()
        assert 'questions' in serializer.errors


@pytest.mark.django_db
class TestScoreSerializers:
    """Score 관련 Serializer 테스트"""

    @pytest.fixture(autouse=True)
    def setup(self, db):
        from user.models import UserProfile, SubjectInfo, StudentsInfo
        from testpaper.models import TestPaperInfo, TestPaperTestQ, TestScores
        from testquestion.models import TestQuestionInfo, OptionInfo
        from examination.models import ExaminationInfo

        self.subject = SubjectInfo.objects.create(subject_name='Test Subject')
        self.teacher = UserProfile.objects.create_user(
            username='teacher', password='pass', user_type='teacher'
        )
        self.student_user = UserProfile.objects.create_user(
            username='student', password='pass', user_type='student'
        )
        self.student = StudentsInfo.objects.create(
            user=self.student_user,
            student_name='Test Student',
            student_id='STU001',
            student_class='Class A'
        )

        self.question = TestQuestionInfo.objects.create(
            name='Question 1',
            subject=self.subject,
            score=10,
            tq_type='xz',
            tq_degree='jd',
            create_user=self.teacher
        )
        OptionInfo.objects.create(test_question=self.question, option='A', is_right=True)

        self.paper = TestPaperInfo.objects.create(
            name='Test Paper',
            subject=self.subject,
            tp_degree='jd',
            total_score=10,
            passing_score=6,
            question_count=1,
            create_user=self.teacher
        )

        self.paper_question = TestPaperTestQ.objects.create(
            test_paper=self.paper,
            test_question=self.question,
            score=10,
            order=1
        )

        now = timezone.now()
        self.exam = ExaminationInfo.objects.create(
            name='Test Exam',
            subject=self.subject,
            start_time=now,
            end_time=now + timedelta(hours=2),
            create_user=self.teacher
        )

        self.test_score = TestScores.objects.create(
            user=self.student,
            test_paper=self.paper,
            exam=self.exam,
            test_score=8,
            is_submitted=True,
            detail_records={
                str(self.question.id): {
                    'answer': 'A',
                    'is_correct': True,
                    'score': 10
                }
            }
        )

    def test_student_basic_serializer_fields(self):
        """StudentBasicSerializer 필드 검증"""
        from testpaper.api.serializers import StudentBasicSerializer

        serializer = StudentBasicSerializer(self.student)
        data = serializer.data

        assert data['id'] == self.student.id
        assert data['student_name'] == 'Test Student'
        assert data['student_id'] == 'STU001'
        assert data['student_class'] == 'Class A'

    def test_my_score_list_serializer_passed(self):
        """MyScoreListSerializer의 passed 필드 검증"""
        from testpaper.api.serializers import MyScoreListSerializer

        serializer = MyScoreListSerializer(self.test_score)
        data = serializer.data

        # 8점 >= 6점(합격점) -> True
        assert data['passed'] is True

    def test_my_score_list_serializer_failed(self):
        """MyScoreListSerializer의 passed 필드 - 불합격 케이스"""
        from testpaper.api.serializers import MyScoreListSerializer
        from testpaper.models import TestScores

        failed_score = TestScores.objects.create(
            user=self.student,
            test_paper=self.paper,
            exam=self.exam,
            test_score=4,  # 4점 < 6점(합격점)
            is_submitted=True
        )

        serializer = MyScoreListSerializer(failed_score)
        data = serializer.data

        assert data['passed'] is False

    def test_my_score_detail_serializer_question_results(self):
        """MyScoreDetailSerializer의 question_results 검증"""
        from testpaper.api.serializers import MyScoreDetailSerializer

        serializer = MyScoreDetailSerializer(self.test_score)
        data = serializer.data

        assert 'question_results' in data
        assert len(data['question_results']) == 1
        assert data['question_results'][0]['question_id'] == self.question.id
        assert data['question_results'][0]['user_answer'] == 'A'
        assert data['question_results'][0]['is_correct'] is True

    def test_manual_grade_serializer_max_score_validation(self):
        """ManualGradeSerializer 최대 배점 검증"""
        from testpaper.api.serializers import ManualGradeSerializer

        # 10점 초과 -> 오류
        data = {
            'question_id': self.question.id,
            'score': 15  # 최대 10점
        }

        serializer = ManualGradeSerializer(
            data=data,
            context={'test_score': self.test_score}
        )
        assert not serializer.is_valid()
        assert 'score' in serializer.errors

    def test_manual_grade_serializer_invalid_question(self):
        """ManualGradeSerializer 시험지에 없는 문제 검증"""
        from testpaper.api.serializers import ManualGradeSerializer

        data = {
            'question_id': 99999,  # 존재하지 않는 문제
            'score': 5
        }

        serializer = ManualGradeSerializer(
            data=data,
            context={'test_score': self.test_score}
        )
        assert not serializer.is_valid()
        assert 'question_id' in serializer.errors

    def test_manual_grade_serializer_valid(self):
        """ManualGradeSerializer 유효한 경우"""
        from testpaper.api.serializers import ManualGradeSerializer

        data = {
            'question_id': self.question.id,
            'score': 8,
            'comment': 'Good answer'
        }

        serializer = ManualGradeSerializer(
            data=data,
            context={'test_score': self.test_score}
        )
        assert serializer.is_valid(), serializer.errors

    def test_exam_statistics_serializer_fields(self):
        """ExamStatisticsSerializer 필드 검증"""
        from testpaper.api.serializers import ExamStatisticsSerializer

        data = {
            'exam_id': 1,
            'exam_name': 'Test Exam',
            'total_students': 10,
            'submitted_count': 8,
            'not_submitted_count': 2,
            'average_score': 75.5,
            'highest_score': 100,
            'lowest_score': 45,
            'pass_count': 6,
            'fail_count': 2,
            'pass_rate': 75.0
        }

        serializer = ExamStatisticsSerializer(data=data)
        assert serializer.is_valid(), serializer.errors


@pytest.mark.django_db
class TestExaminationSerializers:
    """Examination 관련 Serializer 테스트"""

    @pytest.fixture(autouse=True)
    def setup(self, db):
        from user.models import UserProfile, SubjectInfo, StudentsInfo
        from testpaper.models import TestPaperInfo
        from examination.models import ExaminationInfo

        self.subject = SubjectInfo.objects.create(subject_name='Test Subject')
        self.teacher = UserProfile.objects.create_user(
            username='teacher', password='pass', user_type='teacher', nick_name='Teacher'
        )

        self.paper = TestPaperInfo.objects.create(
            name='Test Paper',
            subject=self.subject,
            tp_degree='jd',
            total_score=100,
            passing_score=60,
            create_user=self.teacher
        )

        now = timezone.now()
        self.exam = ExaminationInfo.objects.create(
            name='Test Exam',
            subject=self.subject,
            start_time=now,
            end_time=now + timedelta(hours=2),
            exam_state='0',
            create_user=self.teacher
        )

    def test_examination_list_serializer_fields(self):
        """ExaminationListSerializer 필드 검증"""
        from examination.api.serializers import ExaminationListSerializer

        serializer = ExaminationListSerializer(self.exam)
        data = serializer.data

        assert 'id' in data
        assert 'exam_name' in data
        assert 'subject' in data
        assert 'start_time' in data
        assert 'end_time' in data
        assert 'exam_state' in data
        assert 'duration' in data

    def test_examination_list_serializer_duration(self):
        """ExaminationListSerializer의 duration 계산 검증"""
        from examination.api.serializers import ExaminationListSerializer

        serializer = ExaminationListSerializer(self.exam)
        data = serializer.data

        # 2시간 = 120분
        assert data['duration'] == 120

    def test_examination_detail_serializer_includes_testpaper(self):
        """ExaminationDetailSerializer에 testpaper 포함 검증"""
        from examination.api.serializers import ExaminationDetailSerializer
        from examination.models import ExamPaperInfo

        # 시험지 연결
        ExamPaperInfo.objects.create(exam=self.exam, paper=self.paper)

        serializer = ExaminationDetailSerializer(self.exam)
        data = serializer.data

        assert 'testpaper' in data
        assert data['testpaper']['id'] == self.paper.id

    def test_examination_create_serializer_duration_required(self):
        """ExaminationCreateSerializer duration 필수 검증"""
        from examination.api.serializers import ExaminationCreateSerializer

        now = timezone.now()
        data = {
            'exam_name': 'Test Exam',
            'subject_id': self.subject.id,
            'start_time': now,
            # duration 누락
        }

        serializer = ExaminationCreateSerializer(data=data)
        assert not serializer.is_valid()
        assert 'duration' in serializer.errors

    def test_examination_create_serializer_valid(self):
        """ExaminationCreateSerializer 유효한 경우"""
        from examination.api.serializers import ExaminationCreateSerializer

        future_time = timezone.now() + timedelta(hours=1)  # 미래 시간
        data = {
            'name': 'Valid Exam',
            'subject_id': self.subject.id,
            'start_time': future_time,
            'duration': 120,  # 2시간
            'papers': [{'paper_id': self.paper.id}]
        }

        serializer = ExaminationCreateSerializer(data=data)
        assert serializer.is_valid(), serializer.errors
