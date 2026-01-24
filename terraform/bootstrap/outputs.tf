output "state_bucket_name" {
  description = "Name of the Terraform state bucket"
  value       = module.state_bucket.bucket_name
}

output "state_bucket_url" {
  description = "GCS URL of the Terraform state bucket"
  value       = module.state_bucket.bucket_url
}

output "backend_config" {
  description = "Backend configuration for other Terraform environments"
  value = {
    bucket = module.state_bucket.bucket_name
    prefix = "environments/${var.environment}"
  }
}
