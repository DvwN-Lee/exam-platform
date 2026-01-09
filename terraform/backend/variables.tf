# =============================================================================
# Variables for Remote State Backend
# =============================================================================

variable "region" {
  description = "AWS region for the state backend resources"
  type        = string
  default     = "ap-northeast-2"
}

variable "state_bucket_name" {
  description = "Name of the S3 bucket for Terraform state storage"
  type        = string
  default     = "examonline-terraform-state"

  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$", var.state_bucket_name))
    error_message = "Bucket name must be valid S3 bucket name (3-63 characters, lowercase, numbers, hyphens, periods)."
  }
}

variable "lock_table_name" {
  description = "Name of the DynamoDB table for state locking"
  type        = string
  default     = "examonline-terraform-locks"

  validation {
    condition     = can(regex("^[a-zA-Z0-9_.-]{3,255}$", var.lock_table_name))
    error_message = "Table name must be valid DynamoDB table name (3-255 characters)."
  }
}
