# =============================================================================
# ECR Module Variables
# =============================================================================

variable "repository_names" {
  description = "List of ECR repository names to create"
  type        = list(string)
  default     = ["backend", "frontend"]
}

variable "image_tag_mutability" {
  description = "Image tag mutability (MUTABLE or IMMUTABLE)"
  type        = string
  default     = "MUTABLE"

  validation {
    condition     = contains(["MUTABLE", "IMMUTABLE"], var.image_tag_mutability)
    error_message = "Image tag mutability must be MUTABLE or IMMUTABLE."
  }
}

variable "scan_on_push" {
  description = "Enable image scanning on push"
  type        = bool
  default     = true
}

variable "kms_key_arn" {
  description = "KMS key ARN for encryption (null for AES256)"
  type        = string
  default     = null
}

variable "force_delete" {
  description = "Allow repository deletion even with images"
  type        = bool
  default     = false
}

# Lifecycle Policy
variable "lifecycle_policy" {
  description = "Custom lifecycle policy JSON"
  type        = string
  default     = null
}

variable "max_image_count" {
  description = "Maximum number of images to keep (0 to disable default policy)"
  type        = number
  default     = 30
}

# Repository Policy
variable "repository_policy" {
  description = "Custom repository policy JSON"
  type        = string
  default     = null
}

variable "allowed_account_ids" {
  description = "List of AWS account IDs allowed to pull images"
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "Additional tags"
  type        = map(string)
  default     = {}
}
