//go:build integration

package gcp_vpc_test

import (
	"strings"
	"testing"

	"github.com/DvwN-Lee/exam-platform/tests/terratest/helpers"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestGCPVPCIntegration_CreateAndDestroy tests actual VPC network creation and deletion
// This test requires GCP credentials and creates real resources
func TestGCPVPCIntegration_CreateAndDestroy(t *testing.T) {
	t.Parallel()

	// Integration Test 환경 확인
	projectID := helpers.GetIntegrationTestProjectID()
	require.NotEmpty(t, projectID, "GCP_PROJECT_ID environment variable must be set")

	opts := &helpers.TerraformIntegrationOptions{
		TerraformDir: helpers.GetTerraformModulePath("gcp-vpc"),
		Vars:         helpers.IntegrationTestGCPVPCVars(),
	}

	// terraform apply 및 destroy 실행
	outputs := helpers.RunTerraformIntegrationTest(t, opts)

	// Output 검증
	expectedOutputs := []string{
		"network_id",
		"network_name",
		"network_self_link",
		"public_subnet_id",
		"public_subnet_name",
		"private_subnet_id",
		"private_subnet_name",
		"pods_secondary_range_name",
		"services_secondary_range_name",
		"region",
	}
	helpers.ValidateIntegrationOutputs(t, outputs, expectedOutputs)

	// Region 검증
	region, ok := outputs["region"].(string)
	require.True(t, ok, "region should be a string")
	assert.Equal(t, helpers.GetIntegrationTestRegion(), region,
		"VPC should be in the configured region")

	// Network self-link 형식 검증
	selfLink, ok := outputs["network_self_link"].(string)
	require.True(t, ok, "network_self_link should be a string")
	assert.True(t, strings.Contains(selfLink, "compute.googleapis.com"),
		"Self-link should contain 'compute.googleapis.com'")
	assert.True(t, strings.Contains(selfLink, projectID),
		"Self-link should contain the project ID")
}

// TestGCPVPCIntegration_WithNAT tests VPC with Cloud NAT enabled
// Note: This may incur additional costs for NAT gateway
func TestGCPVPCIntegration_WithNAT(t *testing.T) {
	t.Parallel()

	projectID := helpers.GetIntegrationTestProjectID()
	require.NotEmpty(t, projectID, "GCP_PROJECT_ID environment variable must be set")

	vars := helpers.IntegrationTestGCPVPCVars()
	vars["enable_nat"] = true

	opts := &helpers.TerraformIntegrationOptions{
		TerraformDir: helpers.GetTerraformModulePath("gcp-vpc"),
		Vars:         vars,
	}

	outputs := helpers.RunTerraformIntegrationTest(t, opts)

	// NAT 관련 Output 검증
	expectedOutputs := []string{
		"network_id",
		"router_id",
		"router_name",
		"nat_id",
		"nat_name",
	}
	helpers.ValidateIntegrationOutputs(t, outputs, expectedOutputs)

	// Router 및 NAT 존재 확인
	routerName, ok := outputs["router_name"].(string)
	require.True(t, ok, "router_name should be a string")
	assert.NotEmpty(t, routerName, "Router name should not be empty")

	natName, ok := outputs["nat_name"].(string)
	require.True(t, ok, "nat_name should be a string")
	assert.NotEmpty(t, natName, "NAT name should not be empty")
}

// TestGCPVPCIntegration_MinimalConfig tests VPC with minimal configuration
// Uses the most cost-effective settings
func TestGCPVPCIntegration_MinimalConfig(t *testing.T) {
	t.Parallel()

	projectID := helpers.GetIntegrationTestProjectID()
	require.NotEmpty(t, projectID, "GCP_PROJECT_ID environment variable must be set")

	vars := helpers.IntegrationTestGCPVPCVars()
	// 최소 비용 설정
	vars["enable_nat"] = false
	vars["enable_iap_ssh"] = false
	vars["enable_gke_secondary_ranges"] = false
	vars["flow_sampling"] = 0.0

	opts := &helpers.TerraformIntegrationOptions{
		TerraformDir: helpers.GetTerraformModulePath("gcp-vpc"),
		Vars:         vars,
	}

	outputs := helpers.RunTerraformIntegrationTest(t, opts)

	// 기본 Output만 검증
	helpers.ValidateIntegrationOutputs(t, outputs, []string{
		"network_id",
		"public_subnet_id",
		"private_subnet_id",
	})
}
