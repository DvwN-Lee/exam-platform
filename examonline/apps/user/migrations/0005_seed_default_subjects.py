from django.db import migrations


def seed_subjects(apps, schema_editor):
    SubjectInfo = apps.get_model("user", "SubjectInfo")
    default_subjects = ["수학", "영어", "과학", "국어", "사회"]
    for name in default_subjects:
        SubjectInfo.objects.get_or_create(subject_name=name)


def remove_subjects(apps, schema_editor):
    SubjectInfo = apps.get_model("user", "SubjectInfo")
    SubjectInfo.objects.filter(subject_name__in=["수학", "영어", "과학", "국어", "사회"]).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("user", "0004_add_indexes_and_edit_time"),
    ]

    operations = [
        migrations.RunPython(seed_subjects, remove_subjects),
    ]
