# =============================================================================
# Memorystore Module Outputs
# =============================================================================

output "instance_id" {
  description = "Redis instance ID"
  value       = google_redis_instance.main.id
}

output "instance_name" {
  description = "Redis instance name"
  value       = google_redis_instance.main.name
}

output "host" {
  description = "Redis instance host IP"
  value       = google_redis_instance.main.host
}

output "port" {
  description = "Redis instance port"
  value       = google_redis_instance.main.port
}

output "current_location_id" {
  description = "Current location ID of the Redis instance"
  value       = google_redis_instance.main.current_location_id
}

output "auth_string" {
  description = "Redis AUTH string (sensitive)"
  value       = google_redis_instance.main.auth_string
  sensitive   = true
}

output "server_ca_certs" {
  description = "Server CA certificates for TLS"
  value       = google_redis_instance.main.server_ca_certs
  sensitive   = true
}

output "redis_connection_string" {
  description = "Redis connection string"
  value       = "redis://${google_redis_instance.main.host}:${google_redis_instance.main.port}"
}
