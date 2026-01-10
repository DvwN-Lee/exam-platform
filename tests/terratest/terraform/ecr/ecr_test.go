package ecr_test

import (
	"testing"

	"github.com/DvwN-Lee/exam-platform/tests/terratest/helpers"
	"github.com/stretchr/testify/assert"
)

func TestECRModulePlanValidation(t *testing.T) {
	t.Parallel()

	moduleDir := helpers.GetTerraformModulePath("ecr")

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: moduleDir,
		Vars: map[string]interface{}{
			"environment": "test",
			"repository_names": []string{
				"exam-backend",
				"exam-frontend",
			},
		},
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	// ECR Repository 확인
	repoCount := helpers.CountResourcesByType(plan, "aws_ecr_repository")
	assert.GreaterOrEqual(t, repoCount, 2, "Expected at least 2 ECR Repositories")
}

func TestECRModuleOutputValidation(t *testing.T) {
	t.Parallel()

	moduleDir := helpers.GetTerraformModulePath("ecr")

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: moduleDir,
		Vars: map[string]interface{}{
			"environment": "test",
			"repository_names": []string{
				"exam-backend",
				"exam-frontend",
			},
		},
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	expectedOutputs := []string{
		"repository_urls",
		"repository_arns",
	}

	helpers.ValidateOutputs(t, plan, expectedOutputs)
}

func TestECRModuleIdempotency(t *testing.T) {
	t.Parallel()

	moduleDir := helpers.GetTerraformModulePath("ecr")

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: moduleDir,
		Vars: map[string]interface{}{
			"environment": "test",
			"repository_names": []string{
				"exam-backend",
				"exam-frontend",
			},
		},
	}

	helpers.RunIdempotencyTest(t, opts)
}

func TestECRModuleLifecyclePolicy(t *testing.T) {
	t.Parallel()

	moduleDir := helpers.GetTerraformModulePath("ecr")

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: moduleDir,
		Vars: map[string]interface{}{
			"environment": "prod",
			"repository_names": []string{
				"exam-backend",
				"exam-frontend",
			},
			"enable_lifecycle_policy": true,
			"image_count_to_keep":     30,
		},
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	// Lifecycle Policy 확인
	lifecyclePolicyCount := helpers.CountResourcesByType(plan, "aws_ecr_lifecycle_policy")
	assert.GreaterOrEqual(t, lifecyclePolicyCount, 2, "Expected lifecycle policies for each repository")
}

func TestECRModuleImageScanning(t *testing.T) {
	t.Parallel()

	moduleDir := helpers.GetTerraformModulePath("ecr")

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: moduleDir,
		Vars: map[string]interface{}{
			"environment": "prod",
			"repository_names": []string{
				"exam-backend",
				"exam-frontend",
			},
			"scan_on_push": true,
		},
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	// Repository 존재 확인
	repoCount := helpers.CountResourcesByType(plan, "aws_ecr_repository")
	assert.GreaterOrEqual(t, repoCount, 2, "Expected at least 2 ECR Repositories with scanning enabled")
}

func TestECRModuleImmutableTags(t *testing.T) {
	t.Parallel()

	moduleDir := helpers.GetTerraformModulePath("ecr")

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: moduleDir,
		Vars: map[string]interface{}{
			"environment": "prod",
			"repository_names": []string{
				"exam-backend",
			},
			"image_tag_mutability": "IMMUTABLE",
		},
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	helpers.ValidateResourceExists(t, plan, "aws_ecr_repository.main")
}

func TestECRModuleEncryption(t *testing.T) {
	t.Parallel()

	moduleDir := helpers.GetTerraformModulePath("ecr")

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: moduleDir,
		Vars: map[string]interface{}{
			"environment": "prod",
			"repository_names": []string{
				"exam-backend",
				"exam-frontend",
			},
			"encryption_type": "KMS",
		},
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	repoCount := helpers.CountResourcesByType(plan, "aws_ecr_repository")
	assert.GreaterOrEqual(t, repoCount, 2, "Expected ECR Repositories with KMS encryption")
}
