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

	// Cloud SQL Instance 존재 확인 (주소 기반 검색으로 정확히 매칭)
	instanceCount := helpers.CountResourcesByType(plan, "google_sql_database_instance.main")
	assert.Equal(t, 1, instanceCount, "Expected 1 Cloud SQL Instance")

	// Database 존재 확인 (주소 기반 검색으로 정확히 매칭)
	dbCount := helpers.CountResourcesByType(plan, "google_sql_database.main")
	assert.Equal(t, 1, dbCount, "Expected 1 Database")

	// User 존재 확인 (주소 기반 검색으로 정확히 매칭)
	userCount := helpers.CountResourcesByType(plan, "google_sql_user.main")
	assert.Equal(t, 1, userCount, "Expected 1 Database User")

	// Random Password 존재 확인 (주소 기반 검색으로 정확히 매칭)
	passwordCount := helpers.CountResourcesByType(plan, "random_password.db_password")
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

	instanceCount := helpers.CountResourcesByType(plan, "google_sql_database_instance.main")
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

	instanceCount := helpers.CountResourcesByType(plan, "google_sql_database_instance.main")
	assert.Equal(t, 1, instanceCount, "Expected 1 Cloud SQL Instance without backup")
}

func TestCloudSQLModuleWithSecretManager(t *testing.T) {
	t.Parallel()

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: helpers.GetTerraformModulePath("cloudsql"),
		Vars: helpers.MergeVars(helpers.DefaultCloudSQLVars(), map[string]interface{}{
			"enable_secret_manager": true,
		}),
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	// CI 환경에서는 plan이 nil이므로 리소스 검증 skip
	if plan == nil {
		t.Log("Skipping resource count validation in CI (validate-only mode)")
		return
	}

	// Secret Manager Secret 존재 확인 (주소 기반 검색으로 정확히 매칭)
	secretCount := helpers.CountResourcesByType(plan, "google_secret_manager_secret.db_password")
	assert.Equal(t, 1, secretCount, "Expected 1 Secret Manager Secret")

	// Secret Manager Secret Version 존재 확인
	secretVersionCount := helpers.CountResourcesByType(plan, "google_secret_manager_secret_version.db_password")
	assert.Equal(t, 1, secretVersionCount, "Expected 1 Secret Manager Secret Version")
}

func TestCloudSQLModuleWithSecretManagerOutputs(t *testing.T) {
	t.Parallel()

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: helpers.GetTerraformModulePath("cloudsql"),
		Vars: helpers.MergeVars(helpers.DefaultCloudSQLVars(), map[string]interface{}{
			"enable_secret_manager": true,
		}),
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	// Secret Manager 관련 Output 검증
	expectedOutputs := []string{
		"secret_manager_secret_id",
		"secret_manager_secret_name",
		"secret_manager_secret_version",
	}

	helpers.ValidateOutputs(t, plan, expectedOutputs)
}

func TestCloudSQLModuleWithCustomSecretId(t *testing.T) {
	t.Parallel()

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: helpers.GetTerraformModulePath("cloudsql"),
		Vars: helpers.MergeVars(helpers.DefaultCloudSQLVars(), map[string]interface{}{
			"enable_secret_manager":    true,
			"secret_manager_secret_id": "custom-db-password-secret",
		}),
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	// CI 환경에서는 plan이 nil이므로 리소스 검증 skip
	if plan == nil {
		t.Log("Skipping resource count validation in CI (validate-only mode)")
		return
	}

	// Secret Manager Secret 존재 확인 (주소 기반 검색으로 정확히 매칭)
	secretCount := helpers.CountResourcesByType(plan, "google_secret_manager_secret.db_password")
	assert.Equal(t, 1, secretCount, "Expected 1 Secret Manager Secret with custom ID")
}

func TestCloudSQLModuleWithSecretManagerDisabled(t *testing.T) {
	t.Parallel()

	// DefaultCloudSQLVars()는 enable_secret_manager: false가 기본값
	opts := &helpers.TerraformPlanOptions{
		TerraformDir: helpers.GetTerraformModulePath("cloudsql"),
		Vars:         helpers.DefaultCloudSQLVars(),
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	// CI 환경에서는 plan이 nil이므로 리소스 검증 skip
	if plan == nil {
		t.Log("Skipping resource count validation in CI (validate-only mode)")
		return
	}

	// Secret Manager 비활성화 시 리소스가 생성되지 않음을 검증
	secretCount := helpers.CountResourcesByType(plan, "google_secret_manager_secret.db_password")
	assert.Equal(t, 0, secretCount, "Expected 0 Secret Manager Secret when disabled")

	secretVersionCount := helpers.CountResourcesByType(plan, "google_secret_manager_secret_version.db_password")
	assert.Equal(t, 0, secretVersionCount, "Expected 0 Secret Manager Secret Version when disabled")
}

func TestCloudSQLModuleWithWorkloadIdentity(t *testing.T) {
	t.Parallel()

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: helpers.GetTerraformModulePath("cloudsql"),
		Vars: helpers.MergeVars(helpers.DefaultCloudSQLVars(), map[string]interface{}{
			"enable_secret_manager":    true,
			"enable_workload_identity": true,
			"workload_identity_config": helpers.DefaultWorkloadIdentityConfig(),
		}),
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	// CI 환경에서는 plan이 nil이므로 리소스 검증 skip
	if plan == nil {
		t.Log("Skipping resource count validation in CI (validate-only mode)")
		return
	}

	// GSA 존재 확인
	gsaCount := helpers.CountResourcesByType(plan, "google_service_account.secret_accessor")
	assert.Equal(t, 1, gsaCount, "Expected 1 Google Service Account for Secret Accessor")

	// KSA-GSA Binding 존재 확인
	bindingCount := helpers.CountResourcesByType(plan, "google_service_account_iam_member.workload_identity_binding")
	assert.Equal(t, 1, bindingCount, "Expected 1 Workload Identity IAM Binding")

	// Secret IAM 존재 확인
	secretIamCount := helpers.CountResourcesByType(plan, "google_secret_manager_secret_iam_member.secret_accessor")
	assert.Equal(t, 1, secretIamCount, "Expected 1 Secret Manager IAM Member")
}

func TestCloudSQLModuleWithWorkloadIdentityDisabled(t *testing.T) {
	t.Parallel()

	// Secret Manager만 활성화, Workload Identity는 비활성화
	opts := &helpers.TerraformPlanOptions{
		TerraformDir: helpers.GetTerraformModulePath("cloudsql"),
		Vars: helpers.MergeVars(helpers.DefaultCloudSQLVars(), map[string]interface{}{
			"enable_secret_manager":    true,
			"enable_workload_identity": false,
		}),
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	// CI 환경에서는 plan이 nil이므로 리소스 검증 skip
	if plan == nil {
		t.Log("Skipping resource count validation in CI (validate-only mode)")
		return
	}

	// Workload Identity 비활성화 시 IAM 리소스가 생성되지 않음을 검증
	gsaCount := helpers.CountResourcesByType(plan, "google_service_account.secret_accessor")
	assert.Equal(t, 0, gsaCount, "Expected 0 Google Service Account when Workload Identity disabled")

	bindingCount := helpers.CountResourcesByType(plan, "google_service_account_iam_member.workload_identity_binding")
	assert.Equal(t, 0, bindingCount, "Expected 0 Workload Identity IAM Binding when disabled")

	secretIamCount := helpers.CountResourcesByType(plan, "google_secret_manager_secret_iam_member.secret_accessor")
	assert.Equal(t, 0, secretIamCount, "Expected 0 Secret Manager IAM Member when Workload Identity disabled")
}

func TestCloudSQLModuleWithWorkloadIdentityOutputs(t *testing.T) {
	t.Parallel()

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: helpers.GetTerraformModulePath("cloudsql"),
		Vars: helpers.MergeVars(helpers.DefaultCloudSQLVars(), map[string]interface{}{
			"enable_secret_manager":    true,
			"enable_workload_identity": true,
			"workload_identity_config": helpers.DefaultWorkloadIdentityConfig(),
		}),
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	// Workload Identity 관련 Output 검증
	expectedOutputs := []string{
		"secret_accessor_sa_email",
		"workload_identity_annotation",
	}

	helpers.ValidateOutputs(t, plan, expectedOutputs)
}
