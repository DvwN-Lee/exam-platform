# =============================================================================
# Staging Environment - Terraform Variables
# =============================================================================
# This file contains non-sensitive configuration values.
# Sensitive values should be passed via environment variables or secrets manager.

region       = "ap-northeast-2"
project_name = "examonline"
environment  = "staging"

# VPC (Different CIDR from dev to avoid conflicts if peering)
vpc_cidr = "10.1.0.0/16"

# EKS
eks_cluster_version = "1.29"

# Restrict EKS public access (update with actual IP ranges)
allowed_cidrs = ["0.0.0.0/0"]

# Database
database_name     = "examonline"
database_username = "examuser"
