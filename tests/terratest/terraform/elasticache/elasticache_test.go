package elasticache_test

import (
	"testing"

	"github.com/DvwN-Lee/exam-platform/tests/terratest/helpers"
	"github.com/stretchr/testify/assert"
)

func TestElastiCacheModulePlanValidation(t *testing.T) {
	t.Parallel()

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: helpers.GetTerraformModulePath("elasticache"),
		Vars:         helpers.DefaultElastiCacheVars(),
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	// ElastiCache Replication Group 확인
	replicationGroupCount := helpers.CountResourcesByType(plan, "aws_elasticache_replication_group")
	assert.GreaterOrEqual(t, replicationGroupCount, 1, "Expected at least 1 ElastiCache Replication Group")

	// Security Group 확인
	sgCount := helpers.CountResourcesByType(plan, "aws_security_group")
	assert.GreaterOrEqual(t, sgCount, 1, "Expected at least 1 Security Group for ElastiCache")
}

func TestElastiCacheModuleOutputValidation(t *testing.T) {
	t.Parallel()

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: helpers.GetTerraformModulePath("elasticache"),
		Vars:         helpers.DefaultElastiCacheVars(),
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	expectedOutputs := []string{
		"primary_endpoint_address",
		"port",
		"security_group_id",
	}

	helpers.ValidateOutputs(t, plan, expectedOutputs)
}

func TestElastiCacheModuleIdempotency(t *testing.T) {
	t.Parallel()

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: helpers.GetTerraformModulePath("elasticache"),
		Vars:         helpers.DefaultElastiCacheVars(),
	}

	helpers.RunIdempotencyTest(t, opts)
}

func TestElastiCacheModuleReplicationGroup(t *testing.T) {
	t.Parallel()

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: helpers.GetTerraformModulePath("elasticache"),
		Vars: helpers.MergeVars(helpers.DefaultElastiCacheVars(), map[string]interface{}{
			"cluster_id":                 "prod-redis",
			"subnet_group_name":          "prod-cache-subnet",
			"node_type":                  "cache.r6g.large",
			"num_cache_clusters":         2,
			"automatic_failover_enabled": true,
			"multi_az_enabled":           true,
			"at_rest_encryption_enabled": true,
			"transit_encryption_enabled": true,
		}),
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	// Replication Group 확인
	replicationGroupCount := helpers.CountResourcesByType(plan, "aws_elasticache_replication_group")
	assert.GreaterOrEqual(t, replicationGroupCount, 1, "Expected at least 1 Replication Group for HA setup")
}

func TestElastiCacheModuleAuthToken(t *testing.T) {
	t.Parallel()

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: helpers.GetTerraformModulePath("elasticache"),
		Vars: helpers.MergeVars(helpers.DefaultElastiCacheVars(), map[string]interface{}{
			"cluster_id":                 "staging-redis",
			"subnet_group_name":          "staging-cache-subnet",
			"transit_encryption_enabled": true,
		}),
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	helpers.ValidateNoSensitiveHardcoded(t, plan)
}
