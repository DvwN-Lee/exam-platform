# =============================================================================
# Production Environment - Terraform Variables
# =============================================================================
# This file contains non-sensitive configuration values.
# Sensitive values should be passed via environment variables or secrets manager.
#
# IMPORTANT: Review and update allowed_cidrs before applying!

region       = "ap-northeast-2"
project_name = "examonline"
environment  = "prod"

# VPC (Different CIDR from dev/staging)
vpc_cidr = "10.2.0.0/16"

# EKS
eks_cluster_version = "1.29"

# Restrict EKS public access to specific IPs
# Update this with your organization's IP ranges
allowed_cidrs = [] # Empty means no public access - use VPN/private access

# Database
database_name     = "examonline"
database_username = "examuser"
