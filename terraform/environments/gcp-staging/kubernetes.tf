# =============================================================================
# Kubernetes & Helm Provider Configuration
# =============================================================================

# GCP 인증 정보 가져오기
data "google_client_config" "default" {}

# Kubernetes Provider - GKE Cluster에 직접 연결
provider "kubernetes" {
  host                   = "https://${module.gke.cluster_endpoint}"
  token                  = data.google_client_config.default.access_token
  cluster_ca_certificate = base64decode(module.gke.cluster_ca_certificate)
}

# Helm Provider - GKE Cluster에 직접 연결
provider "helm" {
  kubernetes {
    host                   = "https://${module.gke.cluster_endpoint}"
    token                  = data.google_client_config.default.access_token
    cluster_ca_certificate = base64decode(module.gke.cluster_ca_certificate)
  }
}
