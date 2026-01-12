# =============================================================================
# GCP VPC Module Outputs
# =============================================================================

output "network_id" {
  description = "VPC Network ID"
  value       = google_compute_network.main.id
}

output "network_name" {
  description = "VPC Network name"
  value       = google_compute_network.main.name
}

output "network_self_link" {
  description = "VPC Network self link"
  value       = google_compute_network.main.self_link
}

output "public_subnet_id" {
  description = "Public subnet ID"
  value       = google_compute_subnetwork.public.id
}

output "public_subnet_name" {
  description = "Public subnet name"
  value       = google_compute_subnetwork.public.name
}

output "public_subnet_cidr" {
  description = "Public subnet CIDR range"
  value       = google_compute_subnetwork.public.ip_cidr_range
}

output "public_subnet_self_link" {
  description = "Public subnet self link"
  value       = google_compute_subnetwork.public.self_link
}

output "private_subnet_id" {
  description = "Private subnet ID"
  value       = google_compute_subnetwork.private.id
}

output "private_subnet_name" {
  description = "Private subnet name"
  value       = google_compute_subnetwork.private.name
}

output "private_subnet_cidr" {
  description = "Private subnet CIDR range"
  value       = google_compute_subnetwork.private.ip_cidr_range
}

output "private_subnet_self_link" {
  description = "Private subnet self link"
  value       = google_compute_subnetwork.private.self_link
}

output "pods_secondary_range_name" {
  description = "GKE pods secondary range name"
  value       = var.enable_gke_secondary_ranges ? "${var.environment}-pods" : null
}

output "services_secondary_range_name" {
  description = "GKE services secondary range name"
  value       = var.enable_gke_secondary_ranges ? "${var.environment}-services" : null
}

output "router_id" {
  description = "Cloud Router ID"
  value       = var.enable_nat ? google_compute_router.main[0].id : null
}

output "router_name" {
  description = "Cloud Router name"
  value       = var.enable_nat ? google_compute_router.main[0].name : null
}

output "nat_id" {
  description = "Cloud NAT ID"
  value       = var.enable_nat ? google_compute_router_nat.main[0].id : null
}

output "nat_name" {
  description = "Cloud NAT name"
  value       = var.enable_nat ? google_compute_router_nat.main[0].name : null
}

output "region" {
  description = "VPC region"
  value       = var.region
}
