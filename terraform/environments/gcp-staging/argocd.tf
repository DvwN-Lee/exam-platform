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
  version    = var.argocd_chart_version
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

# -----------------------------------------------------------------------------
# Root Application (App of Apps Pattern)
# -----------------------------------------------------------------------------
# Terraform이 관리하는 유일한 ArgoCD Application.
# 나머지 Application, Project, Add-on은 Git 리포지토리에서 관리되며,
# Root App이 이를 자동으로 동기화함.
# -----------------------------------------------------------------------------
resource "kubernetes_manifest" "root_app" {
  manifest = {
    apiVersion = "argoproj.io/v1alpha1"
    kind       = "Application"
    metadata = {
      name      = "root-app"
      namespace = kubernetes_namespace.argocd.metadata[0].name
      labels = {
        "app.kubernetes.io/name"      = "root-app"
        "app.kubernetes.io/component" = "bootstrap"
      }
      finalizers = [
        "resources-finalizer.argocd.argoproj.io"
      ]
    }
    spec = {
      project = "default"

      source = {
        repoURL        = var.github_repo_ssh_url
        targetRevision = "main"
        path           = "argocd"
        directory = {
          recurse = true
          include = "{generated/*.yaml,projects/*.yaml}"
        }
      }

      destination = {
        server    = "https://kubernetes.default.svc"
        namespace = "argocd"
      }

      syncPolicy = {
        automated = {
          prune      = true
          selfHeal   = true
          allowEmpty = false
        }
        syncOptions = [
          "CreateNamespace=false",
          "PrunePropagationPolicy=foreground"
        ]
        retry = {
          limit = 5
          backoff = {
            duration    = "5s"
            factor      = 2
            maxDuration = "3m"
          }
        }
      }

      revisionHistoryLimit = 5
    }
  }

  depends_on = [helm_release.argocd]
}

# -----------------------------------------------------------------------------
# ArgoCD Repository Credentials (SSH Deploy Key)
# -----------------------------------------------------------------------------
resource "kubernetes_secret" "argocd_repo_creds" {
  metadata {
    name      = "repo-exam-platform"
    namespace = kubernetes_namespace.argocd.metadata[0].name
    labels = {
      "argocd.argoproj.io/secret-type" = "repository"
    }
  }

  data = {
    type          = "git"
    url           = var.github_repo_ssh_url
    sshPrivateKey = var.argocd_repo_ssh_key
  }

  type = "Opaque"

  depends_on = [helm_release.argocd]
}
