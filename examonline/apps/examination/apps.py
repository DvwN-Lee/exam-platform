from django.apps import AppConfig


class ExaminationConfig(AppConfig):
    name = 'examination'
    # admin에서 app 이름 바꾸기
    verbose_name = '시험 정보（Exam_Info）'
