# =============================================================================
# GAR (Google Artifact Registry) Module
# =============================================================================
# Creates Artifact Registry repository for container images

terraform {
  required_version = ">= 1.0.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

# -----------------------------------------------------------------------------
# Artifact Registry Repository
# -----------------------------------------------------------------------------
resource "google_artifact_registry_repository" "main" {
  project       = var.project_id
  location      = var.location
  repository_id = "${var.environment}-${var.repository_id}"
  format        = var.format
  mode          = var.mode
  description   = var.description

  docker_config {
    immutable_tags = var.immutable_tags
  }

  dynamic "cleanup_policies" {
    for_each = var.cleanup_policy_keep_count > 0 ? [1] : []
    content {
      id     = "keep-minimum-versions"
      action = "KEEP"
      most_recent_versions {
        keep_count = var.cleanup_policy_keep_count
      }
    }
  }

  dynamic "cleanup_policies" {
    for_each = var.cleanup_policy_delete_older_than_days > 0 ? [1] : []
    content {
      id     = "delete-old-versions"
      action = "DELETE"
      condition {
        older_than = "${var.cleanup_policy_delete_older_than_days * 24 * 60 * 60}s"
      }
    }
  }

  labels = merge(
    {
      environment = var.environment
      managed_by  = "terraform"
    },
    var.labels
  )
}

# -----------------------------------------------------------------------------
# IAM Bindings (Optional)
# -----------------------------------------------------------------------------
resource "google_artifact_registry_repository_iam_member" "readers" {
  for_each = toset(var.reader_members)

  project    = var.project_id
  location   = var.location
  repository = google_artifact_registry_repository.main.name
  role       = "roles/artifactregistry.reader"
  member     = each.value
}

resource "google_artifact_registry_repository_iam_member" "writers" {
  for_each = toset(var.writer_members)

  project    = var.project_id
  location   = var.location
  repository = google_artifact_registry_repository.main.name
  role       = "roles/artifactregistry.writer"
  member     = each.value
}
