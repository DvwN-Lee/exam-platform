# =============================================================================
# ArgoCD Applications and Projects - DEPRECATED
# =============================================================================
# 이 파일의 리소스는 GitOps(ArgoCD)로 이관되었습니다.
#
# App of Apps Pattern 적용:
# - ArgoCD Project: argocd/projects/exam-platform.yaml
# - ArgoCD Applications: argocd/applications/overlays/
# - ESO Add-on: argocd/add-ons/external-secrets/
#
# Root App만 Terraform에서 관리 (argocd.tf 참조)
# =============================================================================

# 기존 리소스 (제거됨):
# - kubernetes_manifest.argocd_project -> argocd/projects/exam-platform.yaml
# - kubernetes_manifest.argocd_app_staging -> argocd/applications/overlays/staging/
