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

# -----------------------------------------------------------------------------
# Secret Manager (Optional)
# -----------------------------------------------------------------------------
locals {
  secret_id = var.secret_manager_secret_id != "" ? var.secret_manager_secret_id : "${var.environment}-${var.instance_name}-db-password"

  # Workload Identity locals
  enable_wi = var.enable_secret_manager && var.enable_workload_identity && var.workload_identity_config != null
  wi_sa_account_id = local.enable_wi ? (
    var.workload_identity_config.google_sa_account_id != "" ?
    var.workload_identity_config.google_sa_account_id :
    "${var.environment}-${var.instance_name}-secret-accessor"
  ) : ""
}

resource "google_secret_manager_secret" "db_password" {
  count = var.enable_secret_manager ? 1 : 0

  project   = var.project_id
  secret_id = local.secret_id

  replication {
    auto {}
  }

  labels = merge(
    {
      environment = var.environment
      managed_by  = "terraform"
      database    = var.instance_name
    },
    var.labels
  )
}

resource "google_secret_manager_secret_version" "db_password" {
  count = var.enable_secret_manager ? 1 : 0

  secret      = google_secret_manager_secret.db_password[0].id
  secret_data = random_password.db_password.result
}

# -----------------------------------------------------------------------------
# Workload Identity IAM Binding (Optional)
# -----------------------------------------------------------------------------
# GSA: Pod에서 Secret Manager 접근을 위한 Google Service Account
resource "google_service_account" "secret_accessor" {
  count = local.enable_wi ? 1 : 0

  project      = var.workload_identity_config.project_id
  account_id   = local.wi_sa_account_id
  display_name = "Secret Accessor for ${var.environment}-${var.instance_name}"
  description  = "Service Account for GKE Workload Identity - Secret Manager access"
}

# KSA-GSA Binding: Kubernetes Service Account와 Google Service Account 연결
resource "google_service_account_iam_member" "workload_identity_binding" {
  count = local.enable_wi ? 1 : 0

  service_account_id = google_service_account.secret_accessor[0].name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.workload_identity_config.project_id}.svc.id.goog[${var.workload_identity_config.gke_namespace}/${var.workload_identity_config.kubernetes_sa_name}]"
}

# Secret 접근 권한: GSA에 Secret Manager Secret Accessor 역할 부여
resource "google_secret_manager_secret_iam_member" "secret_accessor" {
  count = local.enable_wi ? 1 : 0

  project   = var.project_id
  secret_id = google_secret_manager_secret.db_password[0].secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.secret_accessor[0].email}"
}
