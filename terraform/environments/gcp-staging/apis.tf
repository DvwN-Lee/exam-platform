# =============================================================================
# GCP API Activation
# =============================================================================
# 01-prerequisites.sh에서 수동으로 활성화하던 API를 Terraform으로 관리한다.
# disable_on_destroy = false: terraform destroy 시 API를 비활성화하지 않는다.
# =============================================================================

locals {
  required_apis = [
    "compute.googleapis.com",
    "container.googleapis.com",
    "sqladmin.googleapis.com",
    "redis.googleapis.com",
    "artifactregistry.googleapis.com",
    "servicenetworking.googleapis.com",
    "secretmanager.googleapis.com",
    "cloudbuild.googleapis.com",
    "iam.googleapis.com",
  ]
}

resource "google_project_service" "apis" {
  for_each = toset(local.required_apis)

  project = var.project_id
  service = each.value

  disable_on_destroy = false
}
