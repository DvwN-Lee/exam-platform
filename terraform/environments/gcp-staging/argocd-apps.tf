# =============================================================================
# ArgoCD Applications and Projects
# =============================================================================

# -----------------------------------------------------------------------------
# AppProject for Exam Platform
# -----------------------------------------------------------------------------
resource "kubernetes_manifest" "argocd_project" {
  manifest = {
    apiVersion = "argoproj.io/v1alpha1"
    kind       = "AppProject"
    metadata = {
      name      = "exam-platform"
      namespace = kubernetes_namespace.argocd.metadata[0].name
      finalizers = [
        "resources-finalizer.argocd.argoproj.io"
      ]
    }
    spec = {
      description = "Online Exam Platform Project"

      sourceRepos = [
        "https://github.com/DvwN-Lee/exam-platform.git"
      ]

      destinations = [
        {
          namespace = "exam-dev"
          server    = "https://kubernetes.default.svc"
        },
        {
          namespace = "exam-staging"
          server    = "https://kubernetes.default.svc"
        },
        {
          namespace = "exam-prod"
          server    = "https://kubernetes.default.svc"
        }
      ]

      clusterResourceWhitelist = [
        {
          group = ""
          kind  = "Namespace"
        }
      ]

      namespaceResourceWhitelist = [
        {
          group = ""
          kind  = "ConfigMap"
        },
        {
          group = ""
          kind  = "Secret"
        },
        {
          group = ""
          kind  = "Service"
        },
        {
          group = ""
          kind  = "ServiceAccount"
        },
        {
          group = "apps"
          kind  = "Deployment"
        },
        {
          group = "autoscaling"
          kind  = "HorizontalPodAutoscaler"
        },
        {
          group = "networking.k8s.io"
          kind  = "Ingress"
        },
        {
          group = "policy"
          kind  = "PodDisruptionBudget"
        },
        {
          group = "external-secrets.io"
          kind  = "ExternalSecret"
        }
      ]

      namespaceResourceBlacklist = [
        {
          group = ""
          kind  = "ResourceQuota"
        },
        {
          group = ""
          kind  = "LimitRange"
        }
      ]

      roles = [
        {
          name        = "admin"
          description = "Full access to exam-platform project"
          policies = [
            "p, proj:exam-platform:admin, applications, *, exam-platform/*, allow",
            "p, proj:exam-platform:admin, repositories, *, exam-platform/*, allow"
          ]
          groups = ["exam-platform-admins"]
        },
        {
          name        = "developer"
          description = "Developer access - can sync dev/staging"
          policies = [
            "p, proj:exam-platform:developer, applications, get, exam-platform/*, allow",
            "p, proj:exam-platform:developer, applications, sync, exam-platform/exam-dev, allow",
            "p, proj:exam-platform:developer, applications, sync, exam-platform/exam-staging, allow"
          ]
          groups = ["exam-platform-developers"]
        },
        {
          name        = "viewer"
          description = "Read-only access"
          policies = [
            "p, proj:exam-platform:viewer, applications, get, exam-platform/*, allow"
          ]
          groups = ["exam-platform-viewers"]
        }
      ]

      orphanedResources = {
        warn = true
      }
    }
  }

  depends_on = [helm_release.argocd]
}

# -----------------------------------------------------------------------------
# Staging Application
# -----------------------------------------------------------------------------
resource "kubernetes_manifest" "argocd_app_staging" {
  manifest = {
    apiVersion = "argoproj.io/v1alpha1"
    kind       = "Application"
    metadata = {
      name      = "exam-staging"
      namespace = kubernetes_namespace.argocd.metadata[0].name
      labels = {
        "app.kubernetes.io/name"     = "exam-platform"
        "app.kubernetes.io/instance" = "staging"
        environment                  = "staging"
      }
      annotations = {
        "notifications.argoproj.io/subscribe.on-deployed.slack"    = "exam-deployments"
        "notifications.argoproj.io/subscribe.on-sync-failed.slack" = "exam-alerts"
      }
      finalizers = [
        "resources-finalizer.argocd.argoproj.io"
      ]
    }
    spec = {
      project = "exam-platform"

      source = {
        repoURL        = "https://github.com/DvwN-Lee/exam-platform.git"
        targetRevision = "main"
        path           = "charts/exam-platform"
        helm = {
          valueFiles = [
            "values-staging.yaml"
          ]
          parameters = [
            {
              name  = "backend.image.repository"
              value = "${module.gar.repository_url}/backend"
            },
            {
              name  = "frontend.image.repository"
              value = "${module.gar.repository_url}/frontend"
            }
          ]
        }
      }

      destination = {
        server    = "https://kubernetes.default.svc"
        namespace = "exam-staging"
      }

      syncPolicy = {
        automated = {
          prune      = true
          selfHeal   = true
          allowEmpty = false
        }
        syncOptions = [
          "CreateNamespace=true",
          "PrunePropagationPolicy=foreground",
          "ApplyOutOfSyncOnly=true"
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

      revisionHistoryLimit = 10
    }
  }

  depends_on = [
    kubernetes_manifest.argocd_project,
    kubernetes_manifest.cluster_secret_store
  ]
}
