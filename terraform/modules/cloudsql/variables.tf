# =============================================================================
# Cloud SQL Module Variables
# =============================================================================

variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "instance_name" {
  description = "Cloud SQL instance name suffix"
  type        = string
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "asia-northeast3"
}

variable "database_version" {
  description = "PostgreSQL version"
  type        = string
  default     = "POSTGRES_16"

  validation {
    condition     = can(regex("^POSTGRES_[0-9]+$", var.database_version))
    error_message = "database_version must be in format POSTGRES_XX."
  }
}

variable "tier" {
  description = "Machine tier for the instance"
  type        = string
  default     = "db-f1-micro"
}

variable "disk_size" {
  description = "Disk size in GB"
  type        = number
  default     = 10

  validation {
    condition     = var.disk_size >= 10
    error_message = "disk_size must be at least 10 GB."
  }
}

variable "disk_type" {
  description = "Disk type"
  type        = string
  default     = "PD_SSD"

  validation {
    condition     = contains(["PD_SSD", "PD_HDD"], var.disk_type)
    error_message = "disk_type must be either PD_SSD or PD_HDD."
  }
}

variable "disk_autoresize" {
  description = "Enable automatic disk size increase"
  type        = bool
  default     = true
}

variable "availability_type" {
  description = "Availability type (ZONAL or REGIONAL)"
  type        = string
  default     = "ZONAL"

  validation {
    condition     = contains(["ZONAL", "REGIONAL"], var.availability_type)
    error_message = "availability_type must be either ZONAL or REGIONAL."
  }
}

variable "network_id" {
  description = "VPC network ID for private IP"
  type        = string
}

variable "enable_public_ip" {
  description = "Enable public IP address"
  type        = bool
  default     = false
}

variable "require_ssl" {
  description = "Require SSL connections"
  type        = bool
  default     = true
}

variable "backup_enabled" {
  description = "Enable automated backups"
  type        = bool
  default     = true
}

variable "backup_start_time" {
  description = "Backup start time in HH:MM format (UTC)"
  type        = string
  default     = "03:00"
}

variable "point_in_time_recovery_enabled" {
  description = "Enable point-in-time recovery"
  type        = bool
  default     = true
}

variable "transaction_log_retention_days" {
  description = "Number of days to retain transaction logs"
  type        = number
  default     = 7
}

variable "retained_backups" {
  description = "Number of backups to retain"
  type        = number
  default     = 7
}

variable "maintenance_day" {
  description = "Day of week for maintenance (1-7, 1=Monday)"
  type        = number
  default     = 7

  validation {
    condition     = var.maintenance_day >= 1 && var.maintenance_day <= 7
    error_message = "maintenance_day must be between 1 and 7."
  }
}

variable "maintenance_hour" {
  description = "Hour for maintenance (0-23)"
  type        = number
  default     = 3

  validation {
    condition     = var.maintenance_hour >= 0 && var.maintenance_hour <= 23
    error_message = "maintenance_hour must be between 0 and 23."
  }
}

variable "maintenance_update_track" {
  description = "Maintenance update track"
  type        = string
  default     = "stable"

  validation {
    condition     = contains(["canary", "stable"], var.maintenance_update_track)
    error_message = "maintenance_update_track must be either canary or stable."
  }
}

variable "query_insights_enabled" {
  description = "Enable Query Insights"
  type        = bool
  default     = true
}

variable "query_plans_per_minute" {
  description = "Query plans per minute for insights"
  type        = number
  default     = 5
}

variable "query_string_length" {
  description = "Maximum query string length for insights"
  type        = number
  default     = 1024
}

variable "database_name" {
  description = "Name of the database to create"
  type        = string
}

variable "database_charset" {
  description = "Database character set"
  type        = string
  default     = "UTF8"
}

variable "database_user" {
  description = "Database user name"
  type        = string
  default     = "app"
}

variable "deletion_protection" {
  description = "Enable deletion protection"
  type        = bool
  default     = true
}

variable "labels" {
  description = "Additional labels to apply"
  type        = map(string)
  default     = {}
}
