from django.db import models
from django.utils import timezone

from user.models import UserProfile, StudentsInfo, SubjectInfo
from testpaper.models import TestPaperInfo


# 시험 정보
class ExaminationInfo(models.Model):
    name = models.CharField(max_length=50, default='', verbose_name='시험 명칭')
    subject = models.ForeignKey(
        SubjectInfo, on_delete=models.CASCADE, verbose_name='소속 과목')
    start_time = models.DateTimeField(
        default=timezone.now, verbose_name='시작 시간')
    end_time = models.DateTimeField(default=timezone.now, verbose_name='종료 시간')
    student_num = models.IntegerField(default=0, verbose_name='참가자 수')
    actual_num = models.IntegerField(default=0, verbose_name='실제 참가자 수')
    exam_state = models.CharField(
        choices=(('0', '시험 전'), ('1', '시험 중'), ('2', '시험 종료')),
        default='0',
        max_length=1,
        verbose_name='시험 상태',
    )
    exam_type = models.CharField(choices=(
        ('pt', '보통'), ('ts', '특수')), max_length=2, default='pt', verbose_name='유형')
    create_user = models.ForeignKey(
        UserProfile, on_delete=models.CASCADE, verbose_name='창설자')
    create_time = models.DateTimeField(
        default=timezone.now, verbose_name='생성 시간')

    class Meta:
        verbose_name = '시험 정보'
        verbose_name_plural = verbose_name
        indexes = [
            models.Index(fields=['exam_state'], name='exam_state_idx'),
            models.Index(fields=['start_time', 'end_time'], name='exam_time_range_idx'),
            models.Index(fields=['create_user'], name='exam_create_user_idx'),
        ]

    def __str__(self):
        return self.name


# 시험지 정보
class ExamPaperInfo(models.Model):
    exam = models.ForeignKey(
        ExaminationInfo, on_delete=models.CASCADE, verbose_name='시험 정보')
    paper = models.ForeignKey(
        TestPaperInfo, on_delete=models.CASCADE, verbose_name='시험지 정보')

    class Meta:
        verbose_name = '시험지 정보'
        verbose_name_plural = verbose_name
        indexes = [
            models.Index(fields=['exam', 'paper'], name='exam_paper_idx'),
        ]

    def __str__(self):
        return self.exam.name


# 응시자 정보
class ExamStudentsInfo(models.Model):
    exam = models.ForeignKey(
        ExaminationInfo, on_delete=models.CASCADE, verbose_name='시험 정보')
    student = models.ForeignKey(
        StudentsInfo, on_delete=models.CASCADE, verbose_name='수험생 정보')

    class Meta:
        verbose_name = '수험생 정보'
        verbose_name_plural = verbose_name
        indexes = [
            models.Index(fields=['exam', 'student'], name='exam_student_idx'),
            models.Index(fields=['student'], name='student_exam_lookup_idx'),
        ]

    def __str__(self):
        return self.exam.name
