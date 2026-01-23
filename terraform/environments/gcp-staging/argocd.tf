# =============================================================================
# ArgoCD Installation via Helm
# =============================================================================

# -----------------------------------------------------------------------------
# ArgoCD Namespace
# -----------------------------------------------------------------------------
resource "kubernetes_namespace" "argocd" {
  metadata {
    name = "argocd"
  }

  depends_on = [module.gke]
}

# -----------------------------------------------------------------------------
# ArgoCD Helm Release
# -----------------------------------------------------------------------------
resource "helm_release" "argocd" {
  name       = "argocd"
  repository = "https://argoproj.github.io/argo-helm"
  chart      = "argo-cd"
  version    = "5.51.6"
  namespace  = kubernetes_namespace.argocd.metadata[0].name

  values = [
    file("${path.module}/../../../argocd/install/values.yaml")
  ]

  # Helm Release 설정
  wait             = true
  timeout          = 600 # 10분
  create_namespace = false

  depends_on = [kubernetes_namespace.argocd]
}

# -----------------------------------------------------------------------------
# ArgoCD Admin Password Secret (initial setup only)
# -----------------------------------------------------------------------------
resource "kubernetes_secret" "argocd_admin_password" {
  metadata {
    name      = "argocd-initial-admin-secret"
    namespace = kubernetes_namespace.argocd.metadata[0].name
  }

  data = {
    password = bcrypt(random_password.argocd_admin_password.result)
  }

  type = "Opaque"

  depends_on = [kubernetes_namespace.argocd]

  lifecycle {
    ignore_changes = [data]
  }
}

resource "random_password" "argocd_admin_password" {
  length  = 16
  special = true
}
