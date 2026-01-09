# =============================================================================
# Development Environment
# =============================================================================
# Minimal resources, single NAT, cost-optimized configuration

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
    key            = "environments/dev/terraform.tfstate"
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
  single_nat_gateway = true # Cost saving for dev

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

  # Minimal node configuration for dev
  node_instance_types = ["t3.medium"]
  node_desired_size   = 2
  node_min_size       = 1
  node_max_size       = 3
  capacity_type       = "ON_DEMAND"
  node_disk_size      = 30

  # Allow public access for development
  endpoint_public_access  = true
  endpoint_private_access = true
  public_access_cidrs     = ["0.0.0.0/0"]

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

  # Minimal instance for dev
  instance_class        = "db.t3.micro"
  allocated_storage     = 20
  max_allocated_storage = 50

  database_name   = var.database_name
  master_username = var.database_username

  # Network access from EKS
  allowed_security_group_ids = [module.eks.node_security_group_id]

  # Dev settings
  multi_az            = false
  skip_final_snapshot = true
  deletion_protection = false

  # Performance Insights (free tier)
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

  # Minimal instance for dev
  node_type          = "cache.t3.micro"
  num_cache_clusters = 1

  # No HA for dev
  automatic_failover_enabled = false
  multi_az_enabled           = false

  # Network access from EKS
  allowed_security_group_ids = [module.eks.node_security_group_id]

  # Dev settings
  skip_final_snapshot = true

  tags = local.common_tags
}

# -----------------------------------------------------------------------------
# S3 (Static Files)
# -----------------------------------------------------------------------------
module "s3_static" {
  source = "../../modules/s3"

  bucket_name        = "${var.project_name}-${var.environment}-static"
  versioning_enabled = false
  force_destroy      = true # Allow easy cleanup in dev

  # CORS for frontend
  cors_rules = [{
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = ["*"]
    max_age_seconds = 3600
  }]

  tags = local.common_tags
}

# -----------------------------------------------------------------------------
# ECR
# -----------------------------------------------------------------------------
module "ecr" {
  source = "../../modules/ecr"

  repository_names = [
    "${var.project_name}/backend",
    "${var.project_name}/frontend"
  ]

  scan_on_push    = true
  max_image_count = 10 # Keep fewer images in dev
  force_delete    = true

  tags = local.common_tags
}
