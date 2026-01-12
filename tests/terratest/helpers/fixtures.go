package helpers

// DefaultVPCVars returns default test variables for VPC module
func DefaultVPCVars() map[string]interface{} {
	return map[string]interface{}{
		"environment":        "dev",
		"vpc_cidr":           "10.0.0.0/16",
		"az_count":           2,
		"cluster_name":       "test-cluster",
		"enable_nat_gateway": true,
		"single_nat_gateway": true,
	}
}

// DefaultEKSVars returns default test variables for EKS module
func DefaultEKSVars() map[string]interface{} {
	return map[string]interface{}{
		"environment":         "dev",
		"cluster_name":        "test-eks-cluster",
		"cluster_version":     "1.29",
		"vpc_id":              "vpc-12345678",
		"subnet_ids":          []string{"subnet-1", "subnet-2"},
		"node_subnet_ids":     []string{"subnet-1", "subnet-2"},
		"node_instance_types": []string{"t3.medium"},
		"node_desired_size":   2,
		"node_min_size":       1,
		"node_max_size":       3,
	}
}

// DefaultRDSVars returns default test variables for RDS module
func DefaultRDSVars() map[string]interface{} {
	return map[string]interface{}{
		"identifier":                 "test-db",
		"vpc_id":                     "vpc-12345678",
		"db_subnet_group_name":       "test-db-subnet-group",
		"allowed_security_group_ids": []string{"sg-12345678"},
	}
}

// DefaultElastiCacheVars returns default test variables for ElastiCache module
func DefaultElastiCacheVars() map[string]interface{} {
	return map[string]interface{}{
		"cluster_id":                 "test-redis",
		"vpc_id":                     "vpc-12345678",
		"subnet_group_name":          "test-cache-subnet",
		"allowed_security_group_ids": []string{"sg-12345678"},
	}
}

// DefaultS3Vars returns default test variables for S3 module
func DefaultS3Vars() map[string]interface{} {
	return map[string]interface{}{
		"bucket_name": "test-exam-assets",
	}
}

// DefaultECRVars returns default test variables for ECR module
func DefaultECRVars() map[string]interface{} {
	return map[string]interface{}{
		"repository_names": []string{"exam-backend", "exam-frontend"},
	}
}

// MergeVars merges base variables with overrides
func MergeVars(base, overrides map[string]interface{}) map[string]interface{} {
	result := make(map[string]interface{})
	for k, v := range base {
		result[k] = v
	}
	for k, v := range overrides {
		result[k] = v
	}
	return result
}
