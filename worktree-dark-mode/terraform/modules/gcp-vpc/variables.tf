# =============================================================================
# GCP VPC Module Variables
# =============================================================================

variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "asia-northeast3"
}

variable "environment" {
  description = "Environment name (dev, staging, prod, test)"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "prod", "test"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod, test."
  }
}

variable "network_name" {
  description = "VPC Network name suffix"
  type        = string
  default     = "vpc"
}

variable "public_subnet_cidr" {
  description = "CIDR range for public subnet"
  type        = string
  default     = "10.0.1.0/24"

  validation {
    condition     = can(cidrhost(var.public_subnet_cidr, 0))
    error_message = "public_subnet_cidr must be a valid CIDR block."
  }
}

variable "private_subnet_cidr" {
  description = "CIDR range for private subnet"
  type        = string
  default     = "10.0.2.0/24"

  validation {
    condition     = can(cidrhost(var.private_subnet_cidr, 0))
    error_message = "private_subnet_cidr must be a valid CIDR block."
  }
}

variable "enable_nat" {
  description = "Enable Cloud NAT for private subnet internet access"
  type        = bool
  default     = true
}

variable "enable_iap_ssh" {
  description = "Enable IAP SSH firewall rule"
  type        = bool
  default     = true
}

variable "enable_gke_secondary_ranges" {
  description = "Enable secondary IP ranges for GKE pods and services"
  type        = bool
  default     = true
}

variable "pods_cidr" {
  description = "CIDR range for GKE pods (secondary range)"
  type        = string
  default     = "10.1.0.0/16"

  validation {
    condition     = can(cidrhost(var.pods_cidr, 0))
    error_message = "pods_cidr must be a valid CIDR block."
  }
}

variable "services_cidr" {
  description = "CIDR range for GKE services (secondary range)"
  type        = string
  default     = "10.2.0.0/20"

  validation {
    condition     = can(cidrhost(var.services_cidr, 0))
    error_message = "services_cidr must be a valid CIDR block."
  }
}

variable "tags" {
  description = "Additional labels to apply to resources"
  type        = map(string)
  default     = {}
}

# =============================================================================
# Network Configuration Variables (하드코딩 제거)
# =============================================================================

variable "routing_mode" {
  description = "VPC Network routing mode (REGIONAL or GLOBAL)"
  type        = string
  default     = "REGIONAL"

  validation {
    condition     = contains(["REGIONAL", "GLOBAL"], var.routing_mode)
    error_message = "routing_mode must be either REGIONAL or GLOBAL."
  }
}

variable "flow_sampling" {
  description = "VPC Flow Log sampling rate (0.0 to 1.0)"
  type        = number
  default     = 0.5

  validation {
    condition     = var.flow_sampling >= 0.0 && var.flow_sampling <= 1.0
    error_message = "flow_sampling must be between 0.0 and 1.0."
  }
}

variable "log_aggregation_interval" {
  description = "VPC Flow Log aggregation interval"
  type        = string
  default     = "INTERVAL_5_SEC"

  validation {
    condition     = contains(["INTERVAL_5_SEC", "INTERVAL_30_SEC", "INTERVAL_1_MIN", "INTERVAL_5_MIN", "INTERVAL_10_MIN", "INTERVAL_15_MIN"], var.log_aggregation_interval)
    error_message = "log_aggregation_interval must be one of: INTERVAL_5_SEC, INTERVAL_30_SEC, INTERVAL_1_MIN, INTERVAL_5_MIN, INTERVAL_10_MIN, INTERVAL_15_MIN."
  }
}

variable "bgp_asn" {
  description = "BGP Autonomous System Number for Cloud Router"
  type        = number
  default     = 64514

  validation {
    condition     = var.bgp_asn >= 64512 && var.bgp_asn <= 65534
    error_message = "bgp_asn must be a private ASN between 64512 and 65534."
  }
}

variable "nat_ip_allocate_option" {
  description = "Cloud NAT IP allocation option"
  type        = string
  default     = "AUTO_ONLY"

  validation {
    condition     = contains(["AUTO_ONLY", "MANUAL_ONLY"], var.nat_ip_allocate_option)
    error_message = "nat_ip_allocate_option must be either AUTO_ONLY or MANUAL_ONLY."
  }
}

variable "nat_source_subnetwork_ip_ranges_to_nat" {
  description = "Cloud NAT source subnetwork IP ranges to NAT"
  type        = string
  default     = "ALL_SUBNETWORKS_ALL_IP_RANGES"

  validation {
    condition     = contains(["ALL_SUBNETWORKS_ALL_IP_RANGES", "ALL_SUBNETWORKS_ALL_PRIMARY_IP_RANGES", "LIST_OF_SUBNETWORKS"], var.nat_source_subnetwork_ip_ranges_to_nat)
    error_message = "nat_source_subnetwork_ip_ranges_to_nat must be one of: ALL_SUBNETWORKS_ALL_IP_RANGES, ALL_SUBNETWORKS_ALL_PRIMARY_IP_RANGES, LIST_OF_SUBNETWORKS."
  }
}
