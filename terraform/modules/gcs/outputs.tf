# =============================================================================
# GCS Module Outputs
# =============================================================================

output "bucket_id" {
  description = "Storage bucket ID"
  value       = google_storage_bucket.main.id
}

output "bucket_name" {
  description = "Storage bucket name"
  value       = google_storage_bucket.main.name
}

output "bucket_url" {
  description = "Storage bucket URL (gs://)"
  value       = google_storage_bucket.main.url
}

output "bucket_self_link" {
  description = "Storage bucket self link"
  value       = google_storage_bucket.main.self_link
}

output "bucket_location" {
  description = "Storage bucket location"
  value       = google_storage_bucket.main.location
}

output "bucket_storage_class" {
  description = "Storage bucket storage class"
  value       = google_storage_bucket.main.storage_class
}
