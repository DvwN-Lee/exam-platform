# =============================================================================
# GCP Production Environment - Outputs
# =============================================================================

# -----------------------------------------------------------------------------
# VPC
# -----------------------------------------------------------------------------
output "vpc_network_id" {
  description = "VPC Network ID"
  value       = module.vpc.network_id
}

output "vpc_network_name" {
  description = "VPC Network name"
  value       = module.vpc.network_name
}

output "private_subnet_id" {
  description = "Private Subnet ID"
  value       = module.vpc.private_subnet_id
}

# -----------------------------------------------------------------------------
# GKE
# -----------------------------------------------------------------------------
output "gke_cluster_name" {
  description = "GKE Cluster name"
  value       = module.gke.cluster_name
}

output "gke_cluster_endpoint" {
  description = "GKE Cluster endpoint"
  value       = module.gke.cluster_endpoint
  sensitive   = true
}

output "gke_connect_command" {
  description = "Command to connect to GKE cluster"
  value       = module.gke.get_credentials_command
}

# -----------------------------------------------------------------------------
# Cloud SQL
# -----------------------------------------------------------------------------
output "cloudsql_instance_name" {
  description = "Cloud SQL instance name"
  value       = module.cloudsql.instance_name
}

output "cloudsql_connection_name" {
  description = "Cloud SQL connection name for Cloud SQL Proxy"
  value       = module.cloudsql.instance_connection_name
}

output "cloudsql_private_ip" {
  description = "Cloud SQL private IP"
  value       = module.cloudsql.private_ip_address
}

output "database_name" {
  description = "Database name"
  value       = module.cloudsql.database_name
}

output "database_password" {
  description = "Database password"
  value       = module.cloudsql.database_password
  sensitive   = true
}

# -----------------------------------------------------------------------------
# Memorystore (Redis)
# -----------------------------------------------------------------------------
output "redis_host" {
  description = "Redis host"
  value       = module.memorystore.host
}

output "redis_port" {
  description = "Redis port"
  value       = module.memorystore.port
}

output "redis_auth_string" {
  description = "Redis AUTH string"
  value       = module.memorystore.auth_string
  sensitive   = true
}

# -----------------------------------------------------------------------------
# Storage
# -----------------------------------------------------------------------------
output "storage_bucket_name" {
  description = "GCS Bucket name"
  value       = module.gcs.bucket_name
}

output "storage_bucket_url" {
  description = "GCS Bucket URL"
  value       = module.gcs.bucket_url
}

# -----------------------------------------------------------------------------
# Artifact Registry
# -----------------------------------------------------------------------------
output "registry_url" {
  description = "Artifact Registry URL"
  value       = module.gar.repository_url
}

# -----------------------------------------------------------------------------
# Ingress
# -----------------------------------------------------------------------------
output "ingress_static_ip" {
  description = "NGINX Ingress Controller External Static IP"
  value       = google_compute_address.ingress_ip.address
}

# -----------------------------------------------------------------------------
# ArgoCD
# -----------------------------------------------------------------------------
output "argocd_server_url" {
  description = "ArgoCD Server URL (kubectl port-forward 필요)"
  value       = "https://localhost:8080 (kubectl port-forward svc/argocd-server -n argocd 8080:443)"
}
