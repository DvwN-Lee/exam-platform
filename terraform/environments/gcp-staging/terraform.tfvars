# =============================================================================
# GCP Staging Environment - Terraform Variables
# =============================================================================

project_id  = "titanium-k3s-20260123"
region      = "asia-northeast3"
environment = "staging"

# -----------------------------------------------------------------------------
# Network
# -----------------------------------------------------------------------------
network_name        = "vpc"
public_subnet_cidr  = "10.1.1.0/24"
private_subnet_cidr = "10.1.2.0/24"
pods_cidr           = "10.100.0.0/16"
services_cidr       = "10.101.0.0/20"

# -----------------------------------------------------------------------------
# GKE
# -----------------------------------------------------------------------------
cluster_name       = "exam-cluster"
node_machine_type  = "e2-standard-2"
initial_node_count = 1
min_node_count     = 1
max_node_count     = 5

master_authorized_cidrs = [
  # Staging 환경에서는 관리자 IP를 환경 변수 또는 Secret Manager로 관리
]

# -----------------------------------------------------------------------------
# Cloud SQL
# -----------------------------------------------------------------------------
db_instance_name = "exam-db"
db_tier          = "db-g1-small"
database_name    = "examonline"

# -----------------------------------------------------------------------------
# Memorystore (Redis)
# -----------------------------------------------------------------------------
redis_instance_name = "exam-redis"
redis_memory_gb     = 2

# -----------------------------------------------------------------------------
# Storage
# -----------------------------------------------------------------------------
storage_bucket_name = "examonline-assets-titanium-k3s-20260123"

# -----------------------------------------------------------------------------
# Artifact Registry
# -----------------------------------------------------------------------------
registry_name = "exam-platform"

# -----------------------------------------------------------------------------
# Cloud Build
# -----------------------------------------------------------------------------
github_owner                      = "DvwN-Lee"
github_repo                       = "exam-platform"
github_app_installation_id        = 107266895
github_oauth_token_secret_version = "projects/titanium-k3s-20260123/secrets/staging-github-connection-github-oauthtoken-ee5ed5/versions/latest"
vite_api_base_url                 = ""