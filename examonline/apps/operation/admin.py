from django.contrib import admin

from .models import ExamComments, UserMessage, UserFavorite


# admin-시험 리뷰 등록
@admin.register(ExamComments)
class ExamCommentsAdmin(admin.ModelAdmin):
    # admin 헤더
    list_display = ('user', 'exam', 'comments', 'add_time')
    # 검색
    search_fields = ('user',)
    # 페이지
    list_per_page = 20


# admin-사용자 정보 등록
@admin.register(UserMessage)
class UserMessageAdmin(admin.ModelAdmin):
    # admin 헤더
    list_display = ('user', 'message', 'has_read', 'add_time')
    # 검색
    search_fields = ('user',)
    # 페이지
    list_per_page = 20


# admin-사용자 입력 정보 등록
@admin.register(UserFavorite)
class UserFavoriteAdmin(admin.ModelAdmin):
    # admin 헤더
    list_display = ('user', 'fav_id', 'add_time')
    # 검색
    search_fields = ('user',)
    # 페이지
    list_per_page = 20
