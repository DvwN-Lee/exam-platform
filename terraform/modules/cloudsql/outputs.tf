# =============================================================================
# Cloud SQL Module Outputs
# =============================================================================

output "instance_id" {
  description = "Cloud SQL instance ID"
  value       = google_sql_database_instance.main.id
}

output "instance_name" {
  description = "Cloud SQL instance name"
  value       = google_sql_database_instance.main.name
}

output "instance_connection_name" {
  description = "Cloud SQL instance connection name for Cloud SQL Proxy"
  value       = google_sql_database_instance.main.connection_name
}

output "private_ip_address" {
  description = "Private IP address of the instance"
  value       = google_sql_database_instance.main.private_ip_address
}

output "public_ip_address" {
  description = "Public IP address of the instance (if enabled)"
  value       = google_sql_database_instance.main.public_ip_address
}

output "database_name" {
  description = "Name of the created database"
  value       = google_sql_database.main.name
}

output "database_user" {
  description = "Database user name"
  value       = google_sql_user.main.name
}

output "database_password" {
  description = "Database user password (sensitive)"
  value       = random_password.db_password.result
  sensitive   = true
}

output "postgres_connection_string" {
  description = "PostgreSQL connection string"
  value       = "postgresql://${google_sql_user.main.name}@${google_sql_database_instance.main.private_ip_address}:5432/${google_sql_database.main.name}"
  sensitive   = true
}

# -----------------------------------------------------------------------------
# Secret Manager Outputs
# -----------------------------------------------------------------------------
output "secret_manager_secret_id" {
  description = "Secret Manager secret ID (if enabled)"
  value       = var.enable_secret_manager ? google_secret_manager_secret.db_password[0].secret_id : null
}

output "secret_manager_secret_name" {
  description = "Secret Manager secret resource name (if enabled)"
  value       = var.enable_secret_manager ? google_secret_manager_secret.db_password[0].name : null
}

output "secret_manager_secret_version" {
  description = "Secret Manager secret version (if enabled)"
  value       = var.enable_secret_manager ? google_secret_manager_secret_version.db_password[0].name : null
}

# -----------------------------------------------------------------------------
# Workload Identity Outputs
# -----------------------------------------------------------------------------
output "secret_accessor_sa_email" {
  description = "Google Service Account email for Secret Manager access (if Workload Identity enabled)"
  value       = var.enable_secret_manager && var.enable_workload_identity && var.workload_identity_config != null ? google_service_account.secret_accessor[0].email : null
}

output "workload_identity_annotation" {
  description = "Annotation value for Kubernetes Service Account (if Workload Identity enabled)"
  value       = var.enable_secret_manager && var.enable_workload_identity && var.workload_identity_config != null ? google_service_account.secret_accessor[0].email : null
}
