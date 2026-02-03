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

# kubectl Provider - CRD 미설치 환경에서도 plan 가능
provider "kubectl" {
  host                   = "https://${module.gke.cluster_endpoint}"
  token                  = data.google_client_config.default.access_token
  cluster_ca_certificate = base64decode(module.gke.cluster_ca_certificate)
  load_config_file       = false
}

# =============================================================================
# NGINX Ingress Controller
# =============================================================================

# Static IP 예약 - Ingress Controller LoadBalancer에 바인딩
resource "google_compute_address" "ingress_ip" {
  name         = "${var.environment}-ingress-ip"
  region       = var.region
  address_type = "EXTERNAL"
  description  = "Static IP for NGINX Ingress Controller (${var.environment})"

  depends_on = [google_project_service.apis]
}

resource "helm_release" "ingress_nginx" {
  name             = "ingress-nginx"
  repository       = "https://kubernetes.github.io/ingress-nginx"
  chart            = "ingress-nginx"
  version          = "4.14.2"
  namespace        = "ingress-nginx"
  create_namespace = true

  set {
    name  = "controller.service.type"
    value = "LoadBalancer"
  }

  set {
    name  = "controller.service.loadBalancerIP"
    value = google_compute_address.ingress_ip.address
  }

  set {
    name  = "controller.ingressClassResource.default"
    value = "true"
  }

  depends_on = [module.gke]
}
