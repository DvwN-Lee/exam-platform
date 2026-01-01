"""
데모 데이터 생성 스크립트

Usage:
    uv run python manage.py seed_demo_data
"""

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = '포트폴리오 데모용 샘플 데이터 생성'

    def handle(self, *args, **options):
        from django.contrib.auth import get_user_model
        from user.models import SubjectInfo, StudentsInfo, TeacherInfo
        from testquestion.models import TestQuestionInfo, OptionInfo

        User = get_user_model()

        self.stdout.write('데모 데이터 생성 시작...')

        # 1. 교사 계정 생성 (먼저 User만 생성)
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
            self.stdout.write(self.style.SUCCESS('교사 계정 생성: demo_teacher / demo1234!'))

        # 2. 과목 생성 (TeacherInfo 생성 전에 필요)
        subjects_data = ['수학', '영어', '과학', '국어', '사회']
        subjects = []
        for name in subjects_data:
            subject, created = SubjectInfo.objects.get_or_create(
                subject_name=name
            )
            subjects.append(subject)
            if created:
                self.stdout.write(self.style.SUCCESS(f'과목 생성: {name}'))

        # 3. TeacherInfo 생성 (과목 필요)
        math_subject = SubjectInfo.objects.get(subject_name='수학')
        teacher_info, created = TeacherInfo.objects.get_or_create(
            user=teacher_user,
            defaults={
                'teacher_name': '김교사',
                'work_years': 5,
                'teacher_school': '데모고등학교',
                'subject': math_subject,
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS('교사 정보 생성 완료'))

        # 4. 학생 계정 생성
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
                student_info = StudentsInfo.objects.create(
                    user=student_user,
                    student_name=f'학생{i}',
                    student_id=f'2024{i:04d}',
                    student_class=f'{(i % 3) + 1}반',
                    student_school='데모고등학교',
                )
                students.append(student_info)
                self.stdout.write(self.style.SUCCESS(f'학생 계정 생성: demo_student{i}'))

        # 5. 문제 생성
        questions_data = [
            {
                'subject': '수학',
                'name': '2 + 3 = ?',
                'options': [('5', True), ('4', False), ('6', False), ('3', False)],
            },
            {
                'subject': '수학',
                'name': '10 - 7 = ?',
                'options': [('3', True), ('2', False), ('4', False), ('5', False)],
            },
            {
                'subject': '수학',
                'name': '5 x 6 = ?',
                'options': [('30', True), ('25', False), ('35', False), ('20', False)],
            },
            {
                'subject': '영어',
                'name': 'Apple의 뜻은?',
                'options': [('사과', True), ('배', False), ('포도', False), ('오렌지', False)],
            },
            {
                'subject': '영어',
                'name': 'Book의 뜻은?',
                'options': [('책', True), ('연필', False), ('노트', False), ('가방', False)],
            },
            {
                'subject': '과학',
                'name': '물의 화학식은?',
                'options': [('H2O', True), ('CO2', False), ('O2', False), ('NaCl', False)],
            },
            {
                'subject': '과학',
                'name': '태양계에서 가장 큰 행성은?',
                'options': [('목성', True), ('토성', False), ('화성', False), ('지구', False)],
            },
            {
                'subject': '국어',
                'name': '다음 중 맞춤법이 올바른 것은?',
                'options': [('웬지', False), ('왠지', True), ('원지', False), ('완지', False)],
            },
        ]

        questions = []
        for q_data in questions_data:
            subject = SubjectInfo.objects.get(subject_name=q_data['subject'])
            question, created = TestQuestionInfo.objects.get_or_create(
                name=q_data['name'],
                defaults={
                    'subject': subject,
                    'create_user': teacher_user,
                    'tq_type': 'xz',  # 객관식
                    'tq_degree': 'zd',  # 보통
                    'score': 10,
                }
            )
            if created:
                for opt_content, is_right in q_data['options']:
                    OptionInfo.objects.create(
                        test_question=question,
                        option=opt_content,
                        is_right=is_right
                    )
                self.stdout.write(self.style.SUCCESS(f'문제 생성: {q_data["name"][:20]}...'))
            questions.append(question)

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('데모 데이터 생성 완료!'))
        self.stdout.write('')
        self.stdout.write('로그인 정보:')
        self.stdout.write('  교사: demo_teacher / demo1234!')
        self.stdout.write('  학생: demo_student1~5 / demo1234!')
