"""
User API serializers.
"""

from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from core.api.fields import XSSSanitizedCharField
from user.models import EmailVerifyRecord, StudentsInfo, SubjectInfo, TeacherInfo, UserProfile


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom JWT Token serializer that includes user_type and profile information.
    """

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Add custom claims
        token['user_type'] = user.user_type
        token['nick_name'] = user.nick_name
        token['email'] = user.email

        return token

    def validate(self, attrs):
        data = super().validate(attrs)

        # Add complete user object to response
        data['user'] = {
            'id': self.user.id,
            'username': self.user.username,
            'email': self.user.email,
            'nick_name': self.user.nick_name,
            'user_type': self.user.user_type,
            'created_at': self.user.date_joined.isoformat() if self.user.date_joined else None,
        }

        return data


class SubjectSerializer(serializers.ModelSerializer):
    """
    Subject serializer.
    """

    subject_name = XSSSanitizedCharField(max_length=20)

    class Meta:
        model = SubjectInfo
        fields = ['id', 'subject_name', 'create_time']
        read_only_fields = ['id', 'create_time']


class StudentInfoSerializer(serializers.ModelSerializer):
    """
    Student information serializer.
    """

    class Meta:
        model = StudentsInfo
        fields = ['id', 'student_name', 'student_id', 'student_class', 'student_school']
        read_only_fields = ['id']


class TeacherInfoSerializer(serializers.ModelSerializer):
    """
    Teacher information serializer.
    """

    subject = SubjectSerializer(read_only=True)
    subject_id = serializers.PrimaryKeyRelatedField(
        queryset=SubjectInfo.objects.all(),
        source='subject',
        write_only=True
    )

    class Meta:
        model = TeacherInfo
        fields = ['teacher_name', 'work_years', 'teacher_school', 'subject', 'subject_id']


class UserProfileSerializer(serializers.ModelSerializer):
    """
    User profile serializer with nested student/teacher info.
    """

    student_info = StudentInfoSerializer(source='studentsinfo', read_only=True)
    teacher_info = TeacherInfoSerializer(source='teacherinfo', read_only=True)
    created_at = serializers.DateTimeField(source='date_joined', read_only=True)

    class Meta:
        model = UserProfile
        fields = [
            'id', 'username', 'email', 'nick_name', 'gender', 'mobile',
            'user_type', 'age', 'image', 'created_at',
            'student_info', 'teacher_info'
        ]
        read_only_fields = ['id', 'username', 'user_type', 'created_at']


class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    User registration serializer with student/teacher info.
    """

    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True, label='비밀번호 확인')

    # Student fields (optional) - XSS sanitized
    student_name = XSSSanitizedCharField(required=False, allow_blank=True)
    student_id = XSSSanitizedCharField(required=False, allow_blank=True)
    student_class = XSSSanitizedCharField(required=False, allow_blank=True)
    student_school = XSSSanitizedCharField(required=False, allow_blank=True)

    # Teacher fields (optional) - XSS sanitized
    teacher_name = XSSSanitizedCharField(required=False, allow_blank=True)
    work_years = serializers.IntegerField(required=False)
    teacher_school = XSSSanitizedCharField(required=False, allow_blank=True)
    subject_id = serializers.PrimaryKeyRelatedField(
        queryset=SubjectInfo.objects.all(),
        required=False,
        allow_null=True
    )

    class Meta:
        model = UserProfile
        fields = [
            'username', 'email', 'password', 'password2', 'nick_name',
            'gender', 'mobile', 'user_type', 'age', 'image',
            # Student fields
            'student_name', 'student_id', 'student_class', 'student_school',
            # Teacher fields
            'teacher_name', 'work_years', 'teacher_school', 'subject_id'
        ]

    def validate(self, attrs):
        """
        Validate password match and required fields based on user_type.
        """
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "비밀번호가 일치하지 않습니다."})

        user_type = attrs.get('user_type', 'student')

        # Validate student fields
        if user_type == 'student':
            if not attrs.get('student_name'):
                raise serializers.ValidationError({"student_name": "학생 이름은 필수입니다."})

        # Validate teacher fields
        elif user_type == 'teacher':
            if not attrs.get('teacher_name'):
                raise serializers.ValidationError({"teacher_name": "교사 이름은 필수입니다."})
            if not attrs.get('subject_id'):
                raise serializers.ValidationError({"subject_id": "과목은 필수입니다."})

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        """
        Create user with student/teacher info.
        """
        # Remove password2 and profile-specific fields
        validated_data.pop('password2')
        student_name = validated_data.pop('student_name', None)
        student_id = validated_data.pop('student_id', None)
        student_class = validated_data.pop('student_class', None)
        student_school = validated_data.pop('student_school', None)
        teacher_name = validated_data.pop('teacher_name', None)
        work_years = validated_data.pop('work_years', None)
        teacher_school = validated_data.pop('teacher_school', None)
        subject = validated_data.pop('subject_id', None)

        # Create user
        user = UserProfile.objects.create_user(**validated_data)

        # Create student/teacher info based on user_type
        if user.user_type == 'student':
            StudentsInfo.objects.create(
                user=user,
                student_name=student_name or user.nick_name,
                student_id=student_id or '',
                student_class=student_class or '',
                student_school=student_school or ''
            )
        elif user.user_type == 'teacher':
            TeacherInfo.objects.create(
                user=user,
                teacher_name=teacher_name or user.nick_name,
                work_years=work_years or 0,
                teacher_school=teacher_school or '',
                subject=subject
            )

        return user


class PasswordChangeSerializer(serializers.Serializer):
    """
    Password change serializer.
    """

    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True, validators=[validate_password])
    new_password2 = serializers.CharField(required=True, write_only=True, label='새 비밀번호 확인')

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password2']:
            raise serializers.ValidationError({"new_password": "새 비밀번호가 일치하지 않습니다."})
        return attrs

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("기존 비밀번호가 올바르지 않습니다.")
        return value

    def save(self, **kwargs):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    """
    User profile update serializer.
    """

    student_info = StudentInfoSerializer(required=False)
    teacher_info = TeacherInfoSerializer(required=False)

    class Meta:
        model = UserProfile
        fields = ['nick_name', 'gender', 'mobile', 'age', 'image', 'student_info', 'teacher_info']

    @transaction.atomic
    def update(self, instance, validated_data):
        student_info_data = validated_data.pop('student_info', None)
        teacher_info_data = validated_data.pop('teacher_info', None)

        # Update user profile
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update student/teacher info
        if instance.user_type == 'student' and student_info_data:
            student_info = StudentsInfo.objects.get(user=instance)
            for attr, value in student_info_data.items():
                setattr(student_info, attr, value)
            student_info.save()

        elif instance.user_type == 'teacher' and teacher_info_data:
            teacher_info = TeacherInfo.objects.get(user=instance)
            subject = teacher_info_data.pop('subject', None)
            for attr, value in teacher_info_data.items():
                setattr(teacher_info, attr, value)
            if subject:
                teacher_info.subject = subject
            teacher_info.save()

        return instance


class StudentDashboardSerializer(serializers.Serializer):
    """
    Student dashboard data serializer.
    """

    statistics = serializers.DictField()
    score_trend = serializers.ListField(child=serializers.DictField())
    upcoming_exams = serializers.ListField(child=serializers.DictField())
    progress = serializers.ListField(child=serializers.DictField())
    recent_submissions = serializers.ListField(child=serializers.DictField())
    wrong_questions = serializers.ListField(child=serializers.DictField())


class TeacherDashboardSerializer(serializers.Serializer):
    """
    Teacher dashboard data serializer.
    """

    recent_questions = serializers.ListField(child=serializers.DictField())
    recent_testpapers = serializers.ListField(child=serializers.DictField())
    ongoing_exams = serializers.ListField(child=serializers.DictField())
    question_statistics = serializers.DictField()
    student_statistics = serializers.DictField()
    testpaper_statistics = serializers.DictField(required=False, allow_null=True)


class StudentListSerializer(serializers.ModelSerializer):
    """
    Student list serializer for teachers.
    교사가 학생 목록을 조회할 때 사용하는 serializer.
    """

    student_name = serializers.CharField(source='studentsinfo.student_name', read_only=True)
    student_id = serializers.CharField(source='studentsinfo.student_id', read_only=True)
    student_class = serializers.CharField(source='studentsinfo.student_class', read_only=True)
    student_school = serializers.CharField(source='studentsinfo.student_school', read_only=True)
    studentsinfo_id = serializers.IntegerField(source='studentsinfo.id', read_only=True)

    class Meta:
        model = UserProfile
        fields = [
            'id', 'username', 'email', 'nick_name',
            'student_name', 'student_id', 'student_class', 'student_school', 'studentsinfo_id',
            'date_joined'
        ]
        read_only_fields = fields
