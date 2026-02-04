# =============================================================================
# Production Environment
# =============================================================================
# High availability, Multi-AZ, production-grade configuration

terraform {
  required_version = ">= 1.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "examonline-terraform-state"
    key            = "environments/prod/terraform.tfstate"
    region         = "ap-northeast-2"
    dynamodb_table = "examonline-terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# -----------------------------------------------------------------------------
# Local Variables
# -----------------------------------------------------------------------------
locals {
  cluster_name = "${var.project_name}-${var.environment}"

  common_tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

# -----------------------------------------------------------------------------
# VPC
# -----------------------------------------------------------------------------
module "vpc" {
  source = "../../modules/vpc"

  environment        = var.environment
  vpc_cidr           = var.vpc_cidr
  az_count           = 3 # 3 AZs for production
  cluster_name       = local.cluster_name
  enable_nat_gateway = true
  single_nat_gateway = false # NAT per AZ for HA

  tags = local.common_tags
}

# -----------------------------------------------------------------------------
# EKS
# -----------------------------------------------------------------------------
module "eks" {
  source = "../../modules/eks"

  environment     = var.environment
  cluster_name    = local.cluster_name
  cluster_version = var.eks_cluster_version

  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnet_ids
  node_subnet_ids = module.vpc.private_subnet_ids

  # Production node configuration
  node_instance_types = ["t3.xlarge", "t3.large"] # Mixed instance types
  node_desired_size   = 3
  node_min_size       = 3
  node_max_size       = 10
  capacity_type       = "ON_DEMAND"
  node_disk_size      = 100

  # Production: Private only or restricted public access
  endpoint_public_access  = true
  endpoint_private_access = true
  public_access_cidrs     = var.allowed_cidrs

  # Enable all cluster logging
  enabled_cluster_log_types = ["api", "audit", "authenticator", "controllerManager", "scheduler"]

  tags = local.common_tags
}

# -----------------------------------------------------------------------------
# RDS (PostgreSQL)
# -----------------------------------------------------------------------------
module "rds" {
  source = "../../modules/rds"

  identifier           = "${var.project_name}-${var.environment}-postgres"
  vpc_id               = module.vpc.vpc_id
  db_subnet_group_name = module.vpc.db_subnet_group_name

  # Production instance
  instance_class        = "db.t3.medium"
  allocated_storage     = 100
  max_allocated_storage = 500

  database_name   = var.database_name
  master_username = var.database_username

  # Network access from EKS
  allowed_security_group_ids = [module.eks.node_security_group_id]

  # Production settings
  multi_az            = true
  skip_final_snapshot = false
  deletion_protection = true
  apply_immediately   = false

  # Backup
  backup_retention_period = 30
  backup_window           = "02:00-03:00"
  maintenance_window      = "Mon:03:00-Mon:04:00"

  # Performance Insights (extended retention)
  performance_insights_enabled          = true
  performance_insights_retention_period = 731 # 2 years

  # CloudWatch logs
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  tags = local.common_tags
}

# -----------------------------------------------------------------------------
# ElastiCache (Redis)
# -----------------------------------------------------------------------------
module "elasticache" {
  source = "../../modules/elasticache"

  cluster_id        = "${var.project_name}-${var.environment}-redis"
  vpc_id            = module.vpc.vpc_id
  subnet_group_name = module.vpc.elasticache_subnet_group_name

  # Production instance
  node_type          = "cache.t3.medium"
  num_cache_clusters = 3 # 3 nodes for HA

  # HA enabled
  automatic_failover_enabled = true
  multi_az_enabled           = true

  # Network access from EKS
  allowed_security_group_ids = [module.eks.node_security_group_id]

  # Production settings
  skip_final_snapshot      = false
  snapshot_retention_limit = 30
  maintenance_window       = "mon:03:00-mon:04:00"
  snapshot_window          = "02:00-03:00"

  tags = local.common_tags
}

# -----------------------------------------------------------------------------
# S3 (Static Files)
# -----------------------------------------------------------------------------
module "s3_static" {
  source = "../../modules/s3"

  bucket_name        = "${var.project_name}-${var.environment}-static"
  versioning_enabled = true
  force_destroy      = false

  # CORS for frontend
  cors_rules = [{
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = ["https://exam.example.com"]
    max_age_seconds = 86400
  }]

  # Lifecycle rules
  lifecycle_rules = [{
    id      = "transition-to-ia"
    enabled = true
    transitions = [{
      days          = 90
      storage_class = "STANDARD_IA"
    }]
    noncurrent_version_expiration_days = 90
  }]

  # CloudFront integration
  create_cloudfront_oai = true

  tags = local.common_tags
}

# -----------------------------------------------------------------------------
# S3 (Backups)
# -----------------------------------------------------------------------------
module "s3_backups" {
  source = "../../modules/s3"

  bucket_name        = "${var.project_name}-${var.environment}-backups"
  versioning_enabled = true
  force_destroy      = false

  # Lifecycle rules for cost optimization
  lifecycle_rules = [{
    id      = "archive-old-backups"
    enabled = true
    transitions = [
      {
        days          = 30
        storage_class = "STANDARD_IA"
      },
      {
        days          = 90
        storage_class = "GLACIER"
      }
    ]
    expiration_days = 365
  }]

  tags = local.common_tags
}

# -----------------------------------------------------------------------------
# ECR (Shared across environments)
# -----------------------------------------------------------------------------
# ECR repositories are typically shared across environments
# Reference the same repositories created elsewhere
