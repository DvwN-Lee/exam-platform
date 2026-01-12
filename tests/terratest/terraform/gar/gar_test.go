package gar_test

import (
	"testing"

	"github.com/DvwN-Lee/exam-platform/tests/terratest/helpers"
	"github.com/stretchr/testify/assert"
)

func TestGARModulePlanValidation(t *testing.T) {
	t.Parallel()

	moduleDir := helpers.GetTerraformModulePath("gar")

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: moduleDir,
		Vars:         helpers.DefaultGARVars(),
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	// Artifact Registry Repository 존재 확인
	repoCount := helpers.CountResourcesByType(plan, "google_artifact_registry_repository")
	assert.Equal(t, 1, repoCount, "Expected 1 Artifact Registry Repository")
}

func TestGARModuleOutputValidation(t *testing.T) {
	t.Parallel()

	moduleDir := helpers.GetTerraformModulePath("gar")

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: moduleDir,
		Vars:         helpers.DefaultGARVars(),
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	// 필수 Output 검증
	expectedOutputs := []string{
		"repository_id",
		"repository_name",
		"repository_url",
		"repository_location",
		"repository_format",
	}

	helpers.ValidateOutputs(t, plan, expectedOutputs)
}

func TestGARModuleIdempotency(t *testing.T) {
	t.Parallel()

	moduleDir := helpers.GetTerraformModulePath("gar")

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: moduleDir,
		Vars:         helpers.DefaultGARVars(),
	}

	helpers.RunIdempotencyTest(t, opts)
}

func TestGARModuleWithImmutableTags(t *testing.T) {
	t.Parallel()

	moduleDir := helpers.GetTerraformModulePath("gar")

	vars := helpers.DefaultGARVars()
	vars["immutable_tags"] = true

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: moduleDir,
		Vars:         vars,
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	repoCount := helpers.CountResourcesByType(plan, "google_artifact_registry_repository")
	assert.Equal(t, 1, repoCount, "Expected 1 Artifact Registry Repository with immutable tags")
}

func TestGARModuleWithCleanupPolicy(t *testing.T) {
	t.Parallel()

	moduleDir := helpers.GetTerraformModulePath("gar")

	vars := helpers.DefaultGARVars()
	vars["cleanup_policy_keep_count"] = 10
	vars["cleanup_policy_delete_older_than_days"] = 30

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: moduleDir,
		Vars:         vars,
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	repoCount := helpers.CountResourcesByType(plan, "google_artifact_registry_repository")
	assert.Equal(t, 1, repoCount, "Expected 1 Artifact Registry Repository with cleanup policy")
}
