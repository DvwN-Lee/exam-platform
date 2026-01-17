//go:build integration

package gar_test

import (
	"strings"
	"testing"

	"github.com/DvwN-Lee/exam-platform/tests/terratest/helpers"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestGARIntegration_CreateAndDestroy tests actual Artifact Registry creation and deletion
// This test requires GCP credentials and creates real resources
func TestGARIntegration_CreateAndDestroy(t *testing.T) {
	t.Parallel()

	// Integration Test 환경 확인
	projectID := helpers.GetIntegrationTestProjectID()
	require.NotEmpty(t, projectID, "GCP_PROJECT_ID environment variable must be set")

	opts := &helpers.TerraformIntegrationOptions{
		TerraformDir: helpers.GetTerraformModulePath("gar"),
		Vars:         helpers.IntegrationTestGARVars(),
	}

	// terraform apply 및 destroy 실행
	outputs := helpers.RunTerraformIntegrationTest(t, opts)

	// Output 검증
	expectedOutputs := []string{
		"repository_id",
		"repository_name",
		"repository_url",
		"repository_location",
		"repository_format",
	}
	helpers.ValidateIntegrationOutputs(t, outputs, expectedOutputs)

	// 특정 Output 값 검증
	repoFormat, ok := outputs["repository_format"].(string)
	require.True(t, ok, "repository_format should be a string")
	assert.Equal(t, "DOCKER", repoFormat, "Repository format should be DOCKER")

	repoLocation, ok := outputs["repository_location"].(string)
	require.True(t, ok, "repository_location should be a string")
	assert.Equal(t, helpers.GetIntegrationTestRegion(), repoLocation,
		"Repository should be in the configured region")

	// Repository URL 형식 검증
	repoURL, ok := outputs["repository_url"].(string)
	require.True(t, ok, "repository_url should be a string")
	assert.True(t, strings.Contains(repoURL, "-docker.pkg.dev"),
		"Repository URL should contain '-docker.pkg.dev'")
}

// TestGARIntegration_WithImmutableTags tests GAR with immutable tags enabled
func TestGARIntegration_WithImmutableTags(t *testing.T) {
	t.Parallel()

	projectID := helpers.GetIntegrationTestProjectID()
	require.NotEmpty(t, projectID, "GCP_PROJECT_ID environment variable must be set")

	vars := helpers.IntegrationTestGARVars()
	vars["immutable_tags"] = true

	opts := &helpers.TerraformIntegrationOptions{
		TerraformDir: helpers.GetTerraformModulePath("gar"),
		Vars:         vars,
	}

	outputs := helpers.RunTerraformIntegrationTest(t, opts)

	// Output 검증
	helpers.ValidateIntegrationOutputs(t, outputs, []string{"repository_id", "repository_name"})
}
