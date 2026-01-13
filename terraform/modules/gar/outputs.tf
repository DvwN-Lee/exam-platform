# =============================================================================
# GAR Module Outputs
# =============================================================================

output "repository_id" {
  description = "Artifact Registry repository ID"
  value       = google_artifact_registry_repository.main.id
}

output "repository_name" {
  description = "Artifact Registry repository name"
  value       = google_artifact_registry_repository.main.name
}

output "repository_url" {
  description = "Artifact Registry repository URL for Docker push/pull"
  value       = "${var.location}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.main.name}"
}

output "repository_location" {
  description = "Artifact Registry repository location"
  value       = google_artifact_registry_repository.main.location
}

output "repository_format" {
  description = "Artifact Registry repository format"
  value       = google_artifact_registry_repository.main.format
}
