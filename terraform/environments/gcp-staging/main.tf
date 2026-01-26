# =============================================================================
# GCP Staging Environment - Main Configuration
# =============================================================================

terraform {
  required_version = ">= 1.0.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.24"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  backend "gcs" {
    bucket = "examonline-tf-state-titanium-k3s-20260123"
    prefix = "environments/staging"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# -----------------------------------------------------------------------------
# VPC Network
# -----------------------------------------------------------------------------
module "vpc" {
  source = "../../modules/gcp-vpc"

  project_id          = var.project_id
  region              = var.region
  environment         = var.environment
  network_name        = var.network_name
  public_subnet_cidr  = var.public_subnet_cidr
  private_subnet_cidr = var.private_subnet_cidr
  pods_cidr           = var.pods_cidr
  services_cidr       = var.services_cidr
}

# -----------------------------------------------------------------------------
# GKE Cluster
# -----------------------------------------------------------------------------
module "gke" {
  source = "../../modules/gke"

  project_id                    = var.project_id
  environment                   = var.environment
  cluster_name                  = var.cluster_name
  location                      = "${var.region}-a" # Zonal 클러스터 (SSD 할당량 제한 회피)
  network_id                    = module.vpc.network_id
  subnet_id                     = module.vpc.private_subnet_id
  pods_secondary_range_name     = module.vpc.pods_secondary_range_name
  services_secondary_range_name = module.vpc.services_secondary_range_name

  node_machine_type   = var.node_machine_type
  node_disk_type      = "pd-standard" # SSD 할당량 제한 회피
  initial_node_count  = var.initial_node_count
  min_node_count      = var.min_node_count
  max_node_count      = var.max_node_count
  deletion_protection = false # Staging

  # Master Authorized Networks - VPC Internal + 개발자 IP 허용
  master_authorized_networks = [
    {
      cidr_block   = var.private_subnet_cidr
      display_name = "VPC Private Subnet"
    },
    {
      cidr_block   = "221.153.70.15/32"
      display_name = "Developer Local"
    },
    {
      cidr_block   = "106.101.4.123/32"
      display_name = "Developer Previous"
    },
    {
      cidr_block   = "112.218.39.251/32"
      display_name = "Developer Current"
    }
  ]
}

# -----------------------------------------------------------------------------
# Cloud SQL (PostgreSQL)
# -----------------------------------------------------------------------------
module "cloudsql" {
  source = "../../modules/cloudsql"

  project_id          = var.project_id
  environment         = var.environment
  instance_name       = var.db_instance_name
  region              = var.region
  database_version    = "POSTGRES_16"
  tier                = var.db_tier
  network_id          = module.vpc.network_id
  database_name       = var.database_name
  deletion_protection = false # Staging
  ssl_mode            = "ENCRYPTED_ONLY" # SSL 암호화 필수

  # VPC Private Service Connection이 완료된 후 생성
  depends_on = [module.vpc]
}

# -----------------------------------------------------------------------------
# Memorystore (Redis)
# -----------------------------------------------------------------------------
module "memorystore" {
  source = "../../modules/memorystore"

  project_id     = var.project_id
  environment    = var.environment
  instance_name  = var.redis_instance_name
  region         = var.region
  tier           = "STANDARD_HA"
  memory_size_gb = var.redis_memory_gb
  network_id     = module.vpc.network_id
}

# -----------------------------------------------------------------------------
# Cloud Storage (Assets)
# -----------------------------------------------------------------------------
module "gcs" {
  source = "../../modules/gcs"

  project_id    = var.project_id
  environment   = var.environment
  bucket_name   = var.storage_bucket_name
  location      = "ASIA-NORTHEAST3"
  force_destroy = true # Staging
}

# -----------------------------------------------------------------------------
# Artifact Registry (Docker)
# -----------------------------------------------------------------------------
module "gar" {
  source = "../../modules/gar"

  project_id    = var.project_id
  environment   = var.environment
  repository_id = var.registry_name
  location      = var.region
}
