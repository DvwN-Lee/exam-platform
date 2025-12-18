from django.apps import AppConfig


class TestquestionConfig(AppConfig):
    name = 'testquestion'
    # admin에서 app 이름 바꾸기
    verbose_name = '시험 문제 정보（TQ_Info）'
