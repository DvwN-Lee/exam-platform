# =============================================================================
# Cloud SQL (PostgreSQL) Module
# =============================================================================
# Creates Cloud SQL PostgreSQL instance with database and user

terraform {
  required_version = ">= 1.0.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

# -----------------------------------------------------------------------------
# Random Password for Database User
# -----------------------------------------------------------------------------
resource "random_password" "db_password" {
  length           = 24
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"

  keepers = {
    instance_name = var.instance_name
    environment   = var.environment
  }
}

# -----------------------------------------------------------------------------
# Cloud SQL Instance
# -----------------------------------------------------------------------------
resource "google_sql_database_instance" "main" {
  project             = var.project_id
  name                = "${var.environment}-${var.instance_name}"
  region              = var.region
  database_version    = var.database_version
  deletion_protection = var.deletion_protection

  settings {
    tier              = var.tier
    disk_size         = var.disk_size
    disk_type         = var.disk_type
    disk_autoresize   = var.disk_autoresize
    availability_type = var.availability_type

    ip_configuration {
      ipv4_enabled    = var.enable_public_ip
      private_network = var.network_id
      require_ssl     = var.require_ssl
    }

    backup_configuration {
      enabled                        = var.backup_enabled
      start_time                     = var.backup_start_time
      point_in_time_recovery_enabled = var.point_in_time_recovery_enabled
      transaction_log_retention_days = var.transaction_log_retention_days

      backup_retention_settings {
        retained_backups = var.retained_backups
        retention_unit   = "COUNT"
      }
    }

    maintenance_window {
      day          = var.maintenance_day
      hour         = var.maintenance_hour
      update_track = var.maintenance_update_track
    }

    insights_config {
      query_insights_enabled  = var.query_insights_enabled
      query_plans_per_minute  = var.query_plans_per_minute
      query_string_length     = var.query_string_length
      record_application_tags = true
      record_client_address   = true
    }

    user_labels = merge(
      {
        environment = var.environment
        managed_by  = "terraform"
      },
      var.labels
    )
  }
}

# -----------------------------------------------------------------------------
# Database
# -----------------------------------------------------------------------------
resource "google_sql_database" "main" {
  project  = var.project_id
  name     = var.database_name
  instance = google_sql_database_instance.main.name
  charset  = var.database_charset
}

# -----------------------------------------------------------------------------
# Database User
# -----------------------------------------------------------------------------
resource "google_sql_user" "main" {
  project  = var.project_id
  name     = var.database_user
  instance = google_sql_database_instance.main.name
  password = random_password.db_password.result
}
