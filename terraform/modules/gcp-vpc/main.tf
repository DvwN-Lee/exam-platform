# =============================================================================
# GCP VPC Module
# =============================================================================
# Creates VPC Network with subnets, Cloud Router, and Cloud NAT

terraform {
  required_version = ">= 1.0.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

# -----------------------------------------------------------------------------
# VPC Network
# -----------------------------------------------------------------------------
resource "google_compute_network" "main" {
  name                    = "${var.environment}-${var.network_name}"
  project                 = var.project_id
  auto_create_subnetworks = false
  routing_mode            = var.routing_mode
}

# -----------------------------------------------------------------------------
# Public Subnet
# -----------------------------------------------------------------------------
resource "google_compute_subnetwork" "public" {
  name          = "${var.environment}-public-subnet"
  project       = var.project_id
  region        = var.region
  network       = google_compute_network.main.id
  ip_cidr_range = var.public_subnet_cidr

  private_ip_google_access = true

  log_config {
    aggregation_interval = var.log_aggregation_interval
    flow_sampling        = var.flow_sampling
    metadata             = "INCLUDE_ALL_METADATA"
  }
}

# -----------------------------------------------------------------------------
# Private Subnet
# -----------------------------------------------------------------------------
resource "google_compute_subnetwork" "private" {
  name          = "${var.environment}-private-subnet"
  project       = var.project_id
  region        = var.region
  network       = google_compute_network.main.id
  ip_cidr_range = var.private_subnet_cidr

  private_ip_google_access = true

  # Secondary ranges for GKE
  dynamic "secondary_ip_range" {
    for_each = var.enable_gke_secondary_ranges ? [1] : []
    content {
      range_name    = "${var.environment}-pods"
      ip_cidr_range = var.pods_cidr
    }
  }

  dynamic "secondary_ip_range" {
    for_each = var.enable_gke_secondary_ranges ? [1] : []
    content {
      range_name    = "${var.environment}-services"
      ip_cidr_range = var.services_cidr
    }
  }

  log_config {
    aggregation_interval = var.log_aggregation_interval
    flow_sampling        = var.flow_sampling
    metadata             = "INCLUDE_ALL_METADATA"
  }
}

# -----------------------------------------------------------------------------
# Cloud Router (for Cloud NAT)
# -----------------------------------------------------------------------------
resource "google_compute_router" "main" {
  count   = var.enable_nat ? 1 : 0
  name    = "${var.environment}-router"
  project = var.project_id
  region  = var.region
  network = google_compute_network.main.id

  bgp {
    asn = var.bgp_asn
  }
}

# -----------------------------------------------------------------------------
# Cloud NAT
# -----------------------------------------------------------------------------
resource "google_compute_router_nat" "main" {
  count   = var.enable_nat ? 1 : 0
  name    = "${var.environment}-nat"
  project = var.project_id
  region  = var.region
  router  = google_compute_router.main[0].name

  nat_ip_allocate_option             = var.nat_ip_allocate_option
  source_subnetwork_ip_ranges_to_nat = var.nat_source_subnetwork_ip_ranges_to_nat

  log_config {
    enable = true
    filter = "ERRORS_ONLY"
  }
}

# -----------------------------------------------------------------------------
# Firewall Rules
# -----------------------------------------------------------------------------

# Allow internal traffic within VPC
resource "google_compute_firewall" "allow_internal" {
  name    = "${var.environment}-allow-internal"
  project = var.project_id
  network = google_compute_network.main.name

  allow {
    protocol = "icmp"
  }

  allow {
    protocol = "tcp"
    ports    = ["0-65535"]
  }

  allow {
    protocol = "udp"
    ports    = ["0-65535"]
  }

  source_ranges = [var.public_subnet_cidr, var.private_subnet_cidr]
  priority      = 1000
}

# Allow SSH from IAP
resource "google_compute_firewall" "allow_iap_ssh" {
  count   = var.enable_iap_ssh ? 1 : 0
  name    = "${var.environment}-allow-iap-ssh"
  project = var.project_id
  network = google_compute_network.main.name

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  # IAP IP ranges
  source_ranges = ["35.235.240.0/20"]
  priority      = 1000
}

# Allow health checks from Google
resource "google_compute_firewall" "allow_health_check" {
  name    = "${var.environment}-allow-health-check"
  project = var.project_id
  network = google_compute_network.main.name

  allow {
    protocol = "tcp"
  }

  # Google health check ranges
  source_ranges = ["130.211.0.0/22", "35.191.0.0/16"]
  priority      = 1000
}
