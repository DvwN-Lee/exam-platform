# =============================================================================
# External Secrets Operator - DEPRECATED
# =============================================================================
# ESO 설치는 ArgoCD로 이관되었습니다.
# 관련 파일: argocd/add-ons/external-secrets/
#
# Terraform이 관리하는 리소스 (workload-identity.tf):
# - google_service_account.external_secrets
# - google_project_iam_member.external_secrets_accessor
# - google_service_account_iam_member.workload_identity_binding
#
# ArgoCD가 관리하는 리소스:
# - Kubernetes Namespace (external-secrets)
# - Helm Release (external-secrets)
# - ClusterSecretStore (gcp-secret-manager)
# =============================================================================

# 기존 리소스 (ArgoCD로 이관됨):
# - kubernetes_namespace.external_secrets -> CreateNamespace=true (ArgoCD syncOption)
# - helm_release.external_secrets -> argocd/add-ons/external-secrets/application.yaml
# - kubernetes_manifest.cluster_secret_store -> argocd/add-ons/external-secrets/cluster-secret-store.yaml
