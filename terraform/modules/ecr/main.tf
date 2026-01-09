# =============================================================================
# ECR Module
# =============================================================================
# Creates ECR repositories for container images

terraform {
  required_version = ">= 1.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# -----------------------------------------------------------------------------
# ECR Repositories
# -----------------------------------------------------------------------------
resource "aws_ecr_repository" "main" {
  for_each = toset(var.repository_names)

  name                 = each.value
  image_tag_mutability = var.image_tag_mutability

  image_scanning_configuration {
    scan_on_push = var.scan_on_push
  }

  encryption_configuration {
    encryption_type = var.kms_key_arn != null ? "KMS" : "AES256"
    kms_key         = var.kms_key_arn
  }

  force_delete = var.force_delete

  tags = merge(var.tags, {
    Name = each.value
  })
}

# -----------------------------------------------------------------------------
# Lifecycle Policy
# -----------------------------------------------------------------------------
resource "aws_ecr_lifecycle_policy" "main" {
  for_each = var.lifecycle_policy != null ? toset(var.repository_names) : []

  repository = aws_ecr_repository.main[each.value].name
  policy     = var.lifecycle_policy
}

# Default lifecycle policy to keep recent images
locals {
  default_lifecycle_policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last ${var.max_image_count} images"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = var.max_image_count
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

resource "aws_ecr_lifecycle_policy" "default" {
  for_each = var.lifecycle_policy == null && var.max_image_count > 0 ? toset(var.repository_names) : []

  repository = aws_ecr_repository.main[each.value].name
  policy     = local.default_lifecycle_policy
}

# -----------------------------------------------------------------------------
# Repository Policy (for cross-account access)
# -----------------------------------------------------------------------------
resource "aws_ecr_repository_policy" "main" {
  for_each = var.repository_policy != null ? toset(var.repository_names) : []

  repository = aws_ecr_repository.main[each.value].name
  policy     = var.repository_policy
}

# Cross-account pull access
data "aws_iam_policy_document" "cross_account_pull" {
  count = length(var.allowed_account_ids) > 0 ? 1 : 0

  statement {
    sid    = "AllowCrossAccountPull"
    effect = "Allow"

    principals {
      type        = "AWS"
      identifiers = [for id in var.allowed_account_ids : "arn:aws:iam::${id}:root"]
    }

    actions = [
      "ecr:GetDownloadUrlForLayer",
      "ecr:BatchGetImage",
      "ecr:BatchCheckLayerAvailability",
    ]
  }
}

resource "aws_ecr_repository_policy" "cross_account" {
  for_each = length(var.allowed_account_ids) > 0 && var.repository_policy == null ? toset(var.repository_names) : []

  repository = aws_ecr_repository.main[each.value].name
  policy     = data.aws_iam_policy_document.cross_account_pull[0].json
}
