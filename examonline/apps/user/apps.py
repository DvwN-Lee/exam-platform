from django.apps import AppConfig


class UserConfig(AppConfig):
    name = 'user'
    # admin에서 app 이름 바꾸기
    verbose_name = '사용자 정보（UserInfo）'
