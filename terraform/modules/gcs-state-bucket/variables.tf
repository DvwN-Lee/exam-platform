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
