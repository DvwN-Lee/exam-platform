# =============================================================================
# GAR Module Variables
# =============================================================================

variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod, test)"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "prod", "test"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod, test."
  }
}

variable "repository_id" {
  description = "Repository ID suffix (will be prefixed with environment)"
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]*[a-z0-9]$", var.repository_id))
    error_message = "repository_id must start with a letter and contain only lowercase letters, numbers, and hyphens."
  }
}

variable "location" {
  description = "Repository location (region)"
  type        = string
  default     = "asia-northeast3"
}

variable "format" {
  description = "Repository format"
  type        = string
  default     = "DOCKER"

  validation {
    condition     = contains(["DOCKER", "MAVEN", "NPM", "PYTHON", "APT", "YUM", "GO"], var.format)
    error_message = "format must be one of: DOCKER, MAVEN, NPM, PYTHON, APT, YUM, GO."
  }
}

variable "mode" {
  description = "Repository mode"
  type        = string
  default     = "STANDARD_REPOSITORY"

  validation {
    condition     = contains(["STANDARD_REPOSITORY", "VIRTUAL_REPOSITORY", "REMOTE_REPOSITORY"], var.mode)
    error_message = "mode must be one of: STANDARD_REPOSITORY, VIRTUAL_REPOSITORY, REMOTE_REPOSITORY."
  }
}

variable "description" {
  description = "Repository description"
  type        = string
  default     = "Container image repository managed by Terraform"
}

variable "immutable_tags" {
  description = "Enable immutable tags for Docker repositories"
  type        = bool
  default     = false
}

variable "cleanup_policy_keep_count" {
  description = "Number of most recent versions to keep (0 to disable)"
  type        = number
  default     = 0

  validation {
    condition     = var.cleanup_policy_keep_count >= 0
    error_message = "cleanup_policy_keep_count must be 0 or positive."
  }
}

variable "cleanup_policy_delete_older_than_days" {
  description = "Delete versions older than this many days (0 to disable)"
  type        = number
  default     = 0

  validation {
    condition     = var.cleanup_policy_delete_older_than_days >= 0
    error_message = "cleanup_policy_delete_older_than_days must be 0 or positive."
  }
}

variable "reader_members" {
  description = "List of members with artifactregistry.reader role"
  type        = list(string)
  default     = []
}

variable "writer_members" {
  description = "List of members with artifactregistry.writer role"
  type        = list(string)
  default     = []
}

variable "labels" {
  description = "Additional labels to apply to the repository"
  type        = map(string)
  default     = {}
}
