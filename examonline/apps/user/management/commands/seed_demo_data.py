"""
데모 데이터 생성 스크립트

Usage:
    uv run python manage.py seed_demo_data
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.user.models import SubjectInfo, StudentsInfo, TeacherInfo
from apps.testquestion.models import TestQuestionInfo, OptionInfo
from apps.testpaper.models import TestPaperInfo
from apps.examination.models import ExaminationInfo, ExamStudentsInfo

User = get_user_model()


class Command(BaseCommand):
    help = '포트폴리오 데모용 샘플 데이터 생성'

    def handle(self, *args, **options):
        self.stdout.write('데모 데이터 생성 시작...')

        # 1. 교사 계정 생성
        teacher_user, created = User.objects.get_or_create(
            username='demo_teacher',
            defaults={
                'email': 'teacher@demo.com',
                'nick_name': '김교사',
                'user_type': 'teacher',
            }
        )
        if created:
            teacher_user.set_password('demo1234!')
            teacher_user.save()
            TeacherInfo.objects.create(user=teacher_user)
            self.stdout.write(self.style.SUCCESS('교사 계정 생성: demo_teacher / demo1234!'))

        # 2. 학생 계정 생성
        students = []
        for i in range(1, 6):
            student_user, created = User.objects.get_or_create(
                username=f'demo_student{i}',
                defaults={
                    'email': f'student{i}@demo.com',
                    'nick_name': f'학생{i}',
                    'user_type': 'student',
                }
            )
            if created:
                student_user.set_password('demo1234!')
                student_user.save()
                student_info = StudentsInfo.objects.create(user=student_user)
                students.append(student_info)
                self.stdout.write(self.style.SUCCESS(f'학생 계정 생성: demo_student{i}'))

        # 3. 과목 생성
        subjects_data = ['수학', '영어', '과학', '국어', '사회']
        subjects = []
        for name in subjects_data:
            subject, created = SubjectInfo.objects.get_or_create(
                subject_name=name,
                defaults={'create_user': teacher_user}
            )
            subjects.append(subject)
            if created:
                self.stdout.write(self.style.SUCCESS(f'과목 생성: {name}'))

        # 4. 문제 생성
        questions_data = [
            {
                'subject': '수학',
                'content': '2 + 3 = ?',
                'options': [('5', True), ('4', False), ('6', False), ('3', False)],
            },
            {
                'subject': '수학',
                'content': '10 - 7 = ?',
                'options': [('3', True), ('2', False), ('4', False), ('5', False)],
            },
            {
                'subject': '영어',
                'content': 'Apple의 뜻은?',
                'options': [('사과', True), ('배', False), ('포도', False), ('오렌지', False)],
            },
            {
                'subject': '과학',
                'content': '물의 화학식은?',
                'options': [('H2O', True), ('CO2', False), ('O2', False), ('NaCl', False)],
            },
        ]

        questions = []
        for q_data in questions_data:
            subject = SubjectInfo.objects.get(subject_name=q_data['subject'])
            question, created = TestQuestionInfo.objects.get_or_create(
                question_content=q_data['content'],
                defaults={
                    'subject': subject,
                    'create_user': teacher_user,
                    'question_type': 'single',
                    'difficulty': 'medium',
                    'score': 10,
                }
            )
            if created:
                for opt_content, is_correct in q_data['options']:
                    OptionInfo.objects.create(
                        question=question,
                        option_content=opt_content,
                        is_correct=is_correct
                    )
                self.stdout.write(self.style.SUCCESS(f'문제 생성: {q_data["content"][:20]}...'))
            questions.append(question)

        self.stdout.write(self.style.SUCCESS('데모 데이터 생성 완료!'))
        self.stdout.write('')
        self.stdout.write('로그인 정보:')
        self.stdout.write('  교사: demo_teacher / demo1234!')
        self.stdout.write('  학생: demo_student1~5 / demo1234!')
