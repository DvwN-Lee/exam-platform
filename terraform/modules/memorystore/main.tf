# =============================================================================
# Memorystore (Redis) Module
# =============================================================================
# Creates Memorystore Redis instance for caching

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
# Memorystore Redis Instance
# -----------------------------------------------------------------------------
resource "google_redis_instance" "main" {
  project        = var.project_id
  name           = "${var.environment}-${var.instance_name}"
  display_name   = "${var.environment}-${var.instance_name}"
  region         = var.region
  tier           = var.tier
  memory_size_gb = var.memory_size_gb
  redis_version  = var.redis_version

  authorized_network = var.network_id

  auth_enabled            = var.auth_enabled
  transit_encryption_mode = var.transit_encryption_mode

  redis_configs = var.redis_configs

  maintenance_policy {
    weekly_maintenance_window {
      day = var.maintenance_day
      start_time {
        hours   = var.maintenance_hour
        minutes = 0
        seconds = 0
        nanos   = 0
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
