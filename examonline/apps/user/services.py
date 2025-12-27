"""
User Dashboard Services.

비즈니스 로직을 View에서 분리하여 재사용성과 테스트 용이성을 개선.
"""

from django.db.models import Count, Avg, Prefetch
from django.utils import timezone

from examination.models import ExaminationInfo, ExamPaperInfo, ExamStudentsInfo
from testpaper.models import TestPaperInfo, TestScores
from testquestion.models import TestQuestionInfo
from user.models import StudentsInfo


class StudentDashboardService:
    """
    학생 대시보드 데이터 조회 서비스.

    학생의 통계, 성적 추이, 예정된 시험, 학습 진행률을 제공.
    """

    def __init__(self, student_info: StudentsInfo):
        self.student_info = student_info
        self.user = student_info.user
        self.now = timezone.now()

    def get_dashboard_data(self) -> dict:
        """
        대시보드 전체 데이터 조회.

        Query 최적화: 공통 데이터를 한 번만 조회하여 재사용

        Returns:
            dict: 통계, 성적 추이, 예정 시험, 진행률, 최근 제출 내역
        """
        # 1. 공통 데이터 조회 (Query Reuse)
        submissions_qs = self._get_submissions()
        submissions_list = list(submissions_qs)  # QuerySet을 list로 변환 (1회 query)

        # 2. enrolled_exam_ids 한 번만 조회 (여러 메서드에서 재사용)
        enrolled_exam_ids = list(ExamStudentsInfo.objects.filter(
            student=self.student_info
        ).values_list('exam_id', flat=True))

        # 3. recent_submissions_list 한 번만 조회 (score_trend, recent_submissions에서 재사용)
        recent_submissions_list = sorted(submissions_list, key=lambda x: x.submit_time, reverse=True)[:5]

        # 4. subject_total_exams_dict 한 번만 조회 (progress에서 재사용, N+1 방지)
        subject_total_exams_dict = dict(
            ExamStudentsInfo.objects.filter(
                student=self.student_info
            ).values('exam__subject__subject_name').annotate(
                total=Count('id')
            ).values_list('exam__subject__subject_name', 'total')
        )

        # 5. 조회된 데이터를 각 메서드에 전달하여 재사용
        statistics = self._get_statistics(submissions_list, enrolled_exam_ids)
        score_trend = self._get_score_trend(recent_submissions_list)
        upcoming_exams = self._get_upcoming_exams(enrolled_exam_ids)
        progress = self._get_progress(submissions_list, subject_total_exams_dict)
        recent_submissions = self._get_recent_submissions(recent_submissions_list)

        return {
            'statistics': statistics,
            'score_trend': score_trend,
            'upcoming_exams': upcoming_exams,
            'progress': progress,
            'recent_submissions': recent_submissions,
            'wrong_questions': [],
        }

    def _get_submissions(self):
        """제출된 시험 기록 조회 (N+1 쿼리 방지)"""
        return TestScores.objects.filter(
            user=self.student_info,
            is_submitted=True
        ).select_related(
            'exam', 'exam__subject', 'exam__create_user', 'test_paper'
        ).prefetch_related(
            Prefetch(
                'exam__exampaperinfo_set',
                queryset=ExamPaperInfo.objects.select_related(
                    'paper__subject', 'paper__create_user'
                ),
                to_attr='prefetched_exam_papers'
            )
        )

    def _serialize_testpaper(self, paper) -> dict:
        """
        TestPaperInfo 객체를 dictionary로 직렬화

        Args:
            paper: TestPaperInfo 객체

        Returns:
            dict: 직렬화된 testpaper data
        """
        if not paper:
            return None

        return {
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

    def _get_statistics(self, submissions_list: list, enrolled_exam_ids: list) -> dict:
        """
        통계 데이터 계산

        Args:
            submissions_list: 제출 내역 목록 (재사용)
            enrolled_exam_ids: 등록된 시험 ID 목록 (재사용)
        """
        total_exams_taken = len(submissions_list)

        if total_exams_taken > 0:
            # Python에서 평균 점수 계산 (DB query 절약)
            total_score = sum(sub.test_score for sub in submissions_list)
            average_score = round(total_score / total_exams_taken, 1)

            # 합격률 및 정답률 계산
            passed_count = 0
            total_correct = 0
            total_questions = 0

            for sub in submissions_list:
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

        # 예정된 시험 수 (전달받은 enrolled_exam_ids 재사용)
        upcoming_count = ExaminationInfo.objects.filter(
            id__in=enrolled_exam_ids,
            start_time__gte=self.now
        ).count()

        return {
            'total_exams_taken': total_exams_taken,
            'average_score': average_score,
            'pass_rate': pass_rate,
            'correct_answers': total_correct,
            'total_questions_answered': total_questions,
            'upcoming_exams_count': upcoming_count,
        }

    def _get_score_trend(self, recent_submissions_list: list) -> list:
        """
        성적 추이 (최근 5개 시험)

        Args:
            recent_submissions_list: 최근 제출 내역 목록 (재사용)
        """
        score_trend = []

        for sub in recent_submissions_list:
            if sub.exam and sub.test_paper:
                percentage = round(
                    (sub.test_score / sub.test_paper.total_score) * 100
                ) if sub.test_paper.total_score > 0 else 0

                score_trend.append({
                    'exam_name': sub.exam.name,
                    'score': sub.test_score,
                    'percentage': percentage,
                    'date': sub.submit_time.strftime('%Y-%m-%d') if sub.submit_time else None,
                })

        return score_trend

    def _get_upcoming_exams(self, enrolled_exam_ids: list) -> list:
        """
        예정된 시험 목록 (최대 10개)

        Args:
            enrolled_exam_ids: 등록된 시험 ID 목록 (재사용)
        """
        # Upcoming exams 조회 (N+1 쿼리 방지)
        upcoming_exams_qs = ExaminationInfo.objects.filter(
            id__in=enrolled_exam_ids,
            start_time__gte=self.now
        ).select_related('create_user', 'subject').prefetch_related(
            Prefetch(
                'exampaperinfo_set',
                queryset=ExamPaperInfo.objects.select_related(
                    'paper__subject', 'paper__create_user'
                ),
                to_attr='prefetched_exam_papers'
            )
        ).order_by('start_time')

        # 데이터 직렬화
        upcoming_exams = []
        for exam in upcoming_exams_qs[:10]:
            exam_papers = getattr(exam, 'prefetched_exam_papers', [])
            exam_paper = exam_papers[0] if exam_papers else None

            if exam_paper and exam_paper.paper:
                upcoming_exams.append({
                    'id': exam.id,
                    'exam_name': exam.name,
                    'testpaper': self._serialize_testpaper(exam_paper.paper),
                    'start_time': exam.start_time.isoformat(),
                    'end_time': exam.end_time.isoformat() if exam.end_time else None,
                    'is_public': True,
                    'creat_user': {
                        'id': exam.create_user.id,
                        'nick_name': exam.create_user.nick_name,
                    } if exam.create_user else None,
                    'created_at': exam.create_time.isoformat() if exam.create_time else None,
                    'updated_at': exam.create_time.isoformat() if exam.create_time else None,
                })

        return upcoming_exams

    def _get_progress(self, submissions_list: list, subject_total_exams_dict: dict) -> list:
        """
        과목별 진행률

        Args:
            submissions_list: 제출 내역 목록 (재사용)
            subject_total_exams_dict: 과목별 전체 시험 수 dictionary (재사용, N+1 방지)
        """
        progress = []

        # Python에서 과목별 완료 수 계산 (DB query 절약)
        subject_completed = {}
        for sub in submissions_list:
            if sub.exam and sub.exam.subject:
                subject_name = sub.exam.subject.subject_name
                subject_completed[subject_name] = subject_completed.get(subject_name, 0) + 1

        # 과목별 진행률 계산
        for subject_name, completed in subject_completed.items():
            total_in_subject = subject_total_exams_dict.get(subject_name, 0)

            if total_in_subject > 0:
                pct = round((completed / total_in_subject) * 100)
                progress.append({
                    'subject': subject_name,
                    'progress_percentage': pct,
                    'completed_lectures': completed,
                    'total_lectures': total_in_subject,
                })

        return progress

    def _get_recent_submissions(self, recent_submissions_list: list) -> list:
        """
        최근 제출 내역 (최근 5개)

        Args:
            recent_submissions_list: 최근 제출 내역 목록 (재사용)
        """
        recent_submissions = []

        for sub in recent_submissions_list:
            if sub.exam:
                exam = sub.exam
                # prefetch된 시험지 조회
                exam_papers = getattr(exam, 'prefetched_exam_papers', [])
                exam_paper = exam_papers[0] if exam_papers else None

                # Helper method 사용하여 testpaper 직렬화
                testpaper_data = None
                if exam_paper and exam_paper.paper:
                    testpaper_data = self._serialize_testpaper(exam_paper.paper)

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
                        'id': self.student_info.id,
                        'nick_name': self.user.nick_name,
                    },
                    'answers': [],
                    'score': sub.test_score,
                    'total_score': sub.test_paper.total_score if sub.test_paper else 0,
                    'submitted_at': sub.submit_time.isoformat() if sub.submit_time else None,
                    'created_at': sub.create_time.isoformat() if sub.create_time else None,
                })

        return recent_submissions


class TeacherDashboardService:
    """
    교사 대시보드 데이터 조회 서비스.

    교사의 통계, 최근 시험, 문제 분포, 점수 분포를 제공.
    """

    def __init__(self, user):
        self.user = user
        self.now = timezone.now()

    def get_dashboard_data(self) -> dict:
        """
        대시보드 전체 데이터 조회.

        Returns:
            dict: 최근 문제, 최근 시험지, 진행 중 시험, 통계
        """
        recent_questions = self._get_recent_questions()
        recent_testpapers = self._get_recent_testpapers()
        ongoing_exams = self._get_ongoing_exams()
        question_statistics = self._get_question_statistics()
        student_statistics = self._get_student_statistics()

        return {
            'recent_questions': recent_questions,
            'recent_testpapers': recent_testpapers,
            'ongoing_exams': ongoing_exams,
            'question_statistics': question_statistics,
            'student_statistics': student_statistics,
        }

    def _get_recent_questions(self) -> list:
        """최근 문제 (최근 5개)"""
        recent_questions_qs = TestQuestionInfo.objects.filter(
            create_user=self.user,
            is_del=False
        ).select_related(
            'subject', 'create_user'
        ).prefetch_related('optioninfo_set').order_by('-create_time')[:5]

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

        return recent_questions

    def _get_recent_testpapers(self) -> list:
        """최근 시험지 (최근 5개)"""
        recent_testpapers_qs = TestPaperInfo.objects.filter(
            create_user=self.user
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

        return recent_testpapers

    def _get_ongoing_exams(self) -> list:
        """진행 중/예정된 시험 (최근 5개)"""
        ongoing_exams_qs = ExaminationInfo.objects.filter(
            create_user=self.user,
            end_time__gte=self.now
        ).select_related('subject', 'create_user').prefetch_related(
            Prefetch(
                'exampaperinfo_set',
                queryset=ExamPaperInfo.objects.select_related(
                    'paper__subject', 'paper__create_user'
                ),
                to_attr='prefetched_exam_papers'
            )
        ).order_by('start_time')[:5]

        ongoing_exams = []
        for exam in ongoing_exams_qs:
            exam_papers = getattr(exam, 'prefetched_exam_papers', [])
            exam_paper = exam_papers[0] if exam_papers else None

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

        return ongoing_exams

    def _get_question_statistics(self) -> dict:
        """문제 통계"""
        user_questions = TestQuestionInfo.objects.filter(
            create_user=self.user, is_del=False
        )
        total_questions = user_questions.count()
        shared_questions = user_questions.filter(is_share=True).count()

        # 유형별 집계
        type_counts = user_questions.values('tq_type').annotate(count=Count('id'))
        questions_by_type = {item['tq_type']: item['count'] for item in type_counts}

        # 난이도별 집계
        degree_counts = user_questions.values('tq_degree').annotate(count=Count('id'))
        questions_by_difficulty = {item['tq_degree']: item['count'] for item in degree_counts}

        return {
            'total_questions': total_questions,
            'shared_questions': shared_questions,
            'questions_by_type': questions_by_type,
            'questions_by_difficulty': questions_by_difficulty,
        }

    def _get_student_statistics(self) -> dict:
        """학생 통계"""
        # 교사가 출제한 시험 조회
        teacher_exams = ExaminationInfo.objects.filter(create_user=self.user)
        teacher_exam_ids = teacher_exams.values_list('id', flat=True)

        # 등록된 학생 수 (중복 제거)
        total_students = ExamStudentsInfo.objects.filter(
            exam_id__in=teacher_exam_ids
        ).values('student').distinct().count()

        # 제출된 답안 조회
        submissions = TestScores.objects.filter(
            exam_id__in=teacher_exam_ids,
            is_submitted=True
        )
        total_submissions = submissions.count()

        # 평균 점수
        avg_score_result = submissions.aggregate(avg=Avg('test_score'))
        average_score = round(avg_score_result['avg'] or 0, 1)

        # 합격률 계산
        if total_submissions > 0:
            passed_count = 0
            for submission in submissions.select_related('test_paper'):
                if submission.test_paper and submission.test_score >= submission.test_paper.passing_score:
                    passed_count += 1
            pass_rate = round((passed_count / total_submissions) * 100, 1)
        else:
            pass_rate = 0.0

        return {
            'total_students': total_students,
            'total_submissions': total_submissions,
            'average_score': average_score,
            'pass_rate': pass_rate,
            'recent_submissions': [],
        }
