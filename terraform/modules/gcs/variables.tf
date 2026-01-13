# =============================================================================
# GCS Module Variables
# =============================================================================

variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "bucket_name" {
  description = "Storage bucket name suffix (will be prefixed with environment)"
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]*[a-z0-9]$", var.bucket_name))
    error_message = "bucket_name must contain only lowercase letters, numbers, and hyphens."
  }
}

variable "location" {
  description = "Bucket location (region or multi-region)"
  type        = string
  default     = "ASIA-NORTHEAST3"
}

variable "storage_class" {
  description = "Storage class for the bucket"
  type        = string
  default     = "STANDARD"

  validation {
    condition     = contains(["STANDARD", "NEARLINE", "COLDLINE", "ARCHIVE"], var.storage_class)
    error_message = "storage_class must be one of: STANDARD, NEARLINE, COLDLINE, ARCHIVE."
  }
}

variable "versioning_enabled" {
  description = "Enable object versioning"
  type        = bool
  default     = true
}

variable "lifecycle_age_days" {
  description = "Age in days after which objects are deleted (0 to disable)"
  type        = number
  default     = 0

  validation {
    condition     = var.lifecycle_age_days >= 0
    error_message = "lifecycle_age_days must be 0 or positive."
  }
}

variable "noncurrent_version_age_days" {
  description = "Age in days after which noncurrent versions are deleted"
  type        = number
  default     = 30

  validation {
    condition     = var.noncurrent_version_age_days >= 0
    error_message = "noncurrent_version_age_days must be 0 or positive."
  }
}

variable "noncurrent_version_count" {
  description = "Number of newer versions before old versions are deleted"
  type        = number
  default     = 3

  validation {
    condition     = var.noncurrent_version_count >= 1
    error_message = "noncurrent_version_count must be at least 1."
  }
}

variable "force_destroy" {
  description = "Allow bucket deletion even if not empty"
  type        = bool
  default     = false
}

variable "uniform_bucket_level_access" {
  description = "Enable uniform bucket-level access"
  type        = bool
  default     = true
}

variable "viewer_members" {
  description = "List of members with objectViewer role"
  type        = list(string)
  default     = []
}

variable "admin_members" {
  description = "List of members with objectAdmin role"
  type        = list(string)
  default     = []
}

variable "labels" {
  description = "Additional labels to apply to the bucket"
  type        = map(string)
  default     = {}
}
