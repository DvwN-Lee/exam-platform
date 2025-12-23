"""
Examination API URL configuration.
"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from examination.api.views import ExaminationViewSet
from examination.api.taking_views import ExamTakingViewSet

router = DefaultRouter()
router.register(r'examinations', ExaminationViewSet, basename='examination')
router.register(r'exams', ExamTakingViewSet, basename='exam')
router.register(r'submissions', ExamTakingViewSet, basename='submission')

urlpatterns = [
    path('', include(router.urls)),
]
