from django.contrib import admin
from .models import UserProfile, EmailVerifyRecord, StudentsInfo, TeacherInfo, SubjectInfo


# admin-사용자 정보 등록
@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    # admin 헤더
    list_display = ('username', 'nick_name', 'age', 'gender', 'mobile', 'image', 'user_type')
    # 검색
    search_fields = ('nick_name', 'username')
    # 페이지
    list_per_page = 20


# admin-메일 인증번호 등록
@admin.register(EmailVerifyRecord)
class EmailVerifyRecordAdmin(admin.ModelAdmin):
    # admin 헤더
    list_display = ('code', 'email', 'send_type', 'send_time')
    # 검색
    search_fields = ('code', 'email')
    # 페이지
    list_per_page = 20


# admin-과목정보 등록
@admin.register(SubjectInfo)
class SubjectInfoAdmin(admin.ModelAdmin):
    # admin 헤더
    list_display = ('subject_name', 'create_time')
    # 검색
    search_fields = ('subject_name',)
    # 페이지
    list_per_page = 20


# admin-학생정보 등록
@admin.register(StudentsInfo)
class StudentsInfoAdmin(admin.ModelAdmin):
    # admin 헤더
    list_display = ('student_name', 'student_id', 'student_class', 'student_school')
    # 검색
    search_fields = ('student_name', 'student_id', 'student_class', 'student_school')
    # 페이지
    list_per_page = 20


# admin-선생님 정보 등록
@admin.register(TeacherInfo)
class TeacherInfoAdmin(admin.ModelAdmin):
    # admin 헤더
    list_display = ('teacher_name', 'work_years', 'teacher_school', 'subject')
    # 검색
    search_fields = ('teacher_name', 'teacher_school')
    # 페이지
    list_per_page = 20
