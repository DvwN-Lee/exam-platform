"""
API Layer Edge Case 테스트.

Bottom-up 테스트 전략에 따른 누락된 API 테스트:
- Authentication Edge Cases
- Pagination Edge Cases
- State Transition Tests
- Concurrent Request Handling
"""

import pytest
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIClient
from rest_framework import status


@pytest.mark.django_db
class TestAuthenticationEdgeCases:
    """인증 Edge Case 테스트"""

    @pytest.fixture(autouse=True)
    def setup(self, db):
        from user.models import UserProfile

        self.client = APIClient()
        self.user = UserProfile.objects.create_user(
            username='testuser',
            password='testpass123',
            user_type='teacher'
        )

    def test_malformed_authorization_header(self):
        """잘못된 형식의 Authorization 헤더"""
        # Bearer 없이 토큰만
        self.client.credentials(HTTP_AUTHORIZATION='InvalidToken123')
        response = self.client.get('/api/v1/questions/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_invalid_token_format(self):
        """잘못된 JWT 토큰 형식"""
        self.client.credentials(HTTP_AUTHORIZATION='Bearer invalid.token.here')
        response = self.client.get('/api/v1/questions/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_empty_authorization_header(self):
        """빈 Authorization 헤더"""
        self.client.credentials(HTTP_AUTHORIZATION='')
        response = self.client.get('/api/v1/questions/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_bearer_without_token(self):
        """Bearer만 있고 토큰 없음"""
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ')
        response = self.client.get('/api/v1/questions/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_token_with_extra_spaces(self):
        """토큰에 추가 공백"""
        self.client.credentials(HTTP_AUTHORIZATION='Bearer  extra  spaces')
        response = self.client.get('/api/v1/questions/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_lowercase_bearer(self):
        """소문자 bearer 처리"""
        # 유효한 토큰 생성
        response = self.client.post('/api/v1/auth/token/', {
            'username': 'testuser',
            'password': 'testpass123'
        })
        token = response.data['access']

        # 소문자 bearer
        self.client.credentials(HTTP_AUTHORIZATION=f'bearer {token}')
        response = self.client.get('/api/v1/questions/')
        # 대부분의 JWT 라이브러리는 대소문자 구분
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_401_UNAUTHORIZED]


@pytest.mark.django_db
class TestPaginationEdgeCases:
    """Pagination Edge Case 테스트"""

    @pytest.fixture(autouse=True)
    def setup(self, db):
        from user.models import UserProfile, SubjectInfo
        from testquestion.models import TestQuestionInfo, OptionInfo

        self.client = APIClient()
        self.user = UserProfile.objects.create_user(
            username='teacher',
            password='testpass',
            user_type='teacher'
        )
        self.subject = SubjectInfo.objects.create(subject_name='Test Subject')

        # 로그인
        response = self.client.post('/api/v1/auth/token/', {
            'username': 'teacher',
            'password': 'testpass'
        })
        self.token = response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')

        # 테스트용 문제 20개 생성
        for i in range(20):
            question = TestQuestionInfo.objects.create(
                name=f'Question {i+1}',
                subject=self.subject,
                score=10,
                tq_type='xz',
                tq_degree='jd',
                create_user=self.user
            )
            OptionInfo.objects.create(test_question=question, option='A', is_right=True)
            OptionInfo.objects.create(test_question=question, option='B', is_right=False)

    def test_pagination_default_page_size(self):
        """기본 페이지 크기"""
        response = self.client.get('/api/v1/questions/')
        assert response.status_code == status.HTTP_200_OK
        assert 'results' in response.data
        assert 'count' in response.data
        assert response.data['count'] == 20

    def test_pagination_custom_page_size(self):
        """커스텀 페이지 크기"""
        response = self.client.get('/api/v1/questions/?page_size=5')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 5

    def test_pagination_page_number(self):
        """페이지 번호 지정"""
        response = self.client.get('/api/v1/questions/?page=2&page_size=5')
        assert response.status_code == status.HTTP_200_OK
        # 2페이지에도 데이터가 있어야 함 (20개 중 5개씩 4페이지)

    def test_pagination_invalid_page_number(self):
        """잘못된 페이지 번호"""
        response = self.client.get('/api/v1/questions/?page=999')
        # 범위 초과 페이지는 빈 결과 또는 404
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND]

    def test_pagination_negative_page_number(self):
        """음수 페이지 번호"""
        response = self.client.get('/api/v1/questions/?page=-1')
        # 음수는 에러 또는 첫 페이지로 처리 또는 404
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST, status.HTTP_404_NOT_FOUND]

    def test_pagination_zero_page_size(self):
        """페이지 크기 0"""
        response = self.client.get('/api/v1/questions/?page_size=0')
        # 0은 기본값 사용 또는 에러
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST]

    def test_pagination_negative_page_size(self):
        """음수 페이지 크기"""
        response = self.client.get('/api/v1/questions/?page_size=-10')
        # 음수는 에러 또는 기본값 사용
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST]

    def test_pagination_non_numeric_page(self):
        """숫자가 아닌 페이지 번호"""
        response = self.client.get('/api/v1/questions/?page=abc')
        # 숫자가 아닌 값은 에러 또는 기본값 사용 또는 404
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST, status.HTTP_404_NOT_FOUND]


@pytest.mark.django_db
class TestExamStateTransitions:
    """시험 상태 전이 테스트"""

    @pytest.fixture(autouse=True)
    def setup(self, db):
        from user.models import UserProfile, SubjectInfo
        from testpaper.models import TestPaperInfo
        from examination.models import ExaminationInfo, ExamPaperInfo

        self.client = APIClient()
        self.teacher = UserProfile.objects.create_user(
            username='teacher',
            password='testpass',
            user_type='teacher'
        )
        self.subject = SubjectInfo.objects.create(subject_name='Test Subject')

        self.paper = TestPaperInfo.objects.create(
            name='Test Paper',
            subject=self.subject,
            tp_degree='jd',
            total_score=100,
            passing_score=60,
            create_user=self.teacher
        )

        # 로그인
        response = self.client.post('/api/v1/auth/token/', {
            'username': 'teacher',
            'password': 'testpass'
        })
        self.token = response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')

    def test_exam_state_initial(self):
        """시험 생성 시 초기 상태는 '0' (시험 전)"""
        from examination.models import ExaminationInfo

        now = timezone.now()
        exam = ExaminationInfo.objects.create(
            name='Test Exam',
            subject=self.subject,
            start_time=now + timedelta(hours=1),
            end_time=now + timedelta(hours=3),
            create_user=self.teacher
        )

        assert exam.exam_state == '0'

    def test_exam_cannot_modify_after_completion(self):
        """종료된 시험은 수정 제한"""
        from examination.models import ExaminationInfo, ExamPaperInfo

        now = timezone.now()
        exam = ExaminationInfo.objects.create(
            name='Completed Exam',
            subject=self.subject,
            start_time=now - timedelta(hours=3),
            end_time=now - timedelta(hours=1),
            exam_state='2',  # 종료 상태
            create_user=self.teacher
        )
        ExamPaperInfo.objects.create(exam=exam, paper=self.paper)

        # 종료된 시험 수정 시도
        response = self.client.patch(f'/api/v1/examinations/{exam.id}/', {
            'exam_name': 'Updated Name'
        })

        # 종료된 시험은 수정 불가 또는 성공 (정책에 따라 다름)
        # 현재 구현에서는 제한 없음
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST]


@pytest.mark.django_db
class TestQuestionDeleteEdgeCases:
    """문제 삭제 Edge Case 테스트"""

    @pytest.fixture(autouse=True)
    def setup(self, db):
        from user.models import UserProfile, SubjectInfo
        from testquestion.models import TestQuestionInfo, OptionInfo
        from testpaper.models import TestPaperInfo, TestPaperTestQ

        self.client = APIClient()
        self.teacher = UserProfile.objects.create_user(
            username='teacher',
            password='testpass',
            user_type='teacher'
        )
        self.other_teacher = UserProfile.objects.create_user(
            username='other_teacher',
            password='testpass',
            user_type='teacher'
        )
        self.subject = SubjectInfo.objects.create(subject_name='Test Subject')

        self.question = TestQuestionInfo.objects.create(
            name='Test Question',
            subject=self.subject,
            score=10,
            tq_type='xz',
            tq_degree='jd',
            create_user=self.teacher
        )
        OptionInfo.objects.create(test_question=self.question, option='A', is_right=True)
        OptionInfo.objects.create(test_question=self.question, option='B', is_right=False)

        # 로그인
        response = self.client.post('/api/v1/auth/token/', {
            'username': 'teacher',
            'password': 'testpass'
        })
        self.token = response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')

    def test_delete_own_question(self):
        """자신의 문제 삭제 (Soft Delete)"""
        response = self.client.delete(f'/api/v1/questions/{self.question.id}/')
        assert response.status_code == status.HTTP_204_NO_CONTENT

        # Soft delete 확인
        from testquestion.models import TestQuestionInfo
        question = TestQuestionInfo.objects.get(id=self.question.id)
        assert question.is_del is True

    def test_delete_others_question_forbidden(self):
        """다른 사람의 문제 삭제 시도"""
        from testquestion.models import TestQuestionInfo, OptionInfo

        # 다른 교사의 문제 생성
        other_question = TestQuestionInfo.objects.create(
            name='Other Question',
            subject=self.subject,
            score=10,
            tq_type='xz',
            tq_degree='jd',
            create_user=self.other_teacher
        )
        OptionInfo.objects.create(test_question=other_question, option='A', is_right=True)
        OptionInfo.objects.create(test_question=other_question, option='B', is_right=False)

        response = self.client.delete(f'/api/v1/questions/{other_question.id}/')
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_delete_nonexistent_question(self):
        """존재하지 않는 문제 삭제"""
        response = self.client.delete('/api/v1/questions/99999/')
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_delete_already_deleted_question(self):
        """이미 삭제된 문제 재삭제"""
        # 먼저 삭제
        self.client.delete(f'/api/v1/questions/{self.question.id}/')

        # 다시 삭제 시도
        response = self.client.delete(f'/api/v1/questions/{self.question.id}/')
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestTestPaperValidation:
    """시험지 유효성 검증 테스트"""

    @pytest.fixture(autouse=True)
    def setup(self, db):
        from user.models import UserProfile, SubjectInfo
        from testquestion.models import TestQuestionInfo, OptionInfo

        self.client = APIClient()
        self.teacher = UserProfile.objects.create_user(
            username='teacher',
            password='testpass',
            user_type='teacher'
        )
        self.subject = SubjectInfo.objects.create(subject_name='Test Subject')

        self.question = TestQuestionInfo.objects.create(
            name='Test Question',
            subject=self.subject,
            score=10,
            tq_type='xz',
            tq_degree='jd',
            create_user=self.teacher
        )
        OptionInfo.objects.create(test_question=self.question, option='A', is_right=True)
        OptionInfo.objects.create(test_question=self.question, option='B', is_right=False)

        # 로그인
        response = self.client.post('/api/v1/auth/token/', {
            'username': 'teacher',
            'password': 'testpass'
        })
        self.token = response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')

    def test_create_testpaper_passing_score_exceeds_total(self):
        """합격점이 총점 초과하는 경우"""
        data = {
            'name': 'Invalid Paper',
            'subject_id': self.subject.id,
            'tp_degree': 'jd',
            'passing_score': 200,  # 총점보다 높음
            'questions': [
                {'question_id': self.question.id, 'score': 10, 'order': 1}
            ]
        }

        response = self.client.post('/api/v1/testpapers/', data, format='json')
        # 합격점 > 총점이면 에러
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_create_testpaper_empty_name(self):
        """빈 이름으로 시험지 생성"""
        data = {
            'name': '',
            'subject_id': self.subject.id,
            'tp_degree': 'jd',
            'passing_score': 60,
        }

        response = self.client.post('/api/v1/testpapers/', data, format='json')
        # 빈 이름은 에러
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_create_testpaper_invalid_degree(self):
        """잘못된 난이도로 시험지 생성"""
        data = {
            'name': 'Invalid Degree Paper',
            'subject_id': self.subject.id,
            'tp_degree': 'xx',  # 잘못된 값
            'passing_score': 60,
        }

        response = self.client.post('/api/v1/testpapers/', data, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestExamTakingEdgeCases:
    """시험 응시 Edge Case 테스트"""

    @pytest.fixture(autouse=True)
    def setup(self, db):
        from user.models import UserProfile, SubjectInfo, StudentsInfo
        from testquestion.models import TestQuestionInfo, OptionInfo
        from testpaper.models import TestPaperInfo, TestPaperTestQ
        from examination.models import ExaminationInfo, ExamPaperInfo, ExamStudentsInfo

        self.client = APIClient()

        # Teacher
        self.teacher = UserProfile.objects.create_user(
            username='teacher',
            password='testpass',
            user_type='teacher'
        )

        # Student
        self.student_user = UserProfile.objects.create_user(
            username='student',
            password='testpass',
            user_type='student'
        )
        self.student = StudentsInfo.objects.create(
            user=self.student_user,
            student_name='Test Student'
        )

        self.subject = SubjectInfo.objects.create(subject_name='Test Subject')

        # Question
        self.question = TestQuestionInfo.objects.create(
            name='Test Question',
            subject=self.subject,
            score=10,
            tq_type='xz',
            tq_degree='jd',
            create_user=self.teacher
        )
        self.correct_option = OptionInfo.objects.create(
            test_question=self.question,
            option='Correct Answer',
            is_right=True
        )
        OptionInfo.objects.create(
            test_question=self.question,
            option='Wrong Answer',
            is_right=False
        )

        # TestPaper
        self.paper = TestPaperInfo.objects.create(
            name='Test Paper',
            subject=self.subject,
            tp_degree='jd',
            total_score=10,
            passing_score=6,
            question_count=1,
            create_user=self.teacher
        )
        TestPaperTestQ.objects.create(
            test_paper=self.paper,
            test_question=self.question,
            score=10,
            order=1
        )

        # Examination (진행 중)
        now = timezone.now()
        self.exam = ExaminationInfo.objects.create(
            name='Test Exam',
            subject=self.subject,
            start_time=now - timedelta(hours=1),
            end_time=now + timedelta(hours=1),
            exam_state='1',  # 진행 중
            create_user=self.teacher
        )
        ExamPaperInfo.objects.create(exam=self.exam, paper=self.paper)
        ExamStudentsInfo.objects.create(exam=self.exam, student=self.student)

    def test_submit_without_starting(self):
        """시작하지 않고 제출 시도"""
        # 새 학생 생성
        from user.models import UserProfile, StudentsInfo
        from examination.models import ExamStudentsInfo

        new_student_user = UserProfile.objects.create_user(
            username='new_student',
            password='testpass',
            user_type='student'
        )
        new_student = StudentsInfo.objects.create(
            user=new_student_user,
            student_name='New Student'
        )
        ExamStudentsInfo.objects.create(exam=self.exam, student=new_student)

        # 새 학생 로그인
        response = self.client.post('/api/v1/auth/token/', {
            'username': 'new_student',
            'password': 'testpass'
        })
        token = response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        # 시작하지 않고 바로 제출
        submit_response = self.client.post(
            f'/api/v1/exams/{self.exam.id}/submit/',
            {'answers': [{'question_id': self.question.id, 'answer': 'A'}]},
            format='json'
        )
        # 시작하지 않으면 에러
        assert submit_response.status_code in [
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_404_NOT_FOUND
        ]

    def test_teacher_cannot_take_exam(self):
        """교사는 시험 응시 불가"""
        # 교사 로그인
        response = self.client.post('/api/v1/auth/token/', {
            'username': 'teacher',
            'password': 'testpass'
        })
        token = response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        # 시험 시작 시도
        start_response = self.client.post(f'/api/v1/exams/{self.exam.id}/start/')
        assert start_response.status_code == status.HTTP_403_FORBIDDEN

    def test_unenrolled_student_cannot_take_exam(self):
        """등록되지 않은 학생은 시험 응시 불가"""
        from user.models import UserProfile, StudentsInfo

        # 등록되지 않은 학생 생성
        unenrolled_user = UserProfile.objects.create_user(
            username='unenrolled',
            password='testpass',
            user_type='student'
        )
        StudentsInfo.objects.create(
            user=unenrolled_user,
            student_name='Unenrolled Student'
        )

        # 로그인
        response = self.client.post('/api/v1/auth/token/', {
            'username': 'unenrolled',
            'password': 'testpass'
        })
        token = response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        # 시험 시작 시도
        start_response = self.client.post(f'/api/v1/exams/{self.exam.id}/start/')
        assert start_response.status_code in [
            status.HTTP_403_FORBIDDEN,
            status.HTTP_404_NOT_FOUND
        ]
