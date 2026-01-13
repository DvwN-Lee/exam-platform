package memorystore_test

import (
	"testing"

	"github.com/DvwN-Lee/exam-platform/tests/terratest/helpers"
	"github.com/stretchr/testify/assert"
)

func TestMemorystoreModulePlanValidation(t *testing.T) {
	t.Parallel()

	moduleDir := helpers.GetTerraformModulePath("memorystore")

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: moduleDir,
		Vars:         helpers.DefaultMemorystoreVars(),
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	// CI 환경에서는 plan이 nil이므로 리소스 검증 skip
	if plan == nil {
		t.Log("Skipping resource count validation in CI (validate-only mode)")
		return
	}

	// Redis Instance 존재 확인
	redisCount := helpers.CountResourcesByType(plan, "google_redis_instance")
	assert.Equal(t, 1, redisCount, "Expected 1 Redis Instance")
}

func TestMemorystoreModuleOutputValidation(t *testing.T) {
	t.Parallel()

	moduleDir := helpers.GetTerraformModulePath("memorystore")

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: moduleDir,
		Vars:         helpers.DefaultMemorystoreVars(),
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	// 필수 Output 검증
	expectedOutputs := []string{
		"instance_id",
		"instance_name",
		"host",
		"port",
		"redis_connection_string",
	}

	helpers.ValidateOutputs(t, plan, expectedOutputs)
}

func TestMemorystoreModuleIdempotency(t *testing.T) {
	t.Parallel()

	moduleDir := helpers.GetTerraformModulePath("memorystore")

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: moduleDir,
		Vars:         helpers.DefaultMemorystoreVars(),
	}

	helpers.RunIdempotencyTest(t, opts)
}

func TestMemorystoreModuleWithHighAvailability(t *testing.T) {
	t.Parallel()

	moduleDir := helpers.GetTerraformModulePath("memorystore")

	vars := helpers.DefaultMemorystoreVars()
	vars["tier"] = "STANDARD_HA"
	vars["memory_size_gb"] = 5

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: moduleDir,
		Vars:         vars,
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	// CI 환경에서는 plan이 nil이므로 리소스 검증 skip
	if plan == nil {
		t.Log("Skipping resource count validation in CI (validate-only mode)")
		return
	}

	redisCount := helpers.CountResourcesByType(plan, "google_redis_instance")
	assert.Equal(t, 1, redisCount, "Expected 1 Redis Instance with HA tier")
}

func TestMemorystoreModuleWithAuthDisabled(t *testing.T) {
	t.Parallel()

	moduleDir := helpers.GetTerraformModulePath("memorystore")

	vars := helpers.DefaultMemorystoreVars()
	vars["auth_enabled"] = false

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: moduleDir,
		Vars:         vars,
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	// CI 환경에서는 plan이 nil이므로 리소스 검증 skip
	if plan == nil {
		t.Log("Skipping resource count validation in CI (validate-only mode)")
		return
	}

	redisCount := helpers.CountResourcesByType(plan, "google_redis_instance")
	assert.Equal(t, 1, redisCount, "Expected 1 Redis Instance with auth disabled")
}
