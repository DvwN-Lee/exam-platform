# =============================================================================
# Memorystore Module Variables
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
  description = "Redis instance name suffix (will be prefixed with environment)"
  type        = string
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "asia-northeast3"
}

variable "tier" {
  description = "Redis tier (BASIC or STANDARD_HA)"
  type        = string
  default     = "BASIC"

  validation {
    condition     = contains(["BASIC", "STANDARD_HA"], var.tier)
    error_message = "tier must be either BASIC or STANDARD_HA."
  }
}

variable "memory_size_gb" {
  description = "Redis memory size in GB"
  type        = number
  default     = 1

  validation {
    condition     = var.memory_size_gb >= 1 && var.memory_size_gb <= 300
    error_message = "memory_size_gb must be between 1 and 300."
  }
}

variable "redis_version" {
  description = "Redis version"
  type        = string
  default     = "REDIS_7_0"

  validation {
    condition     = contains(["REDIS_7_0", "REDIS_6_X", "REDIS_5_0", "REDIS_4_0"], var.redis_version)
    error_message = "redis_version must be one of: REDIS_7_0, REDIS_6_X, REDIS_5_0, REDIS_4_0."
  }
}

variable "network_id" {
  description = "VPC network ID for the Redis instance"
  type        = string
}

variable "auth_enabled" {
  description = "Enable Redis AUTH"
  type        = bool
  default     = true
}

variable "transit_encryption_mode" {
  description = "Transit encryption mode"
  type        = string
  default     = "SERVER_AUTHENTICATION"

  validation {
    condition     = contains(["DISABLED", "SERVER_AUTHENTICATION"], var.transit_encryption_mode)
    error_message = "transit_encryption_mode must be either DISABLED or SERVER_AUTHENTICATION."
  }
}

variable "redis_configs" {
  description = "Redis configuration parameters"
  type        = map(string)
  default     = {}
}

variable "maintenance_day" {
  description = "Day for maintenance window (MONDAY, TUESDAY, etc.)"
  type        = string
  default     = "SUNDAY"

  validation {
    condition     = contains(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"], var.maintenance_day)
    error_message = "maintenance_day must be a valid day of the week."
  }
}

variable "maintenance_hour" {
  description = "Hour for maintenance window (0-23)"
  type        = number
  default     = 3

  validation {
    condition     = var.maintenance_hour >= 0 && var.maintenance_hour <= 23
    error_message = "maintenance_hour must be between 0 and 23."
  }
}

variable "labels" {
  description = "Additional labels to apply to the instance"
  type        = map(string)
  default     = {}
}
