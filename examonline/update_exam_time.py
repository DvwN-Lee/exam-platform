import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.local')
django.setup()

from apps.examination.models import Examination
from django.utils import timezone
from datetime import timedelta

exam = Examination.objects.get(id=1)
print(f"현재 시작 시간: {exam.start_time}")
print(f"현재 종료 시간: {exam.end_time}")

# 시작 시간을 1시간 전으로 설정
exam.start_time = timezone.now() - timedelta(hours=1)
exam.end_time = timezone.now() + timedelta(hours=1)
exam.save()

print(f"\n수정된 시작 시간: {exam.start_time}")
print(f"수정된 종료 시간: {exam.end_time}")
print("\n시험 시간이 성공적으로 수정되었습니다.")
