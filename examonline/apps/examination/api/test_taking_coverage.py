"""
ExamTakingViewSet 커버리지 향상 테스트.

미커버 영역:
- available_exams action
- save_answer action
- my_submissions action
- result action
"""
import pytest
from django.utils import timezone
from datetime import timedelta
from rest_framework import status
from rest_framework.test import APIClient

from user.models import UserProfile, StudentsInfo, SubjectInfo
from examination.models import ExaminationInfo, ExamPaperInfo, ExamStudentsInfo
from testpaper.models import TestPaperInfo, TestPaperTestQ, TestScores
from testquestion.models import TestQuestionInfo, OptionInfo


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def subject(db):
    return SubjectInfo.objects.create(subject_name="Mathematics")


@pytest.fixture
def student_user(db):
    return UserProfile.objects.create_user(
        username="student_cov",
        password="password123",
        user_type="student",
        nick_name="Test Student"
    )


@pytest.fixture
def student_info(student_user):
    return StudentsInfo.objects.create(
        user=student_user,
        student_name="Test Student",
        student_id="20230001"
    )


@pytest.fixture
def teacher_user(db):
    return UserProfile.objects.create_user(
        username="teacher_cov",
        password="password123",
        user_type="teacher",
        nick_name="Test Teacher"
    )


@pytest.fixture
def question(subject, teacher_user):
    """객관식 문제 생성"""
    q = TestQuestionInfo.objects.create(
        name="1+1=?",
        subject=subject,
        score=10,
        tq_type="xz",
        create_user=teacher_user
    )
    OptionInfo.objects.create(test_question=q, option="1", is_right=False)
    correct_option = OptionInfo.objects.create(test_question=q, option="2", is_right=True)
    q.correct_option_id = correct_option.id
    return q


@pytest.fixture
def test_paper(subject, teacher_user):
    return TestPaperInfo.objects.create(
        name="Math Exam Paper",
        subject=subject,
        total_score=100,
        passing_score=60,
        question_count=1,
        create_user=teacher_user
    )


@pytest.fixture
def test_paper_question(test_paper, question):
    return TestPaperTestQ.objects.create(
        test_paper=test_paper,
        test_question=question,
        score=10,
        order=1
    )


@pytest.fixture
def exam(subject, teacher_user):
    """현재 응시 가능한 시험"""
    now = timezone.now()
    return ExaminationInfo.objects.create(
        name="Midterm Exam",
        subject=subject,
        start_time=now - timedelta(hours=1),
        end_time=now + timedelta(hours=1),
        create_user=teacher_user
    )


@pytest.fixture
def exam_setup(exam, test_paper, student_info, test_paper_question):
    """시험 환경 설정: 시험지 연결 + 학생 등록"""
    ExamPaperInfo.objects.create(exam=exam, paper=test_paper)
    ExamStudentsInfo.objects.create(exam=exam, student=student_info)
    return exam


@pytest.mark.django_db
class TestAvailableExams:
    """available_exams action 테스트"""

    def test_available_exams_success(self, api_client, student_user, student_info, exam_setup):
        """학생의 응시 가능한 시험 목록 조회 성공"""
        api_client.force_authenticate(user=student_user)
        url = "/api/v1/exams/available/"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] >= 1
        exam_ids = [e['id'] for e in response.data['results']]
        assert exam_setup.id in exam_ids

    def test_available_exams_no_student_info(self, api_client, teacher_user):
        """학생 정보가 없는 경우 403 Forbidden"""
        api_client.force_authenticate(user=teacher_user)
        url = "/api/v1/exams/available/"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert '학생 정보를 찾을 수 없습니다' in response.data['detail']

    def test_available_exams_future_exam(self, api_client, student_user, student_info, exam_setup):
        """아직 시작하지 않은 시험은 목록에 노출되지 않음"""
        api_client.force_authenticate(user=student_user)

        # 시험 시간을 미래로 변경
        exam_setup.start_time = timezone.now() + timedelta(hours=1)
        exam_setup.end_time = timezone.now() + timedelta(hours=2)
        exam_setup.save()

        url = "/api/v1/exams/available/"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        exam_ids = [e['id'] for e in response.data['results']]
        assert exam_setup.id not in exam_ids

    def test_available_exams_past_exam(self, api_client, student_user, student_info, exam_setup):
        """종료된 시험은 목록에 노출되지 않음"""
        api_client.force_authenticate(user=student_user)

        # 시험 시간을 과거로 변경
        exam_setup.start_time = timezone.now() - timedelta(hours=2)
        exam_setup.end_time = timezone.now() - timedelta(hours=1)
        exam_setup.save()

        url = "/api/v1/exams/available/"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        exam_ids = [e['id'] for e in response.data['results']]
        assert exam_setup.id not in exam_ids

    def test_available_exams_submitted(self, api_client, student_user, student_info, exam_setup, test_paper):
        """이미 제출한 시험은 목록에 노출되지 않음"""
        api_client.force_authenticate(user=student_user)

        TestScores.objects.create(
            exam=exam_setup,
            user=student_info,
            test_paper=test_paper,
            is_submitted=True,
            test_score=100
        )

        url = "/api/v1/exams/available/"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        exam_ids = [e['id'] for e in response.data['results']]
        assert exam_setup.id not in exam_ids

    def test_available_exams_not_enrolled(self, api_client, student_user, student_info, exam, test_paper, test_paper_question):
        """등록되지 않은 시험은 목록에 노출되지 않음"""
        api_client.force_authenticate(user=student_user)

        # 시험지만 연결하고 학생 등록은 하지 않음
        ExamPaperInfo.objects.create(exam=exam, paper=test_paper)

        url = "/api/v1/exams/available/"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        exam_ids = [e['id'] for e in response.data['results']]
        assert exam.id not in exam_ids


@pytest.mark.django_db
class TestSaveAnswer:
    """save_answer action 테스트"""

    def test_save_answer_success(self, api_client, student_user, student_info, exam_setup, test_paper, question):
        """단일 답안 저장 성공"""
        api_client.force_authenticate(user=student_user)

        # 시험 시작 상태 생성
        TestScores.objects.create(
            exam=exam_setup,
            user=student_info,
            test_paper=test_paper,
            start_time=timezone.now(),
            is_submitted=False,
            test_score=0,
            detail_records={}
        )

        url = f"/api/v1/exams/{exam_setup.id}/save-answer/"
        data = {
            "question_id": question.id,
            "answer": "2",
            "selected_options": [2]
        }
        response = api_client.post(url, data, format='json')

        assert response.status_code == status.HTTP_200_OK

        # DB 검증
        score = TestScores.objects.get(exam=exam_setup, user=student_info)
        assert str(question.id) in score.detail_records
        assert score.detail_records[str(question.id)]['answer'] == "2"

    def test_save_answer_update_existing(self, api_client, student_user, student_info, exam_setup, test_paper, question):
        """기존 답안 업데이트"""
        api_client.force_authenticate(user=student_user)

        TestScores.objects.create(
            exam=exam_setup,
            user=student_info,
            test_paper=test_paper,
            start_time=timezone.now(),
            is_submitted=False,
            test_score=0,
            detail_records={str(question.id): {'answer': '1'}}
        )

        url = f"/api/v1/exams/{exam_setup.id}/save-answer/"
        data = {"question_id": question.id, "answer": "2"}
        response = api_client.post(url, data, format='json')

        assert response.status_code == status.HTTP_200_OK

        # 업데이트 확인
        score = TestScores.objects.get(exam=exam_setup, user=student_info)
        assert score.detail_records[str(question.id)]['answer'] == "2"

    def test_save_answer_not_started(self, api_client, student_user, student_info, exam_setup, question):
        """시험을 시작하지 않은 상태에서 답안 저장 시도"""
        api_client.force_authenticate(user=student_user)

        url = f"/api/v1/exams/{exam_setup.id}/save-answer/"
        data = {"question_id": question.id, "answer": "2"}
        response = api_client.post(url, data, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert '시험을 시작하지 않았습니다' in response.data['detail']

    def test_save_answer_already_submitted(self, api_client, student_user, student_info, exam_setup, test_paper, question):
        """이미 제출된 시험에 답안 저장 시도"""
        api_client.force_authenticate(user=student_user)

        TestScores.objects.create(
            exam=exam_setup,
            user=student_info,
            test_paper=test_paper,
            start_time=timezone.now(),
            is_submitted=True,
            test_score=100
        )

        url = f"/api/v1/exams/{exam_setup.id}/save-answer/"
        data = {"question_id": question.id, "answer": "2"}
        response = api_client.post(url, data, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert '이미 제출한 시험입니다' in response.data['detail']

    def test_save_answer_exam_not_found(self, api_client, student_user, student_info):
        """존재하지 않는 시험 ID"""
        api_client.force_authenticate(user=student_user)
        url = "/api/v1/exams/99999/save-answer/"
        data = {"question_id": 1, "answer": "1"}
        response = api_client.post(url, data, format='json')
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_save_answer_no_student_info(self, api_client, teacher_user, exam_setup, question):
        """학생 정보가 없는 사용자"""
        api_client.force_authenticate(user=teacher_user)
        url = f"/api/v1/exams/{exam_setup.id}/save-answer/"
        data = {"question_id": question.id, "answer": "2"}
        response = api_client.post(url, data, format='json')
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestMySubmissions:
    """my_submissions action 테스트"""

    def test_my_submissions_success(self, api_client, student_user, student_info, exam_setup, test_paper, question):
        """제출 내역 조회 성공"""
        api_client.force_authenticate(user=student_user)

        TestScores.objects.create(
            exam=exam_setup,
            user=student_info,
            test_paper=test_paper,
            start_time=timezone.now(),
            is_submitted=True,
            test_score=80,
            submit_time=timezone.now(),
            detail_records={
                str(question.id): {
                    "answer": "2",
                    "is_correct": True,
                    "score": 10,
                    "max_score": 10
                }
            }
        )

        url = "/api/v1/exams/my/"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1
        assert response.data[0]['score'] == 80

    def test_my_submissions_empty(self, api_client, student_user, student_info):
        """제출 내역이 없는 경우"""
        api_client.force_authenticate(user=student_user)

        url = "/api/v1/exams/my/"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 0

    def test_my_submissions_excludes_not_submitted(self, api_client, student_user, student_info, exam_setup, test_paper):
        """제출되지 않은 시험은 목록에서 제외"""
        api_client.force_authenticate(user=student_user)

        TestScores.objects.create(
            exam=exam_setup,
            user=student_info,
            test_paper=test_paper,
            start_time=timezone.now(),
            is_submitted=False,
            test_score=0
        )

        url = "/api/v1/exams/my/"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 0

    def test_my_submissions_deleted_question(self, api_client, student_user, student_info, exam_setup, test_paper):
        """삭제된 문제가 포함된 경우에도 에러 없이 조회"""
        api_client.force_authenticate(user=student_user)

        TestScores.objects.create(
            exam=exam_setup,
            user=student_info,
            test_paper=test_paper,
            start_time=timezone.now(),
            is_submitted=True,
            test_score=0,
            submit_time=timezone.now(),
            detail_records={
                "99999": {"answer": "2", "is_correct": True, "score": 10}
            }
        )

        url = "/api/v1/exams/my/"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        # 삭제된 문제는 answers에서 제외됨
        assert len(response.data[0]['answers']) == 0

    def test_my_submissions_no_student_info(self, api_client, teacher_user):
        """학생 정보가 없는 경우"""
        api_client.force_authenticate(user=teacher_user)
        url = "/api/v1/exams/my/"
        response = api_client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestExamResult:
    """result action 테스트"""

    def test_result_success_passed(self, api_client, student_user, student_info, exam_setup, test_paper, question):
        """시험 결과 조회 성공 - 합격"""
        api_client.force_authenticate(user=student_user)

        TestScores.objects.create(
            exam=exam_setup,
            user=student_info,
            test_paper=test_paper,
            start_time=timezone.now(),
            is_submitted=True,
            test_score=100,
            submit_time=timezone.now(),
            detail_records={
                str(question.id): {
                    "answer": "2",
                    "is_correct": True,
                    "score": 10,
                    "max_score": 10
                }
            }
        )

        url = f"/api/v1/exams/{exam_setup.id}/result/"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['submission']['score'] == 100
        assert response.data['pass'] is True
        assert response.data['accuracy'] == 100.0

    def test_result_success_failed(self, api_client, student_user, student_info, exam_setup, test_paper, question):
        """시험 결과 조회 성공 - 불합격"""
        api_client.force_authenticate(user=student_user)

        TestScores.objects.create(
            exam=exam_setup,
            user=student_info,
            test_paper=test_paper,
            start_time=timezone.now(),
            is_submitted=True,
            test_score=50,  # 60점 미만
            submit_time=timezone.now(),
            detail_records={
                str(question.id): {
                    "answer": "1",
                    "is_correct": False,
                    "score": 0,
                    "max_score": 10
                }
            }
        )

        url = f"/api/v1/exams/{exam_setup.id}/result/"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['pass'] is False
        assert response.data['accuracy'] == 0.0

    def test_result_not_submitted(self, api_client, student_user, student_info, exam_setup, test_paper):
        """제출되지 않은 시험 결과 조회"""
        api_client.force_authenticate(user=student_user)

        TestScores.objects.create(
            exam=exam_setup,
            user=student_info,
            test_paper=test_paper,
            start_time=timezone.now(),
            is_submitted=False,
            test_score=0
        )

        url = f"/api/v1/exams/{exam_setup.id}/result/"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert '제출된 시험이 없습니다' in response.data['detail']

    def test_result_no_record(self, api_client, student_user, student_info, exam_setup):
        """응시 기록 자체가 없는 경우"""
        api_client.force_authenticate(user=student_user)

        url = f"/api/v1/exams/{exam_setup.id}/result/"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_result_exam_not_found(self, api_client, student_user, student_info):
        """존재하지 않는 시험 ID"""
        api_client.force_authenticate(user=student_user)
        url = "/api/v1/exams/99999/result/"
        response = api_client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_result_no_student_info(self, api_client, teacher_user, exam_setup):
        """학생 정보가 없는 사용자"""
        api_client.force_authenticate(user=teacher_user)
        url = f"/api/v1/exams/{exam_setup.id}/result/"
        response = api_client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_result_with_deleted_question(self, api_client, student_user, student_info, exam_setup, test_paper):
        """삭제된 문제가 포함된 결과 조회"""
        api_client.force_authenticate(user=student_user)

        TestScores.objects.create(
            exam=exam_setup,
            user=student_info,
            test_paper=test_paper,
            start_time=timezone.now(),
            is_submitted=True,
            test_score=0,
            submit_time=timezone.now(),
            detail_records={
                "99999": {"answer": "2", "is_correct": True, "score": 10}
            }
        )

        url = f"/api/v1/exams/{exam_setup.id}/result/"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        # 삭제된 문제는 answers에서 제외
        assert len(response.data['submission']['answers']) == 0
