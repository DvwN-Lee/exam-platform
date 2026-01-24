variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g., staging, production)"
  type        = string
}

variable "location" {
  description = "GCS bucket location"
  type        = string
  default     = "asia-northeast3"
}

variable "bucket_name" {
  description = "Override bucket name. If not provided, uses '{project_id}-tf-state-{environment}'"
  type        = string
  default     = null
}
