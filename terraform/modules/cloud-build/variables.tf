# =============================================================================
# Cloud Build Module - Variables
# =============================================================================

variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g. staging, production)"
  type        = string
}

variable "registry_url" {
  description = "Artifact Registry URL (e.g. asia-northeast3-docker.pkg.dev/project/repo)"
  type        = string
}

variable "github_owner" {
  description = "GitHub repository owner"
  type        = string
}

variable "github_repo" {
  description = "GitHub repository name"
  type        = string
}

variable "branch" {
  description = "Branch name to trigger builds"
  type        = string
  default     = "main"
}

variable "github_app_installation_id" {
  description = "GitHub App installation ID (Cloud Build 2nd gen connection)"
  type        = number
}

variable "github_oauth_token_secret_version" {
  description = "Secret Manager secret version for GitHub OAuth token"
  type        = string
}

variable "vite_api_base_url" {
  description = "Frontend VITE_API_BASE_URL substitution value"
  type        = string
  default     = ""
}
