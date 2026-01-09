# =============================================================================
# Development Environment - Terraform Variables
# =============================================================================
# This file contains non-sensitive configuration values.
# Sensitive values should be passed via environment variables or secrets manager.

region       = "ap-northeast-2"
project_name = "examonline"
environment  = "dev"

# VPC
vpc_cidr = "10.0.0.0/16"

# EKS
eks_cluster_version = "1.29"

# Database
database_name     = "examonline"
database_username = "examuser"
