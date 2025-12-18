from django.contrib import admin

from .models import TestPaperInfo, TestPaperTestQ, TestScores


# admin-시험지 정보 등록
@admin.register(TestPaperInfo)
class TestPaperInfoAdmin(admin.ModelAdmin):
    # admin 헤더
    list_display = (
        'name',
        'subject',
        'tp_degree',
        'total_score',
        'passing_score',
        'create_user',
        'create_time',
        'edit_time',
    )
    # 검색
    search_fields = ('name',)
    # 페이지
    list_per_page = 20


# admin-시험지 문제 정보 등록
@admin.register(TestPaperTestQ)
class TestPaperTestQAdmin(admin.ModelAdmin):
    # admin 헤더
    list_display = ('test_paper', 'test_question')
    # 검색
    search_fields = ('test_paper',)
    # 페이지
    list_per_page = 20


# admin-학생 성적정보 등록
@admin.register(TestScores)
class TestScoresAdmin(admin.ModelAdmin):
    # admin 헤더
    list_display = ('user', 'test_paper', 'test_score', 'create_time')
    # 검색
    search_fields = ('user',)
    # 페이지
    list_per_page = 20
