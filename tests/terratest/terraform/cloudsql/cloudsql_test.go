package cloudsql_test

import (
	"testing"

	"github.com/DvwN-Lee/exam-platform/tests/terratest/helpers"
	"github.com/stretchr/testify/assert"
)

func TestCloudSQLModulePlanValidation(t *testing.T) {
	t.Parallel()

	moduleDir := helpers.GetTerraformModulePath("cloudsql")

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: moduleDir,
		Vars:         helpers.DefaultCloudSQLVars(),
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	// CI 환경에서는 plan이 nil이므로 리소스 검증 skip
	if plan == nil {
		t.Log("Skipping resource count validation in CI (validate-only mode)")
		return
	}

	// Cloud SQL Instance 존재 확인
	instanceCount := helpers.CountResourcesByType(plan, "google_sql_database_instance")
	assert.Equal(t, 1, instanceCount, "Expected 1 Cloud SQL Instance")

	// Database 존재 확인
	dbCount := helpers.CountResourcesByType(plan, "google_sql_database")
	assert.Equal(t, 1, dbCount, "Expected 1 Database")

	// User 존재 확인
	userCount := helpers.CountResourcesByType(plan, "google_sql_user")
	assert.Equal(t, 1, userCount, "Expected 1 Database User")

	// Random Password 존재 확인
	passwordCount := helpers.CountResourcesByType(plan, "random_password")
	assert.Equal(t, 1, passwordCount, "Expected 1 Random Password")
}

func TestCloudSQLModuleOutputValidation(t *testing.T) {
	t.Parallel()

	moduleDir := helpers.GetTerraformModulePath("cloudsql")

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: moduleDir,
		Vars:         helpers.DefaultCloudSQLVars(),
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	// 필수 Output 검증
	expectedOutputs := []string{
		"instance_id",
		"instance_name",
		"instance_connection_name",
		"database_name",
		"database_user",
	}

	helpers.ValidateOutputs(t, plan, expectedOutputs)
}

func TestCloudSQLModuleIdempotency(t *testing.T) {
	t.Parallel()

	moduleDir := helpers.GetTerraformModulePath("cloudsql")

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: moduleDir,
		Vars:         helpers.DefaultCloudSQLVars(),
	}

	helpers.RunIdempotencyTest(t, opts)
}

func TestCloudSQLModuleWithHighAvailability(t *testing.T) {
	t.Parallel()

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: helpers.GetTerraformModulePath("cloudsql"),
		Vars: helpers.MergeVars(helpers.DefaultCloudSQLVars(), map[string]interface{}{
			"availability_type": "REGIONAL",
			"tier":              "db-custom-2-4096",
		}),
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	// CI 환경에서는 plan이 nil이므로 리소스 검증 skip
	if plan == nil {
		t.Log("Skipping resource count validation in CI (validate-only mode)")
		return
	}

	instanceCount := helpers.CountResourcesByType(plan, "google_sql_database_instance")
	assert.Equal(t, 1, instanceCount, "Expected 1 Cloud SQL Instance with HA")
}

func TestCloudSQLModuleWithBackupDisabled(t *testing.T) {
	t.Parallel()

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: helpers.GetTerraformModulePath("cloudsql"),
		Vars: helpers.MergeVars(helpers.DefaultCloudSQLVars(), map[string]interface{}{
			"backup_enabled": false,
		}),
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	// CI 환경에서는 plan이 nil이므로 리소스 검증 skip
	if plan == nil {
		t.Log("Skipping resource count validation in CI (validate-only mode)")
		return
	}

	instanceCount := helpers.CountResourcesByType(plan, "google_sql_database_instance")
	assert.Equal(t, 1, instanceCount, "Expected 1 Cloud SQL Instance without backup")
}
