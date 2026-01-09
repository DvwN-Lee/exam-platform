# =============================================================================
# Staging Environment
# =============================================================================
# Production-like configuration with reduced resources

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
    key            = "environments/staging/terraform.tfstate"
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
  az_count           = 2
  cluster_name       = local.cluster_name
  enable_nat_gateway = true
  single_nat_gateway = true # Still single NAT for staging

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

  # Medium-sized nodes for staging
  node_instance_types = ["t3.large"]
  node_desired_size   = 2
  node_min_size       = 2
  node_max_size       = 5
  capacity_type       = "ON_DEMAND"
  node_disk_size      = 50

  # Restricted public access
  endpoint_public_access  = true
  endpoint_private_access = true
  public_access_cidrs     = var.allowed_cidrs

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

  # Medium instance for staging
  instance_class        = "db.t3.small"
  allocated_storage     = 50
  max_allocated_storage = 100

  database_name   = var.database_name
  master_username = var.database_username

  # Network access from EKS
  allowed_security_group_ids = [module.eks.node_security_group_id]

  # Staging settings
  multi_az            = false
  skip_final_snapshot = false
  deletion_protection = true

  # Backup
  backup_retention_period = 7

  # Performance Insights
  performance_insights_enabled          = true
  performance_insights_retention_period = 7

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

  # Medium instance for staging
  node_type          = "cache.t3.small"
  num_cache_clusters = 2

  # HA for staging
  automatic_failover_enabled = true
  multi_az_enabled           = true

  # Network access from EKS
  allowed_security_group_ids = [module.eks.node_security_group_id]

  # Staging settings
  skip_final_snapshot      = false
  snapshot_retention_limit = 7

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
    allowed_origins = ["https://staging.exam.example.com"]
    max_age_seconds = 3600
  }]

  # Lifecycle rules
  lifecycle_rules = [{
    id                                 = "cleanup-old-versions"
    enabled                            = true
    noncurrent_version_expiration_days = 30
  }]

  tags = local.common_tags
}

# -----------------------------------------------------------------------------
# ECR (Shared with dev, just reference)
# -----------------------------------------------------------------------------
# ECR repositories are shared across environments
# Use the same repositories created in dev environment
