package elasticache_test

import (
	"testing"

	"github.com/DvwN-Lee/exam-platform/tests/terratest/helpers"
	"github.com/stretchr/testify/assert"
)

func TestElastiCacheModulePlanValidation(t *testing.T) {
	t.Parallel()

	moduleDir := helpers.GetTerraformModulePath("elasticache")

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: moduleDir,
		Vars: map[string]interface{}{
			"environment":              "test",
			"cluster_id":               "test-redis",
			"engine":                   "redis",
			"engine_version":           "7.0",
			"node_type":                "cache.t3.micro",
			"num_cache_nodes":          1,
			"vpc_id":                   "vpc-12345678",
			"subnet_ids":               []string{"subnet-1", "subnet-2"},
			"elasticache_subnet_group": "test-cache-subnet",
			"allowed_security_groups":  []string{"sg-12345678"},
		},
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	// ElastiCache Replication Group 또는 Cluster 확인
	replicationGroupCount := helpers.CountResourcesByType(plan, "aws_elasticache_replication_group")
	clusterCount := helpers.CountResourcesByType(plan, "aws_elasticache_cluster")

	assert.True(t, replicationGroupCount >= 1 || clusterCount >= 1,
		"Expected at least 1 ElastiCache Replication Group or Cluster")

	// Security Group 확인
	sgCount := helpers.CountResourcesByType(plan, "aws_security_group")
	assert.GreaterOrEqual(t, sgCount, 1, "Expected at least 1 Security Group for ElastiCache")
}

func TestElastiCacheModuleOutputValidation(t *testing.T) {
	t.Parallel()

	moduleDir := helpers.GetTerraformModulePath("elasticache")

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: moduleDir,
		Vars: map[string]interface{}{
			"environment":              "test",
			"cluster_id":               "test-redis",
			"engine":                   "redis",
			"engine_version":           "7.0",
			"node_type":                "cache.t3.micro",
			"num_cache_nodes":          1,
			"vpc_id":                   "vpc-12345678",
			"subnet_ids":               []string{"subnet-1", "subnet-2"},
			"elasticache_subnet_group": "test-cache-subnet",
			"allowed_security_groups":  []string{"sg-12345678"},
		},
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	expectedOutputs := []string{
		"redis_endpoint",
		"redis_port",
		"redis_security_group_id",
	}

	helpers.ValidateOutputs(t, plan, expectedOutputs)
}

func TestElastiCacheModuleIdempotency(t *testing.T) {
	t.Parallel()

	moduleDir := helpers.GetTerraformModulePath("elasticache")

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: moduleDir,
		Vars: map[string]interface{}{
			"environment":              "test",
			"cluster_id":               "test-redis",
			"engine":                   "redis",
			"engine_version":           "7.0",
			"node_type":                "cache.t3.micro",
			"num_cache_nodes":          1,
			"vpc_id":                   "vpc-12345678",
			"subnet_ids":               []string{"subnet-1", "subnet-2"},
			"elasticache_subnet_group": "test-cache-subnet",
			"allowed_security_groups":  []string{"sg-12345678"},
		},
	}

	helpers.RunIdempotencyTest(t, opts)
}

func TestElastiCacheModuleReplicationGroup(t *testing.T) {
	t.Parallel()

	moduleDir := helpers.GetTerraformModulePath("elasticache")

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: moduleDir,
		Vars: map[string]interface{}{
			"environment":              "prod",
			"cluster_id":               "prod-redis",
			"engine":                   "redis",
			"engine_version":           "7.0",
			"node_type":                "cache.r6g.large",
			"num_cache_nodes":          2,
			"vpc_id":                   "vpc-12345678",
			"subnet_ids":               []string{"subnet-1", "subnet-2", "subnet-3"},
			"elasticache_subnet_group": "prod-cache-subnet",
			"allowed_security_groups":  []string{"sg-12345678"},
			"automatic_failover":       true,
			"multi_az_enabled":         true,
			"at_rest_encryption":       true,
			"transit_encryption":       true,
		},
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	// Replication Group 확인
	replicationGroupCount := helpers.CountResourcesByType(plan, "aws_elasticache_replication_group")
	assert.GreaterOrEqual(t, replicationGroupCount, 1, "Expected at least 1 Replication Group for HA setup")
}

func TestElastiCacheModuleAuthToken(t *testing.T) {
	t.Parallel()

	moduleDir := helpers.GetTerraformModulePath("elasticache")

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: moduleDir,
		Vars: map[string]interface{}{
			"environment":              "staging",
			"cluster_id":               "staging-redis",
			"engine":                   "redis",
			"engine_version":           "7.0",
			"node_type":                "cache.t3.medium",
			"num_cache_nodes":          1,
			"vpc_id":                   "vpc-12345678",
			"subnet_ids":               []string{"subnet-1", "subnet-2"},
			"elasticache_subnet_group": "staging-cache-subnet",
			"allowed_security_groups":  []string{"sg-12345678"},
			"transit_encryption":       true,
		},
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	helpers.ValidateNoSensitiveHardcoded(t, plan)
}
