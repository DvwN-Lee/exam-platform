# =============================================================================
# Cloud Build Module - Outputs
# =============================================================================

output "backend_trigger_id" {
  description = "Backend Cloud Build Trigger ID"
  value       = google_cloudbuild_trigger.backend.trigger_id
}

output "frontend_trigger_id" {
  description = "Frontend Cloud Build Trigger ID"
  value       = google_cloudbuild_trigger.frontend.trigger_id
}

output "service_account_email" {
  description = "Cloud Build Service Account email"
  value       = google_service_account.cloud_build.email
}

output "connection_name" {
  description = "GitHub connection name"
  value       = google_cloudbuildv2_connection.github.name
}
