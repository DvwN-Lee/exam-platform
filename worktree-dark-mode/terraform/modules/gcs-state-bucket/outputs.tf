output "bucket_name" {
  description = "Name of the created state bucket"
  value       = google_storage_bucket.state.name
}

output "bucket_url" {
  description = "GCS URL of the state bucket"
  value       = google_storage_bucket.state.url
}

output "bucket_self_link" {
  description = "Self link of the state bucket"
  value       = google_storage_bucket.state.self_link
}
