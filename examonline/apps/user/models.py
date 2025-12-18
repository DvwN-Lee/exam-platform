from django.db import models
from django.utils import timezone
from django.contrib.auth.models import AbstractUser


# 사용자 기본 정보
class UserProfile(AbstractUser):
    nick_name = models.CharField(max_length=100, default='', verbose_name='닉네임')
    gender = models.CharField(
        choices=(('male', '남'), ('female', '여')), default='female', max_length=6, verbose_name='성별'
    )
    mobile = models.CharField(max_length=11, default='', null=True, blank=True, verbose_name='전화번호')
    user_type = models.CharField(
        choices=(('student', '학생'), ('teacher', '선생')), default='student', max_length=7, verbose_name='사용자 유형'
    )
    age = models.IntegerField(default=18, verbose_name='나이')
    image = models.ImageField(upload_to='image/%Y/%m', default='image/default.png', max_length=200, verbose_name='이미지')

    class Meta:
        verbose_name = '사용자 정보'
        verbose_name_plural = verbose_name

    def __str__(self):
        return self.username


# 인증번호 관련
class EmailVerifyRecord(models.Model):
    code = models.CharField(max_length=100, verbose_name='인증 번호')
    email = models.EmailField(max_length=50, verbose_name='이메일')
    send_type = models.CharField(
        choices=(
            ('active', '활성화'), ('forget', '비밀번호 찾기'), ('update_email', '이메일 업데이트'), ('special_exam', '특별 시험')
        ),
        max_length=50,
        verbose_name='발생 방식',
    )
    send_time = models.DateTimeField(default=timezone.now, verbose_name='발송 시간')

    class Meta:
        verbose_name = '이메일인증 번호'
        verbose_name_plural = verbose_name

    def __str__(self):
        return '{0}({1})'.format(self.code, self.email)


# 과목 정보
class SubjectInfo(models.Model):
    subject_name = models.CharField(max_length=20, default='', verbose_name='과목명')
    create_time = models.DateTimeField(default=timezone.now, verbose_name='생성 시간')

    class Meta:
        verbose_name = '과목 정보'
        verbose_name_plural = verbose_name

    def __str__(self):
        return self.subject_name


# 학생 정보
class StudentsInfo(models.Model):
    user = models.OneToOneField(UserProfile, on_delete=models.CASCADE)
    student_name = models.CharField(max_length=20, default='', verbose_name='학생 이름')
    student_id = models.CharField(max_length=20, default='', verbose_name='학번')
    student_class = models.CharField(max_length=10, default='', verbose_name='학생 반')
    student_school = models.CharField(max_length=100, default='', verbose_name='학생 학교')

    class Meta:
        verbose_name = '학생 정보'
        verbose_name_plural = verbose_name

    def __str__(self):
        return self.student_name


# 선생님 정보
class TeacherInfo(models.Model):
    user = models.OneToOneField(UserProfile, on_delete=models.CASCADE)
    teacher_name = models.CharField(max_length=20, default='', verbose_name='선생 이름')
    work_years = models.IntegerField(default=0, verbose_name='근무연도')
    subject = models.ForeignKey(SubjectInfo, on_delete=models.PROTECT, verbose_name='소속 과목')
    teacher_school = models.CharField(max_length=100, default='', verbose_name='선생 소속 학교')

    class Meta:
        verbose_name = '선생님 정보'
        verbose_name_plural = verbose_name

    def __str__(self):
        return self.teacher_name
