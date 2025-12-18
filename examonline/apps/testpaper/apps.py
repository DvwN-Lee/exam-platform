from django.apps import AppConfig


class TestpaperConfig(AppConfig):
    name = 'testpaper'
    # admin에서 app 이름 바꾸기
    verbose_name = '시험지 정보（TP_Info）'
