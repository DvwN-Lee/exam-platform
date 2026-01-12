package s3_test

import (
	"testing"

	"github.com/DvwN-Lee/exam-platform/tests/terratest/helpers"
	"github.com/stretchr/testify/assert"
)

func TestS3ModulePlanValidation(t *testing.T) {
	t.Parallel()

	moduleDir := helpers.GetTerraformModulePath("s3")

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: moduleDir,
		Vars: map[string]interface{}{
			"bucket_name": "test-exam-assets",
		},
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	// S3 Bucket 확인
	bucketCount := helpers.CountResourcesByType(plan, "aws_s3_bucket")
	assert.GreaterOrEqual(t, bucketCount, 1, "Expected at least 1 S3 Bucket")
}

func TestS3ModuleOutputValidation(t *testing.T) {
	t.Parallel()

	moduleDir := helpers.GetTerraformModulePath("s3")

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: moduleDir,
		Vars: map[string]interface{}{
			"bucket_name": "test-exam-assets",
		},
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	expectedOutputs := []string{
		"bucket_id",
		"bucket_arn",
		"bucket_domain_name",
	}

	helpers.ValidateOutputs(t, plan, expectedOutputs)
}

func TestS3ModuleIdempotency(t *testing.T) {
	t.Parallel()

	moduleDir := helpers.GetTerraformModulePath("s3")

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: moduleDir,
		Vars: map[string]interface{}{
			"bucket_name": "test-exam-assets",
		},
	}

	helpers.RunIdempotencyTest(t, opts)
}

func TestS3ModuleVersioning(t *testing.T) {
	t.Parallel()

	moduleDir := helpers.GetTerraformModulePath("s3")

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: moduleDir,
		Vars: map[string]interface{}{
			"bucket_name":        "prod-exam-assets",
			"versioning_enabled": true,
			"force_destroy":      false,
		},
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	// Versioning 설정 확인
	versioningCount := helpers.CountResourcesByType(plan, "aws_s3_bucket_versioning")
	assert.GreaterOrEqual(t, versioningCount, 1, "Expected versioning configuration")
}

func TestS3ModuleLifecycleRules(t *testing.T) {
	t.Parallel()

	moduleDir := helpers.GetTerraformModulePath("s3")

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: moduleDir,
		Vars: map[string]interface{}{
			"bucket_name": "staging-exam-assets",
			"lifecycle_rules": []map[string]interface{}{
				{
					"id":      "archive-old-objects",
					"enabled": true,
					"transitions": []map[string]interface{}{
						{
							"days":          90,
							"storage_class": "GLACIER",
						},
					},
				},
			},
		},
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	// Lifecycle 설정 확인
	lifecycleCount := helpers.CountResourcesByType(plan, "aws_s3_bucket_lifecycle_configuration")
	assert.GreaterOrEqual(t, lifecycleCount, 1, "Expected lifecycle configuration")
}

func TestS3ModuleCORS(t *testing.T) {
	t.Parallel()

	moduleDir := helpers.GetTerraformModulePath("s3")

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: moduleDir,
		Vars: map[string]interface{}{
			"bucket_name": "dev-exam-assets",
			"cors_rules": []map[string]interface{}{
				{
					"allowed_headers": []string{"*"},
					"allowed_methods": []string{"GET", "PUT", "POST"},
					"allowed_origins": []string{"https://exam.example.com"},
					"max_age_seconds": 3600,
				},
			},
		},
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	// CORS 설정 확인
	corsCount := helpers.CountResourcesByType(plan, "aws_s3_bucket_cors_configuration")
	assert.GreaterOrEqual(t, corsCount, 1, "Expected CORS configuration")
}

func TestS3ModuleEncryption(t *testing.T) {
	t.Parallel()

	moduleDir := helpers.GetTerraformModulePath("s3")

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: moduleDir,
		Vars: map[string]interface{}{
			"bucket_name": "prod-exam-assets-encrypted",
			"kms_key_arn": "arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012",
		},
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	// Server-Side Encryption 설정 확인
	sseCount := helpers.CountResourcesByType(plan, "aws_s3_bucket_server_side_encryption_configuration")
	assert.GreaterOrEqual(t, sseCount, 1, "Expected server-side encryption configuration")
}
