"""
Dashboard Views 커버리지 향상 테스트.

미커버 영역:
- StudentDashboardView (line 158-393)
- TeacherDashboardView (line 411-583)
"""
import pytest
from django.utils import timezone
from datetime import timedelta
from rest_framework import status
from rest_framework.test import APIClient

from user.models import UserProfile, StudentsInfo, SubjectInfo, TeacherInfo
from examination.models import ExaminationInfo, ExamPaperInfo, ExamStudentsInfo
from testpaper.models import TestPaperInfo, TestPaperTestQ, TestScores
from testquestion.models import TestQuestionInfo, OptionInfo


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def subject(db):
    return SubjectInfo.objects.create(subject_name="Computer Science")


@pytest.fixture
def student_user(db):
    return UserProfile.objects.create_user(
        username="dashboard_student",
        password="password123",
        user_type="student",
        nick_name="Dashboard Student"
    )


@pytest.fixture
def student_info(student_user):
    return StudentsInfo.objects.create(
        user=student_user,
        student_name="Dashboard Student",
        student_id="20230010"
    )


@pytest.fixture
def teacher_user(db):
    return UserProfile.objects.create_user(
        username="dashboard_teacher",
        password="password123",
        user_type="teacher",
        nick_name="Dashboard Teacher"
    )


@pytest.fixture
def teacher_info(teacher_user, subject):
    return TeacherInfo.objects.create(
        user=teacher_user,
        teacher_name="Dashboard Teacher",
        subject=subject
    )


@pytest.fixture
def question(subject, teacher_user):
    """객관식 문제 생성"""
    q = TestQuestionInfo.objects.create(
        name="What is 2+2?",
        subject=subject,
        score=10,
        tq_type="xz",
        tq_degree="1",
        is_share=True,
        create_user=teacher_user
    )
    OptionInfo.objects.create(test_question=q, option="3", is_right=False)
    OptionInfo.objects.create(test_question=q, option="4", is_right=True)
    return q


@pytest.fixture
def test_paper(subject, teacher_user):
    return TestPaperInfo.objects.create(
        name="CS Exam Paper",
        subject=subject,
        total_score=100,
        passing_score=60,
        question_count=1,
        create_user=teacher_user
    )


@pytest.fixture
def exam_future(subject, teacher_user, test_paper):
    """미래 시험"""
    now = timezone.now()
    exam = ExaminationInfo.objects.create(
        name="Future CS Exam",
        subject=subject,
        start_time=now + timedelta(days=1),
        end_time=now + timedelta(days=1, hours=2),
        create_user=teacher_user
    )
    ExamPaperInfo.objects.create(exam=exam, paper=test_paper)
    return exam


@pytest.fixture
def exam_ongoing(subject, teacher_user, test_paper):
    """진행 중인 시험"""
    now = timezone.now()
    exam = ExaminationInfo.objects.create(
        name="Ongoing CS Exam",
        subject=subject,
        start_time=now - timedelta(hours=1),
        end_time=now + timedelta(hours=1),
        create_user=teacher_user
    )
    ExamPaperInfo.objects.create(exam=exam, paper=test_paper)
    return exam


@pytest.mark.django_db
class TestStudentDashboard:
    """StudentDashboardView 테스트"""

    def test_student_dashboard_success(self, api_client, student_user, student_info):
        """학생 대시보드 조회 성공"""
        api_client.force_authenticate(user=student_user)
        url = "/api/v1/dashboard/student/"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert 'statistics' in response.data
        assert 'upcoming_exams' in response.data
        assert 'progress' in response.data
        assert 'score_trend' in response.data

    def test_student_dashboard_with_upcoming_exams(
        self, api_client, student_user, student_info, exam_future
    ):
        """예정된 시험이 있는 학생 대시보드"""
        # 학생을 시험에 등록
        ExamStudentsInfo.objects.create(exam=exam_future, student=student_info)

        api_client.force_authenticate(user=student_user)
        url = "/api/v1/dashboard/student/"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['upcoming_exams']) >= 1

        # 시험 정보 확인
        exam_data = response.data['upcoming_exams'][0]
        assert exam_data['exam_name'] == 'Future CS Exam'
        assert 'testpaper' in exam_data
        assert 'start_time' in exam_data

    def test_student_dashboard_no_student_profile(self, api_client, teacher_user):
        """학생 프로필이 없는 경우"""
        api_client.force_authenticate(user=teacher_user)
        url = "/api/v1/dashboard/student/"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert 'Student profile not found' in response.data['error']

    def test_student_dashboard_unauthenticated(self, api_client):
        """인증되지 않은 사용자"""
        url = "/api/v1/dashboard/student/"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_student_dashboard_statistics_structure(self, api_client, student_user, student_info):
        """통계 데이터 구조 확인"""
        api_client.force_authenticate(user=student_user)
        url = "/api/v1/dashboard/student/"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        stats = response.data['statistics']
        assert 'total_exams_taken' in stats
        assert 'average_score' in stats
        assert 'pass_rate' in stats
        assert 'correct_answers' in stats
        assert 'total_questions_answered' in stats

    def test_student_dashboard_progress_structure(self, api_client, student_user, student_info):
        """진행률 데이터 구조 확인"""
        api_client.force_authenticate(user=student_user)
        url = "/api/v1/dashboard/student/"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        progress = response.data['progress']
        assert isinstance(progress, list)
        if len(progress) > 0:
            assert 'subject' in progress[0]
            assert 'progress_percentage' in progress[0]

    def test_student_dashboard_multiple_upcoming_exams(
        self, api_client, student_user, student_info, exam_future, subject, teacher_user, test_paper
    ):
        """여러 예정된 시험"""
        # 추가 시험 생성
        now = timezone.now()
        exam2 = ExaminationInfo.objects.create(
            name="Second Future Exam",
            subject=subject,
            start_time=now + timedelta(days=2),
            end_time=now + timedelta(days=2, hours=2),
            create_user=teacher_user
        )
        ExamPaperInfo.objects.create(exam=exam2, paper=test_paper)

        ExamStudentsInfo.objects.create(exam=exam_future, student=student_info)
        ExamStudentsInfo.objects.create(exam=exam2, student=student_info)

        api_client.force_authenticate(user=student_user)
        url = "/api/v1/dashboard/student/"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['upcoming_exams']) >= 2


@pytest.mark.django_db
class TestTeacherDashboard:
    """TeacherDashboardView 테스트"""

    def test_teacher_dashboard_success(self, api_client, teacher_user, teacher_info):
        """교사 대시보드 조회 성공"""
        api_client.force_authenticate(user=teacher_user)
        url = "/api/v1/dashboard/teacher/"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert 'recent_questions' in response.data
        assert 'recent_testpapers' in response.data
        assert 'ongoing_exams' in response.data
        assert 'question_statistics' in response.data
        assert 'student_statistics' in response.data

    def test_teacher_dashboard_with_questions(
        self, api_client, teacher_user, teacher_info, question
    ):
        """문제가 있는 교사 대시보드"""
        api_client.force_authenticate(user=teacher_user)
        url = "/api/v1/dashboard/teacher/"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['recent_questions']) >= 1

        q = response.data['recent_questions'][0]
        assert 'id' in q
        assert 'name' in q
        assert 'tq_type' in q
        assert 'options' in q

    def test_teacher_dashboard_with_testpapers(
        self, api_client, teacher_user, teacher_info, test_paper
    ):
        """시험지가 있는 교사 대시보드"""
        api_client.force_authenticate(user=teacher_user)
        url = "/api/v1/dashboard/teacher/"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['recent_testpapers']) >= 1

        tp = response.data['recent_testpapers'][0]
        assert 'id' in tp
        assert 'name' in tp
        assert 'question_count' in tp

    def test_teacher_dashboard_with_ongoing_exams(
        self, api_client, teacher_user, teacher_info, exam_ongoing
    ):
        """진행 중인 시험이 있는 교사 대시보드"""
        api_client.force_authenticate(user=teacher_user)
        url = "/api/v1/dashboard/teacher/"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['ongoing_exams']) >= 1

        exam = response.data['ongoing_exams'][0]
        assert 'id' in exam
        assert 'exam_name' in exam
        assert 'testpaper' in exam

    def test_teacher_dashboard_question_statistics(
        self, api_client, teacher_user, teacher_info, question
    ):
        """문제 통계 확인"""
        api_client.force_authenticate(user=teacher_user)
        url = "/api/v1/dashboard/teacher/"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        stats = response.data['question_statistics']
        assert 'total_questions' in stats
        assert 'shared_questions' in stats
        assert 'questions_by_type' in stats
        assert 'questions_by_difficulty' in stats

    def test_teacher_dashboard_student_statistics(
        self, api_client, teacher_user, teacher_info, exam_ongoing, student_info, test_paper
    ):
        """학생 통계 확인"""
        # 학생을 시험에 등록
        ExamStudentsInfo.objects.create(exam=exam_ongoing, student=student_info)

        # 제출 기록 생성
        TestScores.objects.create(
            exam=exam_ongoing,
            user=student_info,
            test_paper=test_paper,
            is_submitted=True,
            test_score=80,
            submit_time=timezone.now()
        )

        api_client.force_authenticate(user=teacher_user)
        url = "/api/v1/dashboard/teacher/"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        stats = response.data['student_statistics']
        assert 'total_students' in stats
        assert 'total_submissions' in stats
        assert 'average_score' in stats
        assert 'pass_rate' in stats

    def test_teacher_dashboard_not_teacher(self, api_client, student_user, student_info):
        """학생이 교사 대시보드 접근 시도"""
        api_client.force_authenticate(user=student_user)
        url = "/api/v1/dashboard/teacher/"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_teacher_dashboard_unauthenticated(self, api_client):
        """인증되지 않은 사용자"""
        url = "/api/v1/dashboard/teacher/"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_teacher_dashboard_empty_data(self, api_client, teacher_user, teacher_info):
        """데이터가 없는 경우"""
        api_client.force_authenticate(user=teacher_user)
        url = "/api/v1/dashboard/teacher/"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        # 빈 리스트 또는 0 값으로 반환
        assert isinstance(response.data['recent_questions'], list)
        assert isinstance(response.data['recent_testpapers'], list)

    def test_teacher_dashboard_pass_rate_calculation(
        self, api_client, teacher_user, teacher_info, exam_ongoing, student_info, test_paper
    ):
        """합격률 계산 테스트"""
        ExamStudentsInfo.objects.create(exam=exam_ongoing, student=student_info)

        # 합격 점수 기록
        TestScores.objects.create(
            exam=exam_ongoing,
            user=student_info,
            test_paper=test_paper,
            is_submitted=True,
            test_score=80,  # 60점 이상이면 합격
            submit_time=timezone.now()
        )

        api_client.force_authenticate(user=teacher_user)
        url = "/api/v1/dashboard/teacher/"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        stats = response.data['student_statistics']
        assert stats['pass_rate'] == 100.0  # 1명 합격 / 1명 = 100%
        assert stats['average_score'] == 80.0

    def test_teacher_dashboard_multiple_submissions(
        self, api_client, teacher_user, teacher_info, exam_ongoing, student_info, test_paper
    ):
        """여러 제출이 있는 경우"""
        ExamStudentsInfo.objects.create(exam=exam_ongoing, student=student_info)

        # 추가 학생 생성
        student_user2 = UserProfile.objects.create_user(
            username="student2", password="password", user_type="student"
        )
        student_info2 = StudentsInfo.objects.create(
            user=student_user2, student_name="Student 2", student_id="20230002"
        )
        ExamStudentsInfo.objects.create(exam=exam_ongoing, student=student_info2)

        # 제출 기록
        TestScores.objects.create(
            exam=exam_ongoing,
            user=student_info,
            test_paper=test_paper,
            is_submitted=True,
            test_score=80,
            submit_time=timezone.now()
        )
        TestScores.objects.create(
            exam=exam_ongoing,
            user=student_info2,
            test_paper=test_paper,
            is_submitted=True,
            test_score=50,  # 불합격
            submit_time=timezone.now()
        )

        api_client.force_authenticate(user=teacher_user)
        url = "/api/v1/dashboard/teacher/"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        stats = response.data['student_statistics']
        assert stats['total_submissions'] == 2
        assert stats['average_score'] == 65.0  # (80 + 50) / 2
        assert stats['pass_rate'] == 50.0  # 1명 합격 / 2명 = 50%
