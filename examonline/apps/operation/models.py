from django.db import models
from django.utils import timezone

from user.models import UserProfile
from examination.models import ExaminationInfo


# 시험 평가
class ExamComments(models.Model):
    user = models.ForeignKey(UserProfile, on_delete=models.CASCADE, verbose_name="사용자")
    exam = models.ForeignKey(ExaminationInfo, on_delete=models.CASCADE, verbose_name="커리큘럼")
    comments = models.CharField(max_length=200, verbose_name="평가")
    add_time = models.DateTimeField(default=timezone.now, verbose_name="추가 시간")

    class Meta:
        verbose_name = "시험 평가"
        verbose_name_plural = verbose_name


# 사용자 정보
class UserMessage(models.Model):
    user = models.IntegerField(default=0, verbose_name="사용자 접수")
    message = models.CharField(max_length=500, verbose_name="메시지 내용")
    has_read = models.BooleanField(default=False, verbose_name="읽음 여부")
    add_time = models.DateTimeField(default=timezone.now, verbose_name="추가 시간")

    class Meta:
        verbose_name = "사용자 정보"
        verbose_name_plural = verbose_name


# 사용자 선호도
class UserFavorite(models.Model):
    user = models.ForeignKey(UserProfile, on_delete=models.CASCADE, verbose_name="사용자")
    fav_id = models.IntegerField(default=0, verbose_name="데이터id")
    add_time = models.DateTimeField(default=timezone.now, verbose_name="추가 시간")

    class Meta:
        verbose_name = "사용자 선호도"
        verbose_name_plural = verbose_name
