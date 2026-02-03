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

  timeouts {
    delete = "10m"
  }
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
# ArgoCD Finalizer Cleanup (Destroy 시 Namespace Deadlock 방지)
# -----------------------------------------------------------------------------
# terraform destroy 시 ArgoCD Application/AppProject의 Finalizer가
# Namespace 삭제를 차단하는 문제를 자동으로 해결한다.
# depends_on으로 helm_release.argocd에 연결되어 있으므로,
# Destroy 순서: root_app -> cleanup_argocd_finalizers -> helm_release -> namespace
# -----------------------------------------------------------------------------
resource "null_resource" "cleanup_argocd_finalizers" {
  triggers = {
    cluster_name = module.gke.cluster_name
    zone         = "${var.region}-a"
    project_id   = var.project_id
  }

  provisioner "local-exec" {
    when    = destroy
    command = <<-EOT
      gcloud container clusters get-credentials ${self.triggers.cluster_name} \
        --zone ${self.triggers.zone} \
        --project ${self.triggers.project_id} --quiet 2>/dev/null

      if kubectl get ns argocd 2>/dev/null; then
        echo "Removing ArgoCD Application Finalizers..."
        kubectl get applications -n argocd -o name 2>/dev/null | \
          xargs -r kubectl patch -n argocd --type json \
          -p '[{"op":"remove","path":"/metadata/finalizers"}]' 2>/dev/null || true

        echo "Removing ArgoCD AppProject Finalizers..."
        kubectl get appprojects -n argocd -o name 2>/dev/null | \
          xargs -r kubectl patch -n argocd --type json \
          -p '[{"op":"remove","path":"/metadata/finalizers"}]' 2>/dev/null || true
      fi
    EOT
    on_failure = continue
  }

  depends_on = [helm_release.argocd]
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
resource "kubectl_manifest" "root_app" {
  yaml_body = <<-YAML
    apiVersion: argoproj.io/v1alpha1
    kind: Application
    metadata:
      name: root-app
      namespace: ${kubernetes_namespace.argocd.metadata[0].name}
      labels:
        app.kubernetes.io/name: root-app
        app.kubernetes.io/component: bootstrap
      finalizers:
        - resources-finalizer.argocd.argoproj.io
    spec:
      project: default
      source:
        repoURL: ${var.github_repo_ssh_url}
        targetRevision: release
        path: argocd
        directory:
          recurse: true
          include: "{generated/*.yaml,projects/*.yaml}"
      destination:
        server: https://kubernetes.default.svc
        namespace: argocd
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
          allowEmpty: false
        syncOptions:
          - CreateNamespace=false
          - PrunePropagationPolicy=foreground
        retry:
          limit: 5
          backoff:
            duration: "5s"
            factor: 2
            maxDuration: "3m"
      revisionHistoryLimit: 5
  YAML

  depends_on = [helm_release.argocd]
}

# -----------------------------------------------------------------------------
# ArgoCD Repository SSH Key (from GCP Secret Manager)
# -----------------------------------------------------------------------------
data "google_secret_manager_secret_version" "argocd_repo_ssh_key" {
  secret  = "argocd-repo-ssh-key"
  project = var.project_id
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
    sshPrivateKey = data.google_secret_manager_secret_version.argocd_repo_ssh_key.secret_data
  }

  type = "Opaque"

  depends_on = [helm_release.argocd]
}
