package rds_test

import (
	"testing"

	"github.com/DvwN-Lee/exam-platform/tests/terratest/helpers"
	"github.com/stretchr/testify/assert"
)

func TestRDSModulePlanValidation(t *testing.T) {
	t.Parallel()

	moduleDir := helpers.GetTerraformModulePath("rds")

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: moduleDir,
		Vars: map[string]interface{}{
			"identifier":            "test-db",
			"engine":                "postgres",
			"engine_version":        "15.4",
			"instance_class":        "db.t3.medium",
			"allocated_storage":     20,
			"db_name":               "examdb",
			"db_username":           "examadmin",
			"vpc_id":                "vpc-12345678",
			"subnet_ids":            []string{"subnet-1", "subnet-2"},
			"db_subnet_group_name":  "test-db-subnet-group",
			"allowed_security_groups": []string{"sg-12345678"},
		},
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

	moduleDir := helpers.GetTerraformModulePath("rds")

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: moduleDir,
		Vars: map[string]interface{}{
			"identifier":            "test-db",
			"engine":                "postgres",
			"engine_version":        "15.4",
			"instance_class":        "db.t3.medium",
			"allocated_storage":     20,
			"db_name":               "examdb",
			"db_username":           "examadmin",
			"vpc_id":                "vpc-12345678",
			"subnet_ids":            []string{"subnet-1", "subnet-2"},
			"db_subnet_group_name":  "test-db-subnet-group",
			"allowed_security_groups": []string{"sg-12345678"},
		},
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

	moduleDir := helpers.GetTerraformModulePath("rds")

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: moduleDir,
		Vars: map[string]interface{}{
			"identifier":            "test-db",
			"engine":                "postgres",
			"engine_version":        "15.4",
			"instance_class":        "db.t3.medium",
			"allocated_storage":     20,
			"db_name":               "examdb",
			"db_username":           "examadmin",
			"vpc_id":                "vpc-12345678",
			"subnet_ids":            []string{"subnet-1", "subnet-2"},
			"db_subnet_group_name":  "test-db-subnet-group",
			"allowed_security_groups": []string{"sg-12345678"},
		},
	}

	helpers.RunIdempotencyTest(t, opts)
}

func TestRDSModuleEncryptionEnabled(t *testing.T) {
	t.Parallel()

	moduleDir := helpers.GetTerraformModulePath("rds")

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: moduleDir,
		Vars: map[string]interface{}{
			"environment":           "prod",
			"identifier":            "prod-db",
			"engine":                "postgres",
			"engine_version":        "15.4",
			"instance_class":        "db.r6g.large",
			"allocated_storage":     100,
			"max_allocated_storage": 500,
			"db_name":               "examdb",
			"db_username":           "examadmin",
			"vpc_id":                "vpc-12345678",
			"subnet_ids":            []string{"subnet-1", "subnet-2", "subnet-3"},
			"db_subnet_group_name":  "prod-db-subnet-group",
			"allowed_security_groups": []string{"sg-12345678"},
			"storage_encrypted":     true,
			"multi_az":              true,
		},
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	// RDS Instance 존재 확인
	helpers.ValidateResourceExists(t, plan, "aws_db_instance.main")
}

func TestRDSModuleMultiAZ(t *testing.T) {
	t.Parallel()

	moduleDir := helpers.GetTerraformModulePath("rds")

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: moduleDir,
		Vars: map[string]interface{}{
			"environment":           "staging",
			"identifier":            "staging-db",
			"engine":                "postgres",
			"engine_version":        "15.4",
			"instance_class":        "db.t3.large",
			"allocated_storage":     50,
			"db_name":               "examdb",
			"db_username":           "examadmin",
			"vpc_id":                "vpc-12345678",
			"subnet_ids":            []string{"subnet-1", "subnet-2"},
			"db_subnet_group_name":  "staging-db-subnet-group",
			"allowed_security_groups": []string{"sg-12345678"},
			"multi_az":              true,
			"backup_retention_period": 7,
		},
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	helpers.ValidateResourceExists(t, plan, "aws_db_instance.main")
}
