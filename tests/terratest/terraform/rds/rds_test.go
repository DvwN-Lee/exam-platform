package rds_test

import (
	"testing"

	"github.com/DvwN-Lee/exam-platform/tests/terratest/helpers"
	"github.com/stretchr/testify/assert"
)

func TestRDSModulePlanValidation(t *testing.T) {
	t.Parallel()

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: helpers.GetTerraformModulePath("rds"),
		Vars:         helpers.DefaultRDSVars(),
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	// RDS Instance 확인
	helpers.ValidateResourceExists(t, plan, "aws_db_instance.main")

	// Security Group 확인
	sgCount := helpers.CountResourcesByType(plan, "aws_security_group")
	assert.GreaterOrEqual(t, sgCount, 1, "Expected at least 1 Security Group for RDS")

	// Parameter Group 확인
	pgCount := helpers.CountResourcesByType(plan, "aws_db_parameter_group")
	assert.GreaterOrEqual(t, pgCount, 1, "Expected at least 1 Parameter Group")
}

func TestRDSModuleOutputValidation(t *testing.T) {
	t.Parallel()

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: helpers.GetTerraformModulePath("rds"),
		Vars:         helpers.DefaultRDSVars(),
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	expectedOutputs := []string{
		"db_instance_id",
		"db_instance_endpoint",
		"db_instance_address",
		"db_instance_port",
		"db_security_group_id",
	}

	helpers.ValidateOutputs(t, plan, expectedOutputs)
	helpers.ValidateNoSensitiveHardcoded(t, plan)
}

func TestRDSModuleIdempotency(t *testing.T) {
	t.Parallel()

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: helpers.GetTerraformModulePath("rds"),
		Vars:         helpers.DefaultRDSVars(),
	}

	helpers.RunIdempotencyTest(t, opts)
}

func TestRDSModuleEncryptionEnabled(t *testing.T) {
	t.Parallel()

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: helpers.GetTerraformModulePath("rds"),
		Vars: helpers.MergeVars(helpers.DefaultRDSVars(), map[string]interface{}{
			"identifier":                 "prod-db",
			"allowed_security_group_ids": []string{"sg-12345678"},
			"storage_encrypted":          true,
			"multi_az":                   true,
		}),
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	// RDS Instance 존재 확인
	helpers.ValidateResourceExists(t, plan, "aws_db_instance.main")
}

func TestRDSModuleMultiAZ(t *testing.T) {
	t.Parallel()

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: helpers.GetTerraformModulePath("rds"),
		Vars: helpers.MergeVars(helpers.DefaultRDSVars(), map[string]interface{}{
			"identifier":              "staging-db",
			"db_subnet_group_name":    "staging-db-subnet-group",
			"multi_az":                true,
			"backup_retention_period": 7,
		}),
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	helpers.ValidateResourceExists(t, plan, "aws_db_instance.main")
}
