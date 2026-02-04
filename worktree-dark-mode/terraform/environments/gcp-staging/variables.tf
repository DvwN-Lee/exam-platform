# =============================================================================
# GCP Staging Environment - Variables
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
  default     = "staging"
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

variable "db_user" {
  description = "Database user name"
  type        = string
  default     = "examonline"
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
# Kubernetes
# -----------------------------------------------------------------------------
variable "k8s_namespace" {
  description = "Kubernetes namespace for application deployment"
  type        = string
  default     = "default"
}

variable "image_tag" {
  description = "Docker image tag for deployment"
  type        = string
  default     = "latest"
}

variable "staging_domain" {
  description = "Domain name for staging environment"
  type        = string
  default     = "staging.exam-platform.local"
}

# -----------------------------------------------------------------------------
# ArgoCD
# -----------------------------------------------------------------------------
variable "argocd_repo_ssh_key" {
  description = "SSH private key for ArgoCD repository access"
  type        = string
  sensitive   = true
}
