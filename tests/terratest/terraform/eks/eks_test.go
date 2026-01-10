package eks_test

import (
	"testing"

	"github.com/DvwN-Lee/exam-platform/tests/terratest/helpers"
	"github.com/stretchr/testify/assert"
)

func TestEKSModulePlanValidation(t *testing.T) {
	t.Parallel()

	moduleDir := helpers.GetTerraformModulePath("eks")

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: moduleDir,
		Vars: map[string]interface{}{
			"environment":         "test",
			"cluster_name":        "test-eks-cluster",
			"cluster_version":     "1.29",
			"vpc_id":              "vpc-12345678",
			"subnet_ids":          []string{"subnet-1", "subnet-2"},
			"node_subnet_ids":     []string{"subnet-1", "subnet-2"},
			"node_instance_types": []string{"t3.medium"},
			"node_desired_size":   2,
			"node_min_size":       1,
			"node_max_size":       3,
		},
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	// EKS Cluster Resource 확인
	helpers.ValidateResourceExists(t, plan, "aws_eks_cluster.main")

	// Node Group 확인
	helpers.ValidateResourceExists(t, plan, "aws_eks_node_group.main")

	// IAM Role 확인
	clusterRoleCount := helpers.CountResourcesByType(plan, "aws_iam_role")
	assert.GreaterOrEqual(t, clusterRoleCount, 2, "Expected at least 2 IAM Roles (cluster + node)")

	// Security Group 확인
	sgCount := helpers.CountResourcesByType(plan, "aws_security_group")
	assert.GreaterOrEqual(t, sgCount, 2, "Expected at least 2 Security Groups")
}

func TestEKSModuleOutputValidation(t *testing.T) {
	t.Parallel()

	moduleDir := helpers.GetTerraformModulePath("eks")

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: moduleDir,
		Vars: map[string]interface{}{
			"environment":         "test",
			"cluster_name":        "test-eks-cluster",
			"cluster_version":     "1.29",
			"vpc_id":              "vpc-12345678",
			"subnet_ids":          []string{"subnet-1", "subnet-2"},
			"node_subnet_ids":     []string{"subnet-1", "subnet-2"},
			"node_instance_types": []string{"t3.medium"},
			"node_desired_size":   2,
			"node_min_size":       1,
			"node_max_size":       3,
		},
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	expectedOutputs := []string{
		"cluster_id",
		"cluster_name",
		"cluster_endpoint",
		"cluster_certificate_authority_data",
		"cluster_security_group_id",
		"node_security_group_id",
		"oidc_provider_arn",
	}

	helpers.ValidateOutputs(t, plan, expectedOutputs)

	// Sensitive output 검증
	helpers.ValidateNoSensitiveHardcoded(t, plan)
}

func TestEKSModuleIdempotency(t *testing.T) {
	t.Parallel()

	moduleDir := helpers.GetTerraformModulePath("eks")

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: moduleDir,
		Vars: map[string]interface{}{
			"environment":         "test",
			"cluster_name":        "test-eks-cluster",
			"cluster_version":     "1.29",
			"vpc_id":              "vpc-12345678",
			"subnet_ids":          []string{"subnet-1", "subnet-2"},
			"node_subnet_ids":     []string{"subnet-1", "subnet-2"},
			"node_instance_types": []string{"t3.medium"},
			"node_desired_size":   2,
			"node_min_size":       1,
			"node_max_size":       3,
		},
	}

	helpers.RunIdempotencyTest(t, opts)
}

func TestEKSModuleSpotInstances(t *testing.T) {
	t.Parallel()

	moduleDir := helpers.GetTerraformModulePath("eks")

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: moduleDir,
		Vars: map[string]interface{}{
			"environment":         "dev",
			"cluster_name":        "dev-eks-cluster",
			"cluster_version":     "1.29",
			"vpc_id":              "vpc-12345678",
			"subnet_ids":          []string{"subnet-1", "subnet-2"},
			"node_subnet_ids":     []string{"subnet-1", "subnet-2"},
			"node_instance_types": []string{"t3.medium", "t3.large"},
			"capacity_type":       "SPOT",
			"node_desired_size":   2,
			"node_min_size":       1,
			"node_max_size":       5,
		},
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	// Node Group이 존재하는지 확인
	helpers.ValidateResourceExists(t, plan, "aws_eks_node_group.main")
}

func TestEKSModulePublicAccessDisabled(t *testing.T) {
	t.Parallel()

	moduleDir := helpers.GetTerraformModulePath("eks")

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: moduleDir,
		Vars: map[string]interface{}{
			"environment":            "prod",
			"cluster_name":           "prod-eks-cluster",
			"cluster_version":        "1.29",
			"vpc_id":                 "vpc-12345678",
			"subnet_ids":             []string{"subnet-1", "subnet-2", "subnet-3"},
			"node_subnet_ids":        []string{"subnet-1", "subnet-2", "subnet-3"},
			"node_instance_types":    []string{"t3.xlarge"},
			"endpoint_public_access": false,
			"node_desired_size":      3,
			"node_min_size":          3,
			"node_max_size":          10,
		},
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	// Cluster가 존재하는지 확인
	helpers.ValidateResourceExists(t, plan, "aws_eks_cluster.main")
}
