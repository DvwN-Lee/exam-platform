# =============================================================================
# External Secrets Operator Installation via Helm
# =============================================================================

# -----------------------------------------------------------------------------
# External Secrets Namespace
# -----------------------------------------------------------------------------
resource "kubernetes_namespace" "external_secrets" {
  metadata {
    name = "external-secrets"
  }

  depends_on = [module.gke]
}

# -----------------------------------------------------------------------------
# External Secrets Operator Helm Release
# -----------------------------------------------------------------------------
resource "helm_release" "external_secrets" {
  name       = "external-secrets"
  repository = "https://charts.external-secrets.io"
  chart      = "external-secrets"
  version    = "0.9.11"
  namespace  = kubernetes_namespace.external_secrets.metadata[0].name

  set {
    name  = "serviceAccount.annotations.iam\\.gke\\.io/gcp-service-account"
    value = google_service_account.external_secrets.email
  }

  # Helm Release 설정
  wait             = true
  timeout          = 600 # 10분
  create_namespace = false

  depends_on = [
    kubernetes_namespace.external_secrets,
    google_service_account.external_secrets,
    google_service_account_iam_member.workload_identity_binding
  ]
}

# -----------------------------------------------------------------------------
# ClusterSecretStore for Google Secret Manager
# -----------------------------------------------------------------------------
resource "kubernetes_manifest" "cluster_secret_store" {
  manifest = {
    apiVersion = "external-secrets.io/v1beta1"
    kind       = "ClusterSecretStore"
    metadata = {
      name = "gcp-secret-manager"
    }
    spec = {
      provider = {
        gcpsm = {
          projectID = var.project_id
          auth = {
            workloadIdentity = {
              clusterLocation = var.region
              clusterName     = module.gke.cluster_name
              serviceAccountRef = {
                name      = "external-secrets"
                namespace = kubernetes_namespace.external_secrets.metadata[0].name
              }
            }
          }
        }
      }
    }
  }

  depends_on = [helm_release.external_secrets]
}
