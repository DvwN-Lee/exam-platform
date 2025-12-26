"""
Exam Taking API Views.
학생의 시험 응시 관련 API.
"""
import logging
from django.db import transaction
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

logger = logging.getLogger(__name__)

from examination.models import ExaminationInfo, ExamPaperInfo, ExamStudentsInfo
from testpaper.models import TestScores, TestPaperTestQ
from testquestion.models import TestQuestionInfo, OptionInfo
from user.models import StudentsInfo

from .serializers import (
    ExamInfoSerializer,
    AnswerSubmissionSerializer,
    ExamStatusSerializer,
    SaveDraftSerializer,
    SaveAnswerSerializer,
    ExamQuestionSerializer,
    StartExamResponseSerializer,
    ExamSubmissionSerializer,
    ExamResultSerializer,
)


class ExamTakingViewSet(viewsets.ViewSet):
    """
    시험 응시 ViewSet.

    학생이 시험을 응시하고 답안을 제출하는 기능.
    """

    permission_classes = [IsAuthenticated]

    def get_student_info(self, user):
        """사용자의 학생 정보 조회"""
        try:
            return user.studentsinfo
        except StudentsInfo.DoesNotExist:
            return None

    @action(detail=False, methods=['get'], url_path='available')
    def available_exams(self, request):
        """
        응시 가능한 시험 목록 조회.
        GET /api/v1/exams/available/
        """
        student_info = self.get_student_info(request.user)
        if not student_info:
            return Response({'detail': '학생 정보를 찾을 수 없습니다.'}, status=status.HTTP_403_FORBIDDEN)

        # 학생이 등록된 시험 중 아직 제출하지 않은 시험 조회
        now = timezone.now()
        student_exams = ExamStudentsInfo.objects.filter(
            student=student_info
        ).select_related('exam').values_list('exam_id', flat=True)

        available_exams = ExaminationInfo.objects.filter(
            id__in=student_exams,
            start_time__lte=now,
            end_time__gte=now
        ).select_related('subject')

        # 시험 목록 구성
        exams_data = []
        for exam in available_exams:
            # 제출 여부 확인
            test_score = TestScores.objects.filter(exam=exam, user=student_info).first()
            is_submitted = test_score and test_score.is_submitted

            if not is_submitted:
                # 시험지 정보 조회
                exam_paper = ExamPaperInfo.objects.filter(exam=exam).select_related('paper').first()
                if exam_paper:
                    exam_data = {
                        'id': exam.id,
                        'exam_name': exam.name,
                        'testpaper': {
                            'id': exam_paper.paper.id,
                            'name': exam_paper.paper.name,
                            'subject': {
                                'id': exam.subject.id,
                                'subject_name': exam.subject.subject_name
                            },
                            'question_count': exam_paper.paper.question_count,
                            'create_user': {
                                'id': exam.create_user.id,
                                'nick_name': exam.create_user.nick_name
                            },
                            'questions': [],
                            'created_at': exam_paper.paper.create_time.isoformat(),
                            'updated_at': exam_paper.paper.edit_time.isoformat()
                        },
                        'start_time': exam.start_time.isoformat(),
                        'end_time': exam.end_time.isoformat(),
                        'create_user': {
                            'id': exam.create_user.id,
                            'nick_name': exam.create_user.nick_name
                        },
                        'created_at': exam.create_time.isoformat(),
                        'updated_at': exam.create_time.isoformat()
                    }
                    exams_data.append(exam_data)

        return Response({
            'count': len(exams_data),
            'next': None,
            'previous': None,
            'results': exams_data
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='info')
    def exam_info(self, request, pk=None):
        """
        시험 정보 및 문제 조회.
        GET /api/v1/taking/{exam_id}/info/
        """
        student_info = self.get_student_info(request.user)
        if not student_info:
            return Response({'detail': '학생 정보를 찾을 수 없습니다.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            exam = ExaminationInfo.objects.select_related('subject').get(id=pk)
        except ExaminationInfo.DoesNotExist:
            return Response({'detail': '시험을 찾을 수 없습니다.'}, status=status.HTTP_404_NOT_FOUND)

        # 응시 자격 확인
        if not ExamStudentsInfo.objects.filter(exam=exam, student=student_info).exists():
            return Response({'detail': '이 시험에 등록되지 않았습니다.'}, status=status.HTTP_403_FORBIDDEN)

        # 시험지 조회
        exam_papers = ExamPaperInfo.objects.filter(exam=exam).select_related('paper')
        if not exam_papers.exists():
            return Response({'detail': '시험지가 없습니다.'}, status=status.HTTP_400_BAD_REQUEST)

        # 첫 번째 시험지 사용 (추후 다중 시험지 지원 가능)
        paper = exam_papers.first().paper

        # 문제 조회
        paper_questions = TestPaperTestQ.objects.filter(test_paper=paper).select_related(
            'test_question'
        ).prefetch_related('test_question__optioninfo_set').order_by('order')

        questions = [pq.test_question for pq in paper_questions]

        # 응시 상태 확인
        test_score = TestScores.objects.filter(exam=exam, user=student_info).first()
        is_started = test_score is not None and test_score.start_time is not None
        is_submitted = test_score is not None and test_score.is_submitted

        # 시험 정보 구성
        duration = int((exam.end_time - exam.start_time).total_seconds() / 60)

        data = {
            'exam_id': exam.id,
            'exam_name': exam.name,
            'subject_name': exam.subject.subject_name,
            'start_time': exam.start_time,
            'end_time': exam.end_time,
            'duration': duration,
            'total_score': paper.total_score,
            'passing_score': paper.passing_score,
            'question_count': paper.question_count,
            'questions': ExamQuestionSerializer(
                questions, many=True, context={'paper_id': paper.id}
            ).data,
            'is_started': is_started,
            'is_submitted': is_submitted,
        }

        return Response(data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        """
        시험 시작.
        POST /api/v1/taking/{exam_id}/start/
        """
        student_info = self.get_student_info(request.user)
        if not student_info:
            return Response({'detail': '학생 정보를 찾을 수 없습니다.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            exam = ExaminationInfo.objects.get(id=pk)
        except ExaminationInfo.DoesNotExist:
            return Response({'detail': '시험을 찾을 수 없습니다.'}, status=status.HTTP_404_NOT_FOUND)

        # 응시 자격 확인
        if not ExamStudentsInfo.objects.filter(exam=exam, student=student_info).exists():
            return Response({'detail': '이 시험에 등록되지 않았습니다.'}, status=status.HTTP_403_FORBIDDEN)

        # 시험 시간 확인
        now = timezone.now()
        if now < exam.start_time:
            return Response({'detail': '아직 시험 시작 시간이 아닙니다.'}, status=status.HTTP_400_BAD_REQUEST)

        if now > exam.end_time:
            return Response({'detail': '시험 종료 시간이 지났습니다.'}, status=status.HTTP_400_BAD_REQUEST)

        # 이미 시작한 경우
        existing_score = TestScores.objects.filter(exam=exam, user=student_info).first()
        if existing_score and existing_score.start_time:
            if existing_score.is_submitted:
                return Response({'detail': '이미 제출한 시험입니다.'}, status=status.HTTP_400_BAD_REQUEST)
            return Response(
                {
                    'detail': '이미 시작한 시험입니다.',
                    'start_time': existing_score.start_time,
                },
                status=status.HTTP_200_OK,
            )

        # 시험지 조회
        exam_paper = ExamPaperInfo.objects.filter(exam=exam).first()
        if not exam_paper:
            return Response({'detail': '시험지가 없습니다.'}, status=status.HTTP_400_BAD_REQUEST)

        # 시험 시작 기록
        with transaction.atomic():
            if existing_score:
                existing_score.start_time = now
                existing_score.save()
                test_score = existing_score
            else:
                test_score = TestScores.objects.create(
                    exam=exam,
                    user=student_info,
                    test_paper=exam_paper.paper,
                    start_time=now,
                    test_score=0,
                    detail_records={},
                )

        # Frontend 호환 응답 구조
        response_data = {
            'submission_id': test_score.id,
            'exam': exam,
            'started_at': test_score.start_time,
        }
        serializer = StartExamResponseSerializer(response_data)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """
        답안 제출 및 자동 채점.
        POST /api/v1/taking/{exam_id}/submit/
        """
        student_info = self.get_student_info(request.user)
        if not student_info:
            return Response({'detail': '학생 정보를 찾을 수 없습니다.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            exam = ExaminationInfo.objects.get(id=pk)
        except ExaminationInfo.DoesNotExist:
            return Response({'detail': '시험을 찾을 수 없습니다.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = AnswerSubmissionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        answers = serializer.validated_data['answers']

        # 시험 기록 조회
        test_score = TestScores.objects.filter(exam=exam, user=student_info).first()
        if not test_score or not test_score.start_time:
            return Response({'detail': '시험을 시작하지 않았습니다.'}, status=status.HTTP_400_BAD_REQUEST)

        if test_score.is_submitted:
            return Response({'detail': '이미 제출한 시험입니다.'}, status=status.HTTP_400_BAD_REQUEST)

        # 제한 시간 확인
        now = timezone.now()
        is_auto_submitted = False

        if now > exam.end_time:
            # 시간 초과 - 자동 제출 처리
            is_auto_submitted = True
            logger.info(f"[AUTO_SUBMIT] Time exceeded for exam {exam.id}, user {student_info.id}")

            # 임시 저장된 답안이 있으면 사용, 없으면 빈 답안으로 처리
            if not answers and test_score.detail_records:
                # 임시 저장된 답안에서 answer 정보 추출
                answers = [
                    {'question_id': int(q_id), 'answer': record.get('answer', '')}
                    for q_id, record in test_score.detail_records.items()
                    if isinstance(record, dict)
                ]

        # 자동 채점 (N+1 쿼리 최적화)
        total_score = 0
        detailed_records = {}

        # Bulk 조회: 모든 필요한 데이터를 한 번에 가져오기
        question_ids = [answer['question_id'] for answer in answers]

        # 1. 문제 정보 bulk 조회
        questions_dict = {
            q.id: q for q in TestQuestionInfo.objects.filter(id__in=question_ids)
        }

        # 2. 시험지-문제 매핑 정보 bulk 조회
        paper_questions_dict = {
            pq.test_question_id: pq
            for pq in TestPaperTestQ.objects.filter(
                test_paper=test_score.test_paper,
                test_question_id__in=question_ids
            )
        }

        # 3. 정답 옵션 정보 bulk 조회
        correct_options_dict = {
            opt.test_question_id: opt
            for opt in OptionInfo.objects.filter(
                test_question_id__in=question_ids,
                is_right=True
            )
        }

        # 답안 채점
        for answer_item in answers:
            question_id = answer_item['question_id']
            user_answer = answer_item.get('answer', '')
            selected_options = answer_item.get('selected_options', [])

            # Dict에서 조회
            question = questions_dict.get(question_id)
            paper_question = paper_questions_dict.get(question_id)

            if not question or not paper_question:
                continue

            question_score = paper_question.score

            # 채점
            is_correct = False
            if question.tq_type in ['xz', 'pd']:  # 객관식, OX
                correct_option = correct_options_dict.get(question_id)
                if correct_option:
                    # Frontend에서 selected_options 배열로 보내는 경우 확인
                    if selected_options:
                        is_correct = correct_option.id in selected_options
                    else:
                        # 기존 방식 (answer 필드에 직접 ID가 있는 경우)
                        is_correct = str(user_answer) == str(correct_option.id)

            earned_score = question_score if is_correct else 0
            total_score += earned_score

            detailed_records[str(question_id)] = {
                'answer': user_answer,
                'is_correct': is_correct,
                'score': earned_score,
                'max_score': question_score,
            }

        # 소요 시간 계산
        time_used = int((now - test_score.start_time).total_seconds() / 60)

        # 제출 기록
        with transaction.atomic():
            test_score.test_score = total_score
            test_score.detail_records = detailed_records
            test_score.submit_time = now
            test_score.is_submitted = True
            test_score.time_used = time_used
            test_score.save()

        submit_type = 'AUTO_SUBMIT' if is_auto_submitted else 'SUBMIT'
        logger.info(f"[{submit_type}] Saved TestScores ID: {test_score.id}, is_submitted: {test_score.is_submitted}, exam: {exam.id}, user: {student_info.id}")

        detail_message = '시간 초과로 자동 제출되었습니다.' if is_auto_submitted else '답안이 제출되었습니다.'

        return Response(
            {
                'detail': detail_message,
                'score': total_score,
                'total_possible': test_score.test_paper.total_score,
                'passed': total_score >= test_score.test_paper.passing_score,
                'time_used': time_used,
                'is_auto_submitted': is_auto_submitted,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=['get'])
    def status(self, request, pk=None):
        """
        응시 상태 조회.
        GET /api/v1/taking/{exam_id}/status/
        """
        student_info = self.get_student_info(request.user)
        if not student_info:
            return Response({'detail': '학생 정보를 찾을 수 없습니다.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            exam = ExaminationInfo.objects.get(id=pk)
        except ExaminationInfo.DoesNotExist:
            return Response({'detail': '시험을 찾을 수 없습니다.'}, status=status.HTTP_404_NOT_FOUND)

        test_score = TestScores.objects.filter(exam=exam, user=student_info).first()

        if not test_score:
            data = {
                'exam_id': exam.id,
                'exam_name': exam.name,
                'is_started': False,
                'is_submitted': False,
                'start_time': None,
                'submit_time': None,
                'time_remaining': None,
                'draft_answers': None,
                'score': None,
            }
        else:
            time_remaining = None
            if test_score.start_time and not test_score.is_submitted:
                now = timezone.now()
                remaining_seconds = (exam.end_time - now).total_seconds()
                time_remaining = max(0, int(remaining_seconds / 60))

            data = {
                'exam_id': exam.id,
                'exam_name': exam.name,
                'is_started': test_score.start_time is not None,
                'is_submitted': test_score.is_submitted,
                'start_time': test_score.start_time,
                'submit_time': test_score.submit_time,
                'time_remaining': time_remaining,
                'draft_answers': test_score.detail_records if not test_score.is_submitted else None,
                'score': test_score.test_score if test_score.is_submitted else None,
            }

        return Response(data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='save-draft')
    def save_draft(self, request, pk=None):
        """
        답안 임시 저장.
        POST /api/v1/taking/{exam_id}/save-draft/
        """
        student_info = self.get_student_info(request.user)
        if not student_info:
            return Response({'detail': '학생 정보를 찾을 수 없습니다.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            exam = ExaminationInfo.objects.get(id=pk)
        except ExaminationInfo.DoesNotExist:
            return Response({'detail': '시험을 찾을 수 없습니다.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = SaveDraftSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        test_score = TestScores.objects.filter(exam=exam, user=student_info).first()
        if not test_score or not test_score.start_time:
            return Response({'detail': '시험을 시작하지 않았습니다.'}, status=status.HTTP_400_BAD_REQUEST)

        if test_score.is_submitted:
            return Response({'detail': '이미 제출한 시험입니다.'}, status=status.HTTP_400_BAD_REQUEST)

        # 임시 저장
        test_score.detail_records = serializer.validated_data['answers']
        test_score.save()

        return Response(
            {'detail': '임시 저장되었습니다.', 'saved_at': timezone.now()}, status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['post'], url_path='save-answer')
    def save_answer(self, request, pk=None):
        """
        단일 답안 저장 (Frontend 호환).
        POST /api/v1/exams/{exam_id}/save-answer/
        """
        student_info = self.get_student_info(request.user)
        if not student_info:
            return Response({'detail': '학생 정보를 찾을 수 없습니다.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            exam = ExaminationInfo.objects.get(id=pk)
        except ExaminationInfo.DoesNotExist:
            return Response({'detail': '시험을 찾을 수 없습니다.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = SaveAnswerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        test_score = TestScores.objects.filter(exam=exam, user=student_info).first()
        if not test_score or not test_score.start_time:
            return Response({'detail': '시험을 시작하지 않았습니다.'}, status=status.HTTP_400_BAD_REQUEST)

        if test_score.is_submitted:
            return Response({'detail': '이미 제출한 시험입니다.'}, status=status.HTTP_400_BAD_REQUEST)

        # 단일 답안을 detail_records에 추가/업데이트
        question_id = str(serializer.validated_data['question_id'])
        answer_data = {
            'answer': serializer.validated_data.get('answer', ''),
            'selected_options': serializer.validated_data.get('selected_options', []),
        }

        if not test_score.detail_records:
            test_score.detail_records = {}

        test_score.detail_records[question_id] = answer_data
        test_score.save()

        return Response({'detail': '답안이 저장되었습니다.'}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='my')
    def my_submissions(self, request):
        """
        사용자의 모든 제출 내역 조회.
        GET /api/v1/submissions/my/
        """
        student_info = self.get_student_info(request.user)
        if not student_info:
            return Response({'detail': '학생 정보를 찾을 수 없습니다.'}, status=status.HTTP_403_FORBIDDEN)

        # 제출된 시험만 조회
        submissions = TestScores.objects.filter(
            user=student_info, is_submitted=True
        ).select_related('exam__subject', 'exam__create_user', 'test_paper').order_by('-submit_time')

        submissions_data = []
        for submission in submissions:
            # 답안 상세 정보 구성
            answers = []
            if submission.detail_records:
                for q_id, record in submission.detail_records.items():
                    try:
                        question = TestQuestionInfo.objects.get(id=int(q_id))
                        answers.append({
                            'id': int(q_id),
                            'question': question,
                            'answer': record.get('answer', ''),
                            'selected_options': record.get('selected_options', []),
                            'is_correct': record.get('is_correct', False),
                            'score': record.get('score', 0),
                            'max_score': record.get('max_score', 0),
                        })
                    except TestQuestionInfo.DoesNotExist:
                        continue

            submission_data = {
                'id': submission.id,
                'exam': submission.exam,
                'student': student_info,
                'answers': answers,
                'score': submission.test_score,
                'total_score': submission.test_paper.total_score if submission.test_paper else 0,
                'submitted_at': submission.submit_time,
                'created_at': submission.create_time,
            }
            submissions_data.append(submission_data)

        serializer = ExamSubmissionSerializer(submissions_data, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'])
    def result(self, request, pk=None):
        """
        시험 결과 조회.
        GET /api/v1/exams/{exam_id}/result/
        """
        student_info = self.get_student_info(request.user)
        if not student_info:
            return Response({'detail': '학생 정보를 찾을 수 없습니다.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            exam = ExaminationInfo.objects.get(id=pk)
        except ExaminationInfo.DoesNotExist:
            return Response({'detail': '시험을 찾을 수 없습니다.'}, status=status.HTTP_404_NOT_FOUND)

        logger.info(f"[RESULT] Querying TestScores for exam: {exam.id}, user: {student_info.id}")
        test_score = TestScores.objects.select_related('test_paper__subject').filter(exam=exam, user=student_info).first()
        logger.info(f"[RESULT] Found test_score: {test_score.id if test_score else None}, is_submitted: {test_score.is_submitted if test_score else None}")

        if not test_score or not test_score.is_submitted:
            return Response({'detail': '제출된 시험이 없습니다.'}, status=status.HTTP_404_NOT_FOUND)

        # 답안 상세 정보 구성
        answers = []
        if test_score.detail_records:
            for q_id, record in test_score.detail_records.items():
                try:
                    question = TestQuestionInfo.objects.select_related('subject').prefetch_related('optioninfo_set').get(id=int(q_id))
                    answers.append({
                        'id': int(q_id),
                        'question': question,
                        'answer': record.get('answer', ''),
                        'selected_options': record.get('selected_options', []),
                        'is_correct': record.get('is_correct', False),
                        'score': record.get('score', 0),
                        'max_score': record.get('max_score', 0),
                    })
                except TestQuestionInfo.DoesNotExist:
                    continue

        submission_data = {
            'id': test_score.id,
            'exam': exam,
            'test_paper': test_score.test_paper,
            'student': student_info,
            'answers': answers,
            'score': test_score.test_score,
            'total_score': test_score.test_paper.total_score if test_score.test_paper else 0,
            'submitted_at': test_score.submit_time,
            'created_at': test_score.create_time,
        }

        # 합격 여부 및 정답률 계산
        pass_score = test_score.test_paper.passing_score if test_score.test_paper else 0
        passed = test_score.test_score >= pass_score
        total_questions = len(answers)
        correct_answers = sum(1 for ans in answers if ans['is_correct'])
        accuracy = (correct_answers / total_questions * 100) if total_questions > 0 else 0

        result_data = {
            'submission': submission_data,
            'pass': passed,
            'pass_score': pass_score,
            'accuracy': accuracy,
        }

        serializer = ExamResultSerializer(result_data)
        return Response(serializer.data, status=status.HTTP_200_OK)
