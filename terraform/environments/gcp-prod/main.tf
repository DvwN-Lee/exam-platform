# =============================================================================
# GCP Production Environment - Main Configuration
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
    kubectl = {
      source  = "gavinbunney/kubectl"
      version = "~> 1.14"
    }
    null = {
      source  = "hashicorp/null"
      version = "~> 3.2"
    }
  }

  backend "gcs" {
    bucket = "examonline-tf-state-titanium-k3s-20260123"
    prefix = "environments/prod"
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

  depends_on = [google_project_service.apis]
}

# -----------------------------------------------------------------------------
# GKE Cluster
# -----------------------------------------------------------------------------
module "gke" {
  source = "../../modules/gke"

  project_id                    = var.project_id
  environment                   = var.environment
  cluster_name                  = var.cluster_name
  location                      = "${var.region}-a"
  network_id                    = module.vpc.network_id
  subnet_id                     = module.vpc.private_subnet_id
  pods_secondary_range_name     = module.vpc.pods_secondary_range_name
  services_secondary_range_name = module.vpc.services_secondary_range_name

  node_machine_type   = var.node_machine_type
  initial_node_count  = var.initial_node_count
  min_node_count      = var.min_node_count
  max_node_count      = var.max_node_count
  deletion_protection = true # Production

  # Master Authorized Networks - VPC Internal + 추가 허용 CIDR
  master_authorized_networks = concat(
    [
      {
        cidr_block   = var.private_subnet_cidr
        display_name = "VPC Private Subnet"
      }
    ],
    var.master_authorized_cidrs
  )
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
  availability_type   = var.db_availability_type
  network_id          = module.vpc.network_id
  database_name       = var.database_name
  deletion_protection = true             # Production
  ssl_mode            = "ENCRYPTED_ONLY" # SSL 암호화 필수

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
  force_destroy = false # Production
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

# -----------------------------------------------------------------------------
# Cloud Build (CI - Docker Image Build)
# -----------------------------------------------------------------------------
module "cloud_build" {
  source = "../../modules/cloud-build"

  project_id                        = var.project_id
  region                            = var.region
  environment                       = var.environment
  registry_url                      = module.gar.repository_url
  github_owner                      = var.github_owner
  github_repo                       = var.github_repo
  branch                            = "release"
  github_app_installation_id        = var.github_app_installation_id
  github_oauth_token_secret_version = var.github_oauth_token_secret_version
  vite_api_base_url                 = var.vite_api_base_url
}
