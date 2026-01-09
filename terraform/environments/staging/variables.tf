# =============================================================================
# Staging Environment Variables
# =============================================================================

variable "region" {
  description = "AWS region"
  type        = string
  default     = "ap-northeast-2"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "examonline"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "staging"
}

# VPC
variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.1.0.0/16"
}

# EKS
variable "eks_cluster_version" {
  description = "EKS cluster version"
  type        = string
  default     = "1.29"
}

variable "allowed_cidrs" {
  description = "Allowed CIDR blocks for EKS public access"
  type        = list(string)
  default     = ["0.0.0.0/0"] # Should be restricted in actual staging
}

# RDS
variable "database_name" {
  description = "Database name"
  type        = string
  default     = "examonline"
}

variable "database_username" {
  description = "Database master username"
  type        = string
  default     = "examuser"
}
