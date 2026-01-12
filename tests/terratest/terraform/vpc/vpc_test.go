package vpc_test

import (
	"testing"

	"github.com/DvwN-Lee/exam-platform/tests/terratest/helpers"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestVPCModulePlanValidation(t *testing.T) {
	t.Parallel()

	moduleDir := helpers.GetTerraformModulePath("vpc")

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: moduleDir,
		Vars: map[string]interface{}{
			"environment": "dev",
			"vpc_cidr":           "10.0.0.0/16",
			"az_count":           2,
			"cluster_name":       "test-cluster",
			"enable_nat_gateway": true,
			"single_nat_gateway": true,
		},
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	// VPC Resource 존재 확인
	helpers.ValidateResourceExists(t, plan, "aws_vpc.main")

	// Subnet 개수 확인 (public 2개 + private 2개 + database 2개)
	subnetCount := helpers.CountResourcesByType(plan, "aws_subnet")
	assert.Equal(t, 6, subnetCount, "Expected 6 subnets (2 public + 2 private + 2 database)")
}

func TestVPCModuleOutputValidation(t *testing.T) {
	t.Parallel()

	moduleDir := helpers.GetTerraformModulePath("vpc")

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: moduleDir,
		Vars: map[string]interface{}{
			"environment": "dev",
			"vpc_cidr":           "10.0.0.0/16",
			"az_count":           2,
			"cluster_name":       "dev-cluster",
			"enable_nat_gateway": false,
			"single_nat_gateway": true,
		},
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	// 필수 Output 검증
	expectedOutputs := []string{
		"vpc_id",
		"public_subnet_ids",
		"private_subnet_ids",
		"database_subnet_ids",
		"db_subnet_group_name",
		"elasticache_subnet_group_name",
	}

	helpers.ValidateOutputs(t, plan, expectedOutputs)
}

func TestVPCModuleIdempotency(t *testing.T) {
	t.Parallel()

	moduleDir := helpers.GetTerraformModulePath("vpc")

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: moduleDir,
		Vars: map[string]interface{}{
			"environment": "dev",
			"vpc_cidr":           "10.0.0.0/16",
			"az_count":           2,
			"cluster_name":       "test-cluster",
			"enable_nat_gateway": true,
			"single_nat_gateway": true,
		},
	}

	helpers.RunIdempotencyTest(t, opts)
}

func TestVPCModuleWithThreeAZs(t *testing.T) {
	t.Parallel()

	moduleDir := helpers.GetTerraformModulePath("vpc")

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: moduleDir,
		Vars: map[string]interface{}{
			"environment":        "prod",
			"vpc_cidr":           "10.2.0.0/16",
			"az_count":           3,
			"cluster_name":       "prod-cluster",
			"enable_nat_gateway": true,
			"single_nat_gateway": false,
		},
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	// 3 AZ 환경에서 Subnet 개수 확인 (9개)
	subnetCount := helpers.CountResourcesByType(plan, "aws_subnet")
	assert.Equal(t, 9, subnetCount, "Expected 9 subnets (3 public + 3 private + 3 database)")

	// NAT Gateway 개수 확인 (single_nat_gateway=false이므로 3개)
	natCount := helpers.CountResourcesByType(plan, "aws_nat_gateway")
	assert.Equal(t, 3, natCount, "Expected 3 NAT Gateways for 3 AZs")
}

func TestVPCModuleNATGatewayDisabled(t *testing.T) {
	t.Parallel()

	moduleDir := helpers.GetTerraformModulePath("vpc")

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: moduleDir,
		Vars: map[string]interface{}{
			"environment":        "dev",
			"vpc_cidr":           "10.0.0.0/16",
			"az_count":           2,
			"cluster_name":       "dev-cluster",
			"enable_nat_gateway": false,
		},
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	// NAT Gateway 비활성화 시 0개
	natCount := helpers.CountResourcesByType(plan, "aws_nat_gateway")
	assert.Equal(t, 0, natCount, "Expected 0 NAT Gateways when disabled")
}

func TestVPCModuleInternetGateway(t *testing.T) {
	t.Parallel()

	moduleDir := helpers.GetTerraformModulePath("vpc")

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: moduleDir,
		Vars: map[string]interface{}{
			"environment": "dev",
			"vpc_cidr":           "10.0.0.0/16",
			"az_count":           2,
			"cluster_name":       "test-cluster",
			"enable_nat_gateway": true,
			"single_nat_gateway": true,
		},
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	// Internet Gateway 존재 확인
	igwCount := helpers.CountResourcesByType(plan, "aws_internet_gateway")
	require.Equal(t, 1, igwCount, "Expected 1 Internet Gateway")
}
