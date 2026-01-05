"""
Image file validators for Django models.

Provides validation for:
- File extension (jpg, jpeg, png, gif)
- File size (default 5MB limit)
- MIME type verification via magic numbers
"""

from django.core.exceptions import ValidationError
from django.core.validators import FileExtensionValidator
from django.utils.deconstruct import deconstructible
from django.utils.translation import gettext_lazy as _


ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif']
MAX_IMAGE_SIZE_MB = 5


@deconstructible
class ImageSizeValidator:
    """
    Validator to check file size does not exceed maximum limit.

    Args:
        max_size_mb: Maximum file size in megabytes (default: 5MB)
    """
    message = _('파일 크기가 %(max_size)s MB를 초과합니다. 현재 크기: %(actual_size).2f MB')
    code = 'file_too_large'

    def __init__(self, max_size_mb=MAX_IMAGE_SIZE_MB):
        self.max_size_bytes = max_size_mb * 1024 * 1024
        self.max_size_mb = max_size_mb

    def __call__(self, value):
        if value.size > self.max_size_bytes:
            raise ValidationError(
                self.message,
                code=self.code,
                params={
                    'max_size': self.max_size_mb,
                    'actual_size': value.size / (1024 * 1024)
                }
            )

    def __eq__(self, other):
        return (
            isinstance(other, self.__class__)
            and self.max_size_bytes == other.max_size_bytes
        )


@deconstructible
class ImageMimeTypeValidator:
    """
    Validator to verify actual file type using magic numbers.

    Checks the file header bytes to ensure the file is a valid image,
    preventing attacks where malicious files are disguised with image extensions.
    """
    message = _('허용되지 않는 이미지 형식입니다. 허용 형식: jpg, jpeg, png, gif')
    code = 'invalid_image_type'

    # Magic numbers for common image formats
    MAGIC_NUMBERS = {
        b'\xff\xd8\xff': 'jpeg',
        b'\x89PNG\r\n\x1a\n': 'png',
        b'GIF87a': 'gif',
        b'GIF89a': 'gif',
    }

    def __init__(self, allowed_types=None):
        self.allowed_types = allowed_types or ['jpeg', 'png', 'gif']

    def __call__(self, value):
        # Read file header
        value.seek(0)
        header = value.read(8)
        value.seek(0)  # Reset file pointer

        detected_type = None
        for magic, file_type in self.MAGIC_NUMBERS.items():
            if header.startswith(magic):
                detected_type = file_type
                break

        if detected_type is None or detected_type not in self.allowed_types:
            raise ValidationError(self.message, code=self.code)

    def __eq__(self, other):
        return (
            isinstance(other, self.__class__)
            and set(self.allowed_types) == set(getattr(other, 'allowed_types', []))
        )


# Pre-configured validator instances for convenience
validate_image_extension = FileExtensionValidator(
    allowed_extensions=ALLOWED_IMAGE_EXTENSIONS
)
validate_image_size = ImageSizeValidator()
validate_image_mime_type = ImageMimeTypeValidator()
