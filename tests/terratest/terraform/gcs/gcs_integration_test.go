//go:build integration

package gcs_test

import (
	"testing"

	"github.com/DvwN-Lee/exam-platform/tests/terratest/helpers"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestGCSIntegration_CreateAndDestroy tests actual GCS bucket creation and deletion
// This test requires GCP credentials and creates real resources
func TestGCSIntegration_CreateAndDestroy(t *testing.T) {
	t.Parallel()

	// Integration Test 환경 확인
	projectID := helpers.GetIntegrationTestProjectID()
	require.NotEmpty(t, projectID, "GCP_PROJECT_ID environment variable must be set")

	opts := &helpers.TerraformIntegrationOptions{
		TerraformDir: helpers.GetTerraformModulePath("gcs"),
		Vars:         helpers.IntegrationTestGCSVars(),
	}

	// terraform apply 및 destroy 실행
	outputs := helpers.RunTerraformIntegrationTest(t, opts)

	// Output 검증
	expectedOutputs := []string{
		"bucket_id",
		"bucket_name",
		"bucket_url",
		"bucket_self_link",
		"bucket_location",
		"bucket_storage_class",
	}
	helpers.ValidateIntegrationOutputs(t, outputs, expectedOutputs)

	// 특정 Output 값 검증
	bucketLocation, ok := outputs["bucket_location"].(string)
	require.True(t, ok, "bucket_location should be a string")
	assert.Equal(t, "ASIA-NORTHEAST3", bucketLocation, "Bucket should be in ASIA-NORTHEAST3")

	storageClass, ok := outputs["bucket_storage_class"].(string)
	require.True(t, ok, "bucket_storage_class should be a string")
	assert.Equal(t, "STANDARD", storageClass, "Storage class should be STANDARD")
}

// TestGCSIntegration_WithVersioning tests GCS bucket with versioning enabled
func TestGCSIntegration_WithVersioning(t *testing.T) {
	t.Parallel()

	projectID := helpers.GetIntegrationTestProjectID()
	require.NotEmpty(t, projectID, "GCP_PROJECT_ID environment variable must be set")

	vars := helpers.IntegrationTestGCSVars()
	vars["versioning_enabled"] = true

	opts := &helpers.TerraformIntegrationOptions{
		TerraformDir: helpers.GetTerraformModulePath("gcs"),
		Vars:         vars,
	}

	outputs := helpers.RunTerraformIntegrationTest(t, opts)

	// Output 검증
	helpers.ValidateIntegrationOutputs(t, outputs, []string{"bucket_id", "bucket_name"})
}
