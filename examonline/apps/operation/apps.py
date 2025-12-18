from django.apps import AppConfig


class OperationConfig(AppConfig):
    name = 'operation'
    # admin에서 app 이름 바꾸기
    verbose_name = '사용자 작업（Operation）'
