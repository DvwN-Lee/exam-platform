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

	moduleDir := helpers.GetTerraformModulePath("gke")

	vars := helpers.DefaultGKEVars()
	vars["enable_private_nodes"] = true
	vars["enable_private_endpoint"] = true

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: moduleDir,
		Vars:         vars,
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	clusterCount := helpers.CountResourcesByType(plan, "google_container_cluster")
	assert.Equal(t, 1, clusterCount, "Expected 1 GKE Cluster with private configuration")
}

func TestGKEModuleWithAutoscaling(t *testing.T) {
	t.Parallel()

	moduleDir := helpers.GetTerraformModulePath("gke")

	vars := helpers.DefaultGKEVars()
	vars["min_node_count"] = 2
	vars["max_node_count"] = 10

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: moduleDir,
		Vars:         vars,
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	nodePoolCount := helpers.CountResourcesByType(plan, "google_container_node_pool")
	assert.Equal(t, 1, nodePoolCount, "Expected 1 Node Pool with autoscaling")
}

func TestGKEModuleWithCustomMachineType(t *testing.T) {
	t.Parallel()

	moduleDir := helpers.GetTerraformModulePath("gke")

	vars := helpers.DefaultGKEVars()
	vars["node_machine_type"] = "e2-standard-4"
	vars["node_disk_size_gb"] = 100

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: moduleDir,
		Vars:         vars,
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	clusterCount := helpers.CountResourcesByType(plan, "google_container_cluster")
	assert.Equal(t, 1, clusterCount, "Expected 1 GKE Cluster with custom machine type")
}
