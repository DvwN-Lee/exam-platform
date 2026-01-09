# =============================================================================
# ECR Module Outputs
# =============================================================================

output "repository_arns" {
  description = "Map of repository names to ARNs"
  value       = { for k, v in aws_ecr_repository.main : k => v.arn }
}

output "repository_urls" {
  description = "Map of repository names to URLs"
  value       = { for k, v in aws_ecr_repository.main : k => v.repository_url }
}

output "repository_registry_ids" {
  description = "Map of repository names to registry IDs"
  value       = { for k, v in aws_ecr_repository.main : k => v.registry_id }
}

# Individual outputs for common repositories
output "backend_repository_url" {
  description = "URL of the backend repository"
  value       = contains(var.repository_names, "backend") ? aws_ecr_repository.main["backend"].repository_url : null
}

output "frontend_repository_url" {
  description = "URL of the frontend repository"
  value       = contains(var.repository_names, "frontend") ? aws_ecr_repository.main["frontend"].repository_url : null
}

# Docker login command
output "docker_login_command" {
  description = "AWS CLI command to login to ECR"
  value       = "aws ecr get-login-password --region ${data.aws_region.current.name} | docker login --username AWS --password-stdin ${data.aws_caller_identity.current.account_id}.dkr.ecr.${data.aws_region.current.name}.amazonaws.com"
}

# Data sources for outputs
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}
