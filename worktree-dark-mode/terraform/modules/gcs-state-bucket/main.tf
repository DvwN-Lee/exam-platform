resource "google_storage_bucket" "state" {
  name          = coalesce(var.bucket_name, "${var.project_id}-tf-state-${var.environment}")
  project       = var.project_id
  location      = var.location
  force_destroy = false # State 손실 방지

  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }

  lifecycle_rule {
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }
    condition {
      age                = 90
      num_newer_versions = 10
    }
  }

  labels = {
    environment = var.environment
    managed_by  = "terraform"
    purpose     = "terraform-state"
  }
}
