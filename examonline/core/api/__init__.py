"""
Core API utilities.
"""

from core.api.exceptions import custom_exception_handler
from core.api.fields import XSSSanitizedCharField
from core.api.pagination import StandardResultsSetPagination
from core.api.permissions import IsStudent, IsTeacher

__all__ = [
    "IsTeacher",
    "IsStudent",
    "StandardResultsSetPagination",
    "custom_exception_handler",
    "XSSSanitizedCharField",
]
