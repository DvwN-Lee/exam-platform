# =============================================================================
# GCP Production Environment - Variables
# =============================================================================

# -----------------------------------------------------------------------------
# General
# -----------------------------------------------------------------------------
variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "asia-northeast3"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "prod"
}

# -----------------------------------------------------------------------------
# Network
# -----------------------------------------------------------------------------
variable "network_name" {
  description = "VPC Network name"
  type        = string
  default     = "vpc"
}

variable "public_subnet_cidr" {
  description = "Public Subnet CIDR"
  type        = string
  default     = "10.1.1.0/24"
}

variable "private_subnet_cidr" {
  description = "Private Subnet CIDR"
  type        = string
  default     = "10.1.2.0/24"
}

variable "pods_cidr" {
  description = "GKE Pods CIDR (secondary range)"
  type        = string
  default     = "10.100.0.0/16"
}

variable "services_cidr" {
  description = "GKE Services CIDR (secondary range)"
  type        = string
  default     = "10.101.0.0/20"
}

# -----------------------------------------------------------------------------
# GKE
# -----------------------------------------------------------------------------
variable "cluster_name" {
  description = "GKE Cluster name"
  type        = string
  default     = "exam-cluster"
}

variable "node_machine_type" {
  description = "GKE Node machine type"
  type        = string
  default     = "e2-standard-2"
}

variable "initial_node_count" {
  description = "Initial node count per zone"
  type        = number
  default     = 2
}

variable "min_node_count" {
  description = "Minimum node count for autoscaling"
  type        = number
  default     = 2
}

variable "max_node_count" {
  description = "Maximum node count for autoscaling"
  type        = number
  default     = 5
}

# -----------------------------------------------------------------------------
# Cloud SQL
# -----------------------------------------------------------------------------
variable "db_instance_name" {
  description = "Cloud SQL instance name"
  type        = string
  default     = "exam-db"
}

variable "db_tier" {
  description = "Cloud SQL machine tier"
  type        = string
  default     = "db-g1-small"
}

variable "database_name" {
  description = "Database name"
  type        = string
  default     = "examonline"
}

variable "db_port" {
  description = "Database port"
  type        = string
  default     = "5432"
}

variable "db_availability_type" {
  description = "Cloud SQL availability type (ZONAL or REGIONAL)"
  type        = string
  default     = "REGIONAL"
}

variable "master_authorized_cidrs" {
  description = "GKE Master Authorized Networks에 추가할 CIDR 목록 (개발자 IP 등)"
  type = list(object({
    cidr_block   = string
    display_name = string
  }))
  default = []
}

# -----------------------------------------------------------------------------
# Memorystore (Redis)
# -----------------------------------------------------------------------------
variable "redis_instance_name" {
  description = "Memorystore Redis instance name"
  type        = string
  default     = "exam-redis"
}

variable "redis_memory_gb" {
  description = "Redis memory size in GB"
  type        = number
  default     = 2
}

# -----------------------------------------------------------------------------
# Storage
# -----------------------------------------------------------------------------
variable "storage_bucket_name" {
  description = "GCS Bucket name for assets"
  type        = string
  default     = "examonline-staging-assets"
}

# -----------------------------------------------------------------------------
# Artifact Registry
# -----------------------------------------------------------------------------
variable "registry_name" {
  description = "Artifact Registry repository name"
  type        = string
  default     = "exam-platform"
}

# -----------------------------------------------------------------------------
# ArgoCD
# -----------------------------------------------------------------------------
variable "argocd_chart_version" {
  description = "ArgoCD Helm chart version"
  type        = string
  default     = "5.51.6"
}

variable "github_repo_ssh_url" {
  description = "GitHub repository SSH URL for ArgoCD"
  type        = string
  default     = "git@github.com:DvwN-Lee/exam-platform.git"
}

# -----------------------------------------------------------------------------
# Cloud Build
# -----------------------------------------------------------------------------
variable "github_owner" {
  description = "GitHub repository owner"
  type        = string
  default     = "DvwN-Lee"
}

variable "github_repo" {
  description = "GitHub repository name"
  type        = string
  default     = "OnlineExam-v2"
}

variable "github_app_installation_id" {
  description = "GitHub App installation ID for Cloud Build 2nd gen connection"
  type        = number
}

variable "github_oauth_token_secret_version" {
  description = "Secret Manager secret version for GitHub OAuth token"
  type        = string
}

variable "vite_api_base_url" {
  description = "Frontend VITE_API_BASE_URL for Cloud Build substitution"
  type        = string
  default     = ""
}
