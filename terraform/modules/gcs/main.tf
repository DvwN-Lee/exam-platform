# =============================================================================
# GCS (Google Cloud Storage) Module
# =============================================================================
# Creates Storage Bucket with lifecycle management and versioning

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
# Storage Bucket
# -----------------------------------------------------------------------------
resource "google_storage_bucket" "main" {
  name          = "${var.environment}-${var.bucket_name}"
  project       = var.project_id
  location      = var.location
  storage_class = var.storage_class
  force_destroy = var.force_destroy

  uniform_bucket_level_access = var.uniform_bucket_level_access

  versioning {
    enabled = var.versioning_enabled
  }

  dynamic "lifecycle_rule" {
    for_each = var.lifecycle_age_days > 0 ? [1] : []
    content {
      condition {
        age = var.lifecycle_age_days
      }
      action {
        type = "Delete"
      }
    }
  }

  dynamic "lifecycle_rule" {
    for_each = var.versioning_enabled && var.noncurrent_version_age_days > 0 ? [1] : []
    content {
      condition {
        num_newer_versions = var.noncurrent_version_count
        with_state         = "ARCHIVED"
      }
      action {
        type = "Delete"
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
resource "google_storage_bucket_iam_member" "viewers" {
  for_each = toset(var.viewer_members)

  bucket = google_storage_bucket.main.name
  role   = "roles/storage.objectViewer"
  member = each.value
}

resource "google_storage_bucket_iam_member" "admins" {
  for_each = toset(var.admin_members)

  bucket = google_storage_bucket.main.name
  role   = "roles/storage.objectAdmin"
  member = each.value
}
