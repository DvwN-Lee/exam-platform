"""
User API views.
"""

from django.conf import settings
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from core.api.permissions import IsTeacher
from user.api.serializers import (
    CustomTokenObtainPairSerializer,
    PasswordChangeSerializer,
    StudentDashboardSerializer,
    SubjectSerializer,
    TeacherDashboardSerializer,
    UserProfileSerializer,
    UserProfileUpdateSerializer,
    UserRegistrationSerializer,
)
from user.models import SubjectInfo, UserProfile, StudentsInfo
from examination.models import ExaminationInfo, ExamPaperInfo, ExamStudentsInfo
from testpaper.models import TestPaperInfo, TestScores
from testquestion.models import TestQuestionInfo, OptionInfo
from django.utils import timezone
from django.db.models import Count, Q, Avg


@extend_schema(tags=['auth'])
class CustomTokenObtainPairView(TokenObtainPairView):
    """
    JWT Token 발급 endpoint.

    username과 password로 access token과 refresh token을 발급받습니다.

    보안 강화:
    - Refresh token은 HttpOnly Cookie로 전송 (XSS 방지)
    - Access token은 응답 body에 포함 (기존 방식 유지)
    """
    serializer_class = CustomTokenObtainPairSerializer

    def finalize_response(self, request, response, *args, **kwargs):
        """
        Refresh token을 HttpOnly Cookie로 설정
        """
        if response.status_code == 200 and 'refresh' in response.data:
            # Refresh token을 HttpOnly Cookie로 설정
            refresh_token = response.data.pop('refresh')
            response.set_cookie(
                key='refresh_token',
                value=refresh_token,
                httponly=True,  # JavaScript 접근 차단 (XSS 방지)
                secure=not settings.DEBUG,  # Production: True, Development: False
                samesite='Lax', # CSRF 방어
                max_age=60 * 60 * 24 * 7,  # 7일
            )
        return super().finalize_response(request, response, *args, **kwargs)


@extend_schema(tags=['auth'])
class CustomTokenRefreshView(TokenRefreshView):
    """
    JWT Token 갱신 endpoint.

    HttpOnly Cookie에서 refresh token을 읽어 새로운 access token을 발급합니다.
    하위 호환성: request body에 refresh token이 있으면 우선 사용
    """

    def post(self, request, *args, **kwargs):
        """
        Cookie 또는 request body에서 refresh token 읽기
        """
        # Cookie에서 refresh token 읽기 (우선순위: body > cookie)
        if 'refresh' not in request.data and 'refresh_token' in request.COOKIES:
            # MutableQueryDict 생성하여 Cookie의 refresh token 추가
            data = request.data.copy()
            data['refresh'] = request.COOKIES['refresh_token']
            request._full_data = data

        response = super().post(request, *args, **kwargs)

        # 새로운 refresh token이 있으면 Cookie 업데이트
        if response.status_code == 200 and 'refresh' in response.data:
            refresh_token = response.data.pop('refresh')
            response.set_cookie(
                key='refresh_token',
                value=refresh_token,
                httponly=True,
                secure=not settings.DEBUG,
                samesite='Lax',
                max_age=60 * 60 * 24 * 7,
            )

        return response


@extend_schema(tags=['auth'])
class UserRegistrationView(generics.CreateAPIView):
    """
    회원가입 endpoint.

    user_type에 따라 학생 또는 교사로 회원가입합니다.
    """
    queryset = UserProfile.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [AllowAny]

    @extend_schema(
        summary='회원가입',
        description='학생 또는 교사로 회원가입합니다. user_type에 따라 추가 정보를 입력해야 합니다.',
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


@extend_schema_view(
    retrieve=extend_schema(tags=['users'], summary='내 정보 조회'),
    update=extend_schema(tags=['users'], summary='내 정보 수정'),
    partial_update=extend_schema(tags=['users'], summary='내 정보 부분 수정'),
)
class UserProfileView(generics.RetrieveUpdateAPIView):
    """
    사용자 프로필 조회/수정 endpoint.

    현재 로그인한 사용자의 정보를 조회하거나 수정합니다.
    """
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return UserProfileUpdateSerializer
        return UserProfileSerializer

    def get_object(self):
        return self.request.user


@extend_schema(tags=['users'])
class PasswordChangeView(generics.UpdateAPIView):
    """
    비밀번호 변경 endpoint.
    """
    serializer_class = PasswordChangeSerializer
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary='비밀번호 변경',
        description='현재 비밀번호를 확인하고 새 비밀번호로 변경합니다.',
    )
    def put(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({
            'detail': '비밀번호가 성공적으로 변경되었습니다.'
        }, status=status.HTTP_200_OK)


@extend_schema_view(
    list=extend_schema(tags=['subjects'], summary='과목 목록 조회'),
    create=extend_schema(tags=['subjects'], summary='과목 생성'),
    retrieve=extend_schema(tags=['subjects'], summary='과목 상세 조회'),
    update=extend_schema(tags=['subjects'], summary='과목 수정'),
    partial_update=extend_schema(tags=['subjects'], summary='과목 부분 수정'),
    destroy=extend_schema(tags=['subjects'], summary='과목 삭제'),
)
class SubjectViewSet(viewsets.ModelViewSet):
    """
    과목 관리 API.

    교사만 과목을 생성/수정/삭제할 수 있습니다.
    """
    queryset = SubjectInfo.objects.all().order_by('-create_time')
    serializer_class = SubjectSerializer

    def get_permissions(self):
        """
        목록 조회는 누구나 가능(회원가입 시 필요), 상세 조회는 인증 필요, 생성/수정/삭제는 교사만 가능
        """
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsTeacher()]
        elif self.action == 'list':
            return [AllowAny()]
        return [IsAuthenticated()]


@extend_schema(tags=['dashboard'])
class StudentDashboardView(generics.RetrieveAPIView):
    """
    학생 대시보드 데이터 조회 endpoint.

    학생의 통계, 성적 추이, 예정된 시험, 학습 진행률을 조회합니다.
    """
    serializer_class = StudentDashboardSerializer
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary='학생 대시보드 조회',
        description='현재 로그인한 학생의 대시보드 데이터를 조회합니다.',
    )
    def get(self, request, *args, **kwargs):
        # 현재 로그인한 사용자의 Student profile 조회
        try:
            student_info = StudentsInfo.objects.get(user=request.user)
        except StudentsInfo.DoesNotExist:
            return Response(
                {'error': 'Student profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        now = timezone.now()

        # 학생에게 할당된 시험 ID 조회
        enrolled_exam_ids = ExamStudentsInfo.objects.filter(
            student=student_info
        ).values_list('exam_id', flat=True)

        # Upcoming exams 조회 (학생에게 할당된 시험 중 미래에 시작하는 것)
        upcoming_exams_qs = ExaminationInfo.objects.filter(
            id__in=enrolled_exam_ids,
            start_time__gte=now
        ).select_related('create_user', 'subject').order_by('start_time')

        # Upcoming exams 데이터 직렬화
        upcoming_exams = []
        for exam in upcoming_exams_qs[:10]:  # 최대 10개
            # 첫 번째 연결된 시험지 조회
            exam_paper = ExamPaperInfo.objects.filter(exam=exam).select_related(
                'paper', 'paper__subject', 'paper__create_user'
            ).first()

            if exam_paper and exam_paper.paper:
                paper = exam_paper.paper
                upcoming_exams.append({
                    'id': exam.id,
                    'exam_name': exam.name,
                    'testpaper': {
                        'id': paper.id,
                        'name': paper.name,
                        'subject': {
                            'id': paper.subject.id,
                            'subject_name': paper.subject.subject_name,
                        } if paper.subject else None,
                        'question_count': paper.question_count,
                        'creat_user': {
                            'id': paper.create_user.id,
                            'nick_name': paper.create_user.nick_name,
                        } if paper.create_user else None,
                        'questions': [],
                        'created_at': paper.create_time.isoformat() if paper.create_time else None,
                        'updated_at': paper.edit_time.isoformat() if paper.edit_time else None,
                    },
                    'start_time': exam.start_time.isoformat(),
                    'end_time': exam.end_time.isoformat() if exam.end_time else None,
                    'is_public': True,  # 학생에게 할당된 시험이므로 공개
                    'creat_user': {
                        'id': exam.create_user.id,
                        'nick_name': exam.create_user.nick_name,
                    } if exam.create_user else None,
                    'created_at': exam.create_time.isoformat() if exam.create_time else None,
                    'updated_at': exam.create_time.isoformat() if exam.create_time else None,  # ExaminationInfo has no update_time field
                })

        # 실제 통계 데이터 계산
        # 제출된 시험 기록 조회
        submissions = TestScores.objects.filter(
            user=student_info,
            is_submitted=True
        ).select_related('exam', 'exam__subject', 'test_paper')

        total_exams_taken = submissions.count()

        # 평균 점수 및 합격률 계산
        if total_exams_taken > 0:
            avg_result = submissions.aggregate(avg=Avg('test_score'))
            average_score = round(avg_result['avg'] or 0, 1)

            # 합격률 계산
            passed_count = 0
            total_correct = 0
            total_questions = 0

            for sub in submissions:
                if sub.test_paper and sub.test_score >= sub.test_paper.passing_score:
                    passed_count += 1
                # 정답 수 계산
                if sub.detail_records:
                    for q_id, record in sub.detail_records.items():
                        if isinstance(record, dict):
                            total_questions += 1
                            if record.get('is_correct', False):
                                total_correct += 1

            pass_rate = round((passed_count / total_exams_taken) * 100, 1)
        else:
            average_score = 0.0
            pass_rate = 0.0
            total_correct = 0
            total_questions = 0

        # 성적 추이 (최근 5개 시험)
        score_trend = []
        recent_scores = submissions.order_by('-submit_time')[:5]
        for sub in recent_scores:
            if sub.exam and sub.test_paper:
                percentage = round((sub.test_score / sub.test_paper.total_score) * 100) if sub.test_paper.total_score > 0 else 0
                score_trend.append({
                    'exam_name': sub.exam.name,
                    'score': sub.test_score,
                    'percentage': percentage,
                    'date': sub.submit_time.strftime('%Y-%m-%d') if sub.submit_time else None,
                })

        # 최근 제출 내역 (최근 5개)
        recent_submissions = []
        for sub in recent_scores[:5]:
            if sub.exam:
                exam = sub.exam
                exam_paper = ExamPaperInfo.objects.filter(exam=exam).select_related(
                    'paper', 'paper__subject', 'paper__create_user'
                ).first()

                testpaper_data = None
                if exam_paper and exam_paper.paper:
                    paper = exam_paper.paper
                    testpaper_data = {
                        'id': paper.id,
                        'name': paper.name,
                        'subject': {
                            'id': paper.subject.id,
                            'subject_name': paper.subject.subject_name,
                        } if paper.subject else None,
                        'question_count': paper.question_count,
                        'creat_user': {
                            'id': paper.create_user.id,
                            'nick_name': paper.create_user.nick_name,
                        } if paper.create_user else None,
                        'questions': [],
                        'created_at': paper.create_time.isoformat() if paper.create_time else None,
                        'updated_at': paper.edit_time.isoformat() if paper.edit_time else None,
                    }

                recent_submissions.append({
                    'id': sub.id,
                    'examination': {
                        'id': exam.id,
                        'exam_name': exam.name,
                        'testpaper': testpaper_data,
                        'start_time': exam.start_time.isoformat() if exam.start_time else None,
                        'end_time': exam.end_time.isoformat() if exam.end_time else None,
                        'is_public': exam.exam_state != '0',
                        'creat_user': {
                            'id': exam.create_user.id,
                            'nick_name': exam.create_user.nick_name,
                        } if exam.create_user else None,
                        'created_at': exam.create_time.isoformat() if exam.create_time else None,
                        'updated_at': exam.create_time.isoformat() if exam.create_time else None,
                    },
                    'student': {
                        'id': student_info.id,
                        'nick_name': request.user.nick_name,
                    },
                    'answers': [],
                    'score': sub.test_score,
                    'total_score': sub.test_paper.total_score if sub.test_paper else 0,
                    'submitted_at': sub.submit_time.isoformat() if sub.submit_time else None,
                    'created_at': sub.create_time.isoformat() if sub.create_time else None,
                })

        # 과목별 진행률 (제출한 시험 기반)
        progress = []
        subject_stats = submissions.values('exam__subject__subject_name').annotate(
            completed=Count('id')
        )
        for stat in subject_stats:
            if stat['exam__subject__subject_name']:
                # 해당 과목의 전체 시험 수 계산
                total_in_subject = ExamStudentsInfo.objects.filter(
                    student=student_info,
                    exam__subject__subject_name=stat['exam__subject__subject_name']
                ).count()
                if total_in_subject > 0:
                    pct = round((stat['completed'] / total_in_subject) * 100)
                    progress.append({
                        'subject': stat['exam__subject__subject_name'],
                        'progress_percentage': pct,
                        'completed_lectures': stat['completed'],
                        'total_lectures': total_in_subject,
                    })

        data = {
            'statistics': {
                'total_exams_taken': total_exams_taken,
                'average_score': average_score,
                'pass_rate': pass_rate,
                'correct_answers': total_correct,
                'total_questions_answered': total_questions,
                'upcoming_exams_count': len(upcoming_exams),
            },
            'score_trend': score_trend,
            'upcoming_exams': upcoming_exams,
            'progress': progress,
            'recent_submissions': recent_submissions,
            'wrong_questions': [],
        }

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data)


@extend_schema(tags=['dashboard'])
class TeacherDashboardView(generics.RetrieveAPIView):
    """
    교사 대시보드 데이터 조회 endpoint.

    교사의 통계, 최근 시험, 문제 분포, 점수 분포를 조회합니다.
    """
    serializer_class = TeacherDashboardSerializer
    permission_classes = [IsAuthenticated, IsTeacher]

    @extend_schema(
        summary='교사 대시보드 조회',
        description='현재 로그인한 교사의 대시보드 데이터를 조회합니다.',
    )
    def get(self, request, *args, **kwargs):
        user = request.user
        now = timezone.now()

        # 1. 최근 문제 조회 (최근 5개)
        recent_questions_qs = TestQuestionInfo.objects.filter(
            create_user=user,
            is_del=False
        ).select_related('subject', 'create_user').prefetch_related('optioninfo_set').order_by('-create_time')[:5]

        recent_questions = []
        for q in recent_questions_qs:
            options = [
                {'id': opt.id, 'option': opt.option, 'is_right': opt.is_right}
                for opt in q.optioninfo_set.all()
            ]
            recent_questions.append({
                'id': q.id,
                'name': q.name,
                'subject': {
                    'id': q.subject.id,
                    'subject_name': q.subject.subject_name,
                } if q.subject else None,
                'score': q.score,
                'tq_type': q.tq_type,
                'tq_degree': q.tq_degree,
                'is_share': q.is_share,
                'is_del': q.is_del,
                'creat_user': {
                    'id': q.create_user.id,
                    'nick_name': q.create_user.nick_name,
                } if q.create_user else None,
                'options': options,
                'created_at': q.create_time.isoformat() if q.create_time else None,
                'updated_at': q.edit_time.isoformat() if q.edit_time else None,
            })

        # 2. 최근 시험지 조회 (최근 5개)
        recent_testpapers_qs = TestPaperInfo.objects.filter(
            create_user=user
        ).select_related('subject', 'create_user').order_by('-create_time')[:5]

        recent_testpapers = []
        for tp in recent_testpapers_qs:
            recent_testpapers.append({
                'id': tp.id,
                'name': tp.name,
                'subject': {
                    'id': tp.subject.id,
                    'subject_name': tp.subject.subject_name,
                } if tp.subject else None,
                'question_count': tp.question_count,
                'creat_user': {
                    'id': tp.create_user.id,
                    'nick_name': tp.create_user.nick_name,
                } if tp.create_user else None,
                'questions': [],
                'created_at': tp.create_time.isoformat() if tp.create_time else None,
                'updated_at': tp.edit_time.isoformat() if tp.edit_time else None,
            })

        # 3. 진행 중/예정된 시험 조회 (최근 5개)
        ongoing_exams_qs = ExaminationInfo.objects.filter(
            create_user=user,
            end_time__gte=now  # 종료되지 않은 시험
        ).select_related('subject', 'create_user').order_by('start_time')[:5]

        ongoing_exams = []
        for exam in ongoing_exams_qs:
            exam_paper = ExamPaperInfo.objects.filter(exam=exam).select_related(
                'paper', 'paper__subject', 'paper__create_user'
            ).first()

            testpaper_data = None
            if exam_paper and exam_paper.paper:
                paper = exam_paper.paper
                testpaper_data = {
                    'id': paper.id,
                    'name': paper.name,
                    'subject': {
                        'id': paper.subject.id,
                        'subject_name': paper.subject.subject_name,
                    } if paper.subject else None,
                    'question_count': paper.question_count,
                    'creat_user': {
                        'id': paper.create_user.id,
                        'nick_name': paper.create_user.nick_name,
                    } if paper.create_user else None,
                    'questions': [],
                    'created_at': paper.create_time.isoformat() if paper.create_time else None,
                    'updated_at': paper.edit_time.isoformat() if paper.edit_time else None,
                }

            ongoing_exams.append({
                'id': exam.id,
                'exam_name': exam.name,
                'testpaper': testpaper_data,
                'start_time': exam.start_time.isoformat() if exam.start_time else None,
                'end_time': exam.end_time.isoformat() if exam.end_time else None,
                'is_public': exam.exam_state != '0',
                'creat_user': {
                    'id': exam.create_user.id,
                    'nick_name': exam.create_user.nick_name,
                } if exam.create_user else None,
                'created_at': exam.create_time.isoformat() if exam.create_time else None,
                'updated_at': exam.create_time.isoformat() if exam.create_time else None,
            })

        # 4. 문제 통계
        user_questions = TestQuestionInfo.objects.filter(create_user=user, is_del=False)
        total_questions = user_questions.count()
        shared_questions = user_questions.filter(is_share=True).count()

        # 유형별 집계
        type_counts = user_questions.values('tq_type').annotate(count=Count('id'))
        questions_by_type = {item['tq_type']: item['count'] for item in type_counts}

        # 난이도별 집계
        degree_counts = user_questions.values('tq_degree').annotate(count=Count('id'))
        questions_by_difficulty = {item['tq_degree']: item['count'] for item in degree_counts}

        # 5. 학생 통계 (교사가 만든 시험에 대한 통계)
        teacher_exams = ExaminationInfo.objects.filter(create_user=user)
        teacher_exam_ids = teacher_exams.values_list('id', flat=True)

        # 등록된 학생 수 (중복 제거)
        total_students = ExamStudentsInfo.objects.filter(
            exam_id__in=teacher_exam_ids
        ).values('student').distinct().count()

        # 제출된 답안 수
        submissions = TestScores.objects.filter(
            exam_id__in=teacher_exam_ids,
            is_submitted=True
        )
        total_submissions = submissions.count()

        # 평균 점수 계산
        avg_score_result = submissions.aggregate(avg=Avg('test_score'))
        average_score = round(avg_score_result['avg'] or 0, 1)

        # 합격률 계산 (합격점 기준)
        if total_submissions > 0:
            # 각 시험의 합격점을 기준으로 합격률 계산
            passed_count = 0
            for submission in submissions.select_related('test_paper'):
                if submission.test_paper and submission.test_score >= submission.test_paper.passing_score:
                    passed_count += 1
            pass_rate = round((passed_count / total_submissions) * 100, 1)
        else:
            pass_rate = 0.0

        data = {
            'recent_questions': recent_questions,
            'recent_testpapers': recent_testpapers,
            'ongoing_exams': ongoing_exams,
            'question_statistics': {
                'total_questions': total_questions,
                'shared_questions': shared_questions,
                'questions_by_type': questions_by_type,
                'questions_by_difficulty': questions_by_difficulty,
            },
            'student_statistics': {
                'total_students': total_students,
                'total_submissions': total_submissions,
                'average_score': average_score,
                'pass_rate': pass_rate,
                'recent_submissions': [],
            },
        }

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data)
