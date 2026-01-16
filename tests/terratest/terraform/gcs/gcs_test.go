package gcs_test

import (
	"testing"

	"github.com/DvwN-Lee/exam-platform/tests/terratest/helpers"
	"github.com/stretchr/testify/assert"
)

func TestGCSModulePlanValidation(t *testing.T) {
	t.Parallel()

	moduleDir := helpers.GetTerraformModulePath("gcs")

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: moduleDir,
		Vars:         helpers.DefaultGCSVars(),
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	// CI 환경에서는 plan이 nil이므로 리소스 검증 skip
	if plan == nil {
		t.Log("Skipping resource count validation in CI (validate-only mode)")
		return
	}

	// Storage Bucket 존재 확인
	bucketCount := helpers.CountResourcesByType(plan, "google_storage_bucket")
	assert.Equal(t, 1, bucketCount, "Expected 1 Storage Bucket")
}

func TestGCSModuleOutputValidation(t *testing.T) {
	t.Parallel()

	moduleDir := helpers.GetTerraformModulePath("gcs")

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: moduleDir,
		Vars:         helpers.DefaultGCSVars(),
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	// 필수 Output 검증
	expectedOutputs := []string{
		"bucket_id",
		"bucket_name",
		"bucket_url",
		"bucket_self_link",
		"bucket_location",
		"bucket_storage_class",
	}

	helpers.ValidateOutputs(t, plan, expectedOutputs)
}

func TestGCSModuleIdempotency(t *testing.T) {
	t.Parallel()

	moduleDir := helpers.GetTerraformModulePath("gcs")

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: moduleDir,
		Vars:         helpers.DefaultGCSVars(),
	}

	helpers.RunIdempotencyTest(t, opts)
}

func TestGCSModuleWithVersioningDisabled(t *testing.T) {
	t.Parallel()

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: helpers.GetTerraformModulePath("gcs"),
		Vars: helpers.MergeVars(helpers.DefaultGCSVars(), map[string]interface{}{
			"versioning_enabled": false,
		}),
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	// CI 환경에서는 plan이 nil이므로 리소스 검증 skip
	if plan == nil {
		t.Log("Skipping resource count validation in CI (validate-only mode)")
		return
	}

	bucketCount := helpers.CountResourcesByType(plan, "google_storage_bucket")
	assert.Equal(t, 1, bucketCount, "Expected 1 Storage Bucket with versioning disabled")
}

func TestGCSModuleWithLifecyclePolicy(t *testing.T) {
	t.Parallel()

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: helpers.GetTerraformModulePath("gcs"),
		Vars: helpers.MergeVars(helpers.DefaultGCSVars(), map[string]interface{}{
			"lifecycle_age_days": 90,
		}),
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	// CI 환경에서는 plan이 nil이므로 리소스 검증 skip
	if plan == nil {
		t.Log("Skipping resource count validation in CI (validate-only mode)")
		return
	}

	bucketCount := helpers.CountResourcesByType(plan, "google_storage_bucket")
	assert.Equal(t, 1, bucketCount, "Expected 1 Storage Bucket with lifecycle policy")
}

func TestGCSModuleWithDifferentStorageClass(t *testing.T) {
	t.Parallel()

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: helpers.GetTerraformModulePath("gcs"),
		Vars: helpers.MergeVars(helpers.DefaultGCSVars(), map[string]interface{}{
			"storage_class": "NEARLINE",
		}),
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	// CI 환경에서는 plan이 nil이므로 리소스 검증 skip
	if plan == nil {
		t.Log("Skipping resource count validation in CI (validate-only mode)")
		return
	}

	bucketCount := helpers.CountResourcesByType(plan, "google_storage_bucket")
	assert.Equal(t, 1, bucketCount, "Expected 1 Storage Bucket with NEARLINE storage class")
}
