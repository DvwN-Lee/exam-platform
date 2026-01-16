package gke_test

import (
	"testing"

	"github.com/DvwN-Lee/exam-platform/tests/terratest/helpers"
	"github.com/stretchr/testify/assert"
)

func TestGKEModulePlanValidation(t *testing.T) {
	t.Parallel()

	moduleDir := helpers.GetTerraformModulePath("gke")

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: moduleDir,
		Vars:         helpers.DefaultGKEVars(),
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	// CI 환경에서는 plan이 nil이므로 리소스 검증 skip
	if plan == nil {
		t.Log("Skipping resource count validation in CI (validate-only mode)")
		return
	}

	// GKE Cluster 존재 확인
	clusterCount := helpers.CountResourcesByType(plan, "google_container_cluster")
	assert.Equal(t, 1, clusterCount, "Expected 1 GKE Cluster")

	// Node Pool 존재 확인
	nodePoolCount := helpers.CountResourcesByType(plan, "google_container_node_pool")
	assert.Equal(t, 1, nodePoolCount, "Expected 1 Node Pool")

	// Service Account 존재 확인
	saCount := helpers.CountResourcesByType(plan, "google_service_account")
	assert.Equal(t, 1, saCount, "Expected 1 Service Account for GKE nodes")
}

func TestGKEModuleOutputValidation(t *testing.T) {
	t.Parallel()

	moduleDir := helpers.GetTerraformModulePath("gke")

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: moduleDir,
		Vars:         helpers.DefaultGKEVars(),
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	// 필수 Output 검증
	expectedOutputs := []string{
		"cluster_id",
		"cluster_name",
		"cluster_location",
		"node_pool_name",
		"node_service_account_email",
		"workload_identity_pool",
	}

	helpers.ValidateOutputs(t, plan, expectedOutputs)
}

func TestGKEModuleIdempotency(t *testing.T) {
	t.Parallel()

	moduleDir := helpers.GetTerraformModulePath("gke")

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: moduleDir,
		Vars:         helpers.DefaultGKEVars(),
	}

	helpers.RunIdempotencyTest(t, opts)
}

func TestGKEModuleWithPrivateCluster(t *testing.T) {
	t.Parallel()

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: helpers.GetTerraformModulePath("gke"),
		Vars: helpers.MergeVars(helpers.DefaultGKEVars(), map[string]interface{}{
			"enable_private_nodes":    true,
			"enable_private_endpoint": true,
		}),
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	if plan == nil {
		t.Log("Skipping resource count validation in CI (validate-only mode)")
		return
	}

	clusterCount := helpers.CountResourcesByType(plan, "google_container_cluster")
	assert.Equal(t, 1, clusterCount, "Expected 1 GKE Cluster with private configuration")
}

func TestGKEModuleWithAutoscaling(t *testing.T) {
	t.Parallel()

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: helpers.GetTerraformModulePath("gke"),
		Vars: helpers.MergeVars(helpers.DefaultGKEVars(), map[string]interface{}{
			"min_node_count": 2,
			"max_node_count": 10,
		}),
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	if plan == nil {
		t.Log("Skipping resource count validation in CI (validate-only mode)")
		return
	}

	nodePoolCount := helpers.CountResourcesByType(plan, "google_container_node_pool")
	assert.Equal(t, 1, nodePoolCount, "Expected 1 Node Pool with autoscaling")
}

func TestGKEModuleWithCustomMachineType(t *testing.T) {
	t.Parallel()

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: helpers.GetTerraformModulePath("gke"),
		Vars: helpers.MergeVars(helpers.DefaultGKEVars(), map[string]interface{}{
			"node_machine_type":  "e2-standard-4",
			"node_disk_size_gb": 100,
		}),
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	if plan == nil {
		t.Log("Skipping resource count validation in CI (validate-only mode)")
		return
	}

	clusterCount := helpers.CountResourcesByType(plan, "google_container_cluster")
	assert.Equal(t, 1, clusterCount, "Expected 1 GKE Cluster with custom machine type")
}
