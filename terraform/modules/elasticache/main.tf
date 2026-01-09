# =============================================================================
# ElastiCache Module
# =============================================================================
# Creates Redis ElastiCache cluster (Replication Group)

terraform {
  required_version = ">= 1.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

# -----------------------------------------------------------------------------
# Random Password for Auth Token
# -----------------------------------------------------------------------------
resource "random_password" "auth_token" {
  count = var.transit_encryption_enabled && var.auth_token == null ? 1 : 0

  length           = 32
  special          = true
  override_special = "!&#$^<>-"
}

locals {
  auth_token = var.transit_encryption_enabled ? (
    var.auth_token != null ? var.auth_token : random_password.auth_token[0].result
  ) : null
}

# -----------------------------------------------------------------------------
# Security Group
# -----------------------------------------------------------------------------
resource "aws_security_group" "redis" {
  name        = "${var.cluster_id}-sg"
  description = "Security group for ElastiCache Redis"
  vpc_id      = var.vpc_id

  tags = merge(var.tags, {
    Name = "${var.cluster_id}-sg"
  })
}

resource "aws_security_group_rule" "redis_ingress" {
  for_each = toset(var.allowed_security_group_ids)

  type                     = "ingress"
  from_port                = var.port
  to_port                  = var.port
  protocol                 = "tcp"
  security_group_id        = aws_security_group.redis.id
  source_security_group_id = each.value
  description              = "Allow Redis from allowed security groups"
}

resource "aws_security_group_rule" "redis_ingress_cidr" {
  count = length(var.allowed_cidr_blocks) > 0 ? 1 : 0

  type              = "ingress"
  from_port         = var.port
  to_port           = var.port
  protocol          = "tcp"
  security_group_id = aws_security_group.redis.id
  cidr_blocks       = var.allowed_cidr_blocks
  description       = "Allow Redis from allowed CIDR blocks"
}

# -----------------------------------------------------------------------------
# Parameter Group
# -----------------------------------------------------------------------------
resource "aws_elasticache_parameter_group" "main" {
  name        = "${var.cluster_id}-pg"
  family      = var.parameter_group_family
  description = "Parameter group for ${var.cluster_id}"

  dynamic "parameter" {
    for_each = var.parameters
    content {
      name  = parameter.value.name
      value = parameter.value.value
    }
  }

  tags = merge(var.tags, {
    Name = "${var.cluster_id}-pg"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# -----------------------------------------------------------------------------
# ElastiCache Replication Group (Redis)
# -----------------------------------------------------------------------------
resource "aws_elasticache_replication_group" "main" {
  replication_group_id = var.cluster_id
  description          = var.description

  # Engine
  engine               = "redis"
  engine_version       = var.engine_version
  node_type            = var.node_type
  port                 = var.port
  parameter_group_name = aws_elasticache_parameter_group.main.name

  # Cluster Mode
  num_cache_clusters = var.num_cache_clusters

  # Network
  subnet_group_name  = var.subnet_group_name
  security_group_ids = [aws_security_group.redis.id]

  # High Availability
  automatic_failover_enabled = var.automatic_failover_enabled
  multi_az_enabled           = var.multi_az_enabled

  # Encryption
  at_rest_encryption_enabled = var.at_rest_encryption_enabled
  transit_encryption_enabled = var.transit_encryption_enabled
  auth_token                 = local.auth_token
  kms_key_id                 = var.kms_key_id

  # Maintenance
  maintenance_window        = var.maintenance_window
  snapshot_window           = var.snapshot_window
  snapshot_retention_limit  = var.snapshot_retention_limit
  final_snapshot_identifier = var.skip_final_snapshot ? null : "${var.cluster_id}-final-snapshot"

  auto_minor_version_upgrade = var.auto_minor_version_upgrade
  apply_immediately          = var.apply_immediately

  # Notifications
  notification_topic_arn = var.notification_topic_arn

  tags = merge(var.tags, {
    Name = var.cluster_id
  })

  lifecycle {
    ignore_changes = [auth_token]
  }
}
