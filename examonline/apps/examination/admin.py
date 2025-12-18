from django.contrib import admin

from .models import ExaminationInfo, ExamPaperInfo, ExamStudentsInfo


# admin-시험정보 등록
@admin.register(ExaminationInfo)
class ExaminationInfoAdmin(admin.ModelAdmin):
    # admin 헤더
    list_display = (
        'name',
        'subject',
        'start_time',
        'end_time',
        'student_num',
        'actual_num',
        'exam_state',
        'exam_type',
        'create_user',
        'create_time',
    )
    # 검색
    search_fields = ('name',)
    # 페이지
    list_per_page = 20


# admin-시험지 정보 등록
@admin.register(ExamPaperInfo)
class ExamPaperInfoAdmin(admin.ModelAdmin):
    # admin 헤더
    list_display = (
        'exam',
        'paper',
    )
    # 검색
    search_fields = ('exam',)
    # 페이지
    list_per_page = 20


# admin-수험생 정보 등록
@admin.register(ExamStudentsInfo)
class ExamStudentsInfoAdmin(admin.ModelAdmin):
    # admin 헤더
    list_display = (
        'exam',
        'student',
    )
    # 검색
    search_fields = ('exam',)
    # 페이지
    list_per_page = 20
