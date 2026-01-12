# =============================================================================
# Mock AWS Provider for CI Testing
# =============================================================================
# This file provides a mock AWS provider configuration for running Terraform
# plan validation tests in CI environments without real AWS credentials.
#
# Usage: Copy this file to the module directory before running tests.
# The CI workflow handles this automatically.

provider "aws" {
  region                      = "us-east-1"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true
  access_key                  = "mock-access-key"
  secret_key                  = "mock-secret-key"

  default_tags {
    tags = {
      Environment = "test"
      ManagedBy   = "terratest"
    }
  }
}
