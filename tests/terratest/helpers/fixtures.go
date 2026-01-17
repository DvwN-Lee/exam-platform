package helpers

import (
	"fmt"
	"os"
	"time"
)

// =============================================================================
// GCP Terraform Module Test Fixtures (Factory Pattern)
// =============================================================================
// 각 GCP 모듈의 기본 테스트 변수를 반환하는 Factory 함수 모음
// IaC 멱등성을 보장하기 위해 모든 필수 변수에 기본값 제공

// DefaultGCPVPCVars returns default test variables for gcp-vpc module
func DefaultGCPVPCVars() map[string]interface{} {
	return map[string]interface{}{
		"project_id":                   "test-project",
		"region":                       "asia-northeast3",
		"environment":                  "dev",
		"network_name":                 "vpc",
		"public_subnet_cidr":           "10.0.1.0/24",
		"private_subnet_cidr":          "10.0.2.0/24",
		"enable_nat":                   true,
		"enable_iap_ssh":               true,
		"enable_gke_secondary_ranges":  true,
		"pods_cidr":                    "10.1.0.0/16",
		"services_cidr":                "10.2.0.0/20",
		"routing_mode":                 "REGIONAL",
		"flow_sampling":                0.5,
		"log_aggregation_interval":     "INTERVAL_5_SEC",
		"bgp_asn":                      64514,
		"nat_ip_allocate_option":       "AUTO_ONLY",
	}
}

// DefaultGCSVars returns default test variables for gcs module
func DefaultGCSVars() map[string]interface{} {
	return map[string]interface{}{
		"project_id":                  "test-project",
		"environment":                 "dev",
		"bucket_name":                 "test-exam-assets",
		"location":                    "ASIA-NORTHEAST3",
		"storage_class":               "STANDARD",
		"versioning_enabled":          true,
		"force_destroy":               true, // for testing
		"uniform_bucket_level_access": true,
	}
}

// DefaultGARVars returns default test variables for gar module
func DefaultGARVars() map[string]interface{} {
	return map[string]interface{}{
		"project_id":    "test-project",
		"environment":   "dev",
		"repository_id": "exam-platform",
		"location":      "asia-northeast3",
		"format":        "DOCKER",
	}
}

// DefaultMemorystoreVars returns default test variables for memorystore module
func DefaultMemorystoreVars() map[string]interface{} {
	return map[string]interface{}{
		"project_id":     "test-project",
		"environment":    "dev",
		"instance_name":  "test-redis",
		"region":         "asia-northeast3",
		"tier":           "BASIC",
		"memory_size_gb": 1,
		"redis_version":  "REDIS_7_0",
		"auth_enabled":   true,
		"network_id":     "projects/test-project/global/networks/dev-vpc",
	}
}

// DefaultCloudSQLVars returns default test variables for cloudsql module
func DefaultCloudSQLVars() map[string]interface{} {
	return map[string]interface{}{
		"project_id":               "test-project",
		"environment":              "dev",
		"instance_name":            "test-db",
		"region":                   "asia-northeast3",
		"database_version":         "POSTGRES_16",
		"tier":                     "db-f1-micro",
		"disk_size":                10,
		"availability_type":        "ZONAL",
		"backup_enabled":           true,
		"database_name":            "examonline",
		"network_id":               "projects/test-project/global/networks/dev-vpc",
		"deletion_protection":      false, // for testing
		"enable_secret_manager":    false, // Secret Manager disabled by default
		"enable_workload_identity": false, // Workload Identity disabled by default
	}
}

// DefaultWorkloadIdentityConfig returns default Workload Identity configuration for testing
func DefaultWorkloadIdentityConfig() map[string]interface{} {
	return map[string]interface{}{
		"project_id":           "test-project",
		"gke_namespace":        "exam-platform",
		"kubernetes_sa_name":   "backend-sa",
		"google_sa_account_id": "",
	}
}

// DefaultGKEVars returns default test variables for gke module
func DefaultGKEVars() map[string]interface{} {
	return map[string]interface{}{
		"project_id":                    "test-project",
		"environment":                   "dev",
		"cluster_name":                  "test-cluster",
		"location":                      "asia-northeast3",
		"network_id":                    "projects/test-project/global/networks/dev-vpc",
		"subnet_id":                     "projects/test-project/regions/asia-northeast3/subnetworks/dev-private-subnet",
		"pods_secondary_range_name":     "dev-pods",
		"services_secondary_range_name": "dev-services",
		"node_machine_type":             "e2-medium",
		"initial_node_count":            1,
		"min_node_count":                1,
		"max_node_count":                3,
		"enable_private_nodes":          true,
		"enable_private_endpoint":       false,
		"deletion_protection":           false, // for testing
	}
}

// =============================================================================
// Helper Functions
// =============================================================================

// MergeVars merges base variables with overrides.
// Override values take precedence over base values.
// Example:
//
//	vars := MergeVars(DefaultGKEVars(), map[string]interface{}{
//	    "min_node_count": 3,
//	    "max_node_count": 10,
//	})
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

// =============================================================================
// Integration Test Fixtures
// =============================================================================
// 실제 GCP 리소스 생성/삭제 Integration Test용 변수 Factory 함수
// 환경 변수에서 실제 프로젝트 정보를 가져와 사용

// GetIntegrationTestProjectID returns the GCP project ID for integration tests
// Reads from GCP_PROJECT_ID environment variable
func GetIntegrationTestProjectID() string {
	projectID := os.Getenv("GCP_PROJECT_ID")
	if projectID == "" {
		projectID = os.Getenv("GOOGLE_PROJECT")
	}
	return projectID
}

// GetIntegrationTestRegion returns the GCP region for integration tests
// Reads from GCP_REGION environment variable, defaults to asia-northeast3
func GetIntegrationTestRegion() string {
	region := os.Getenv("GCP_REGION")
	if region == "" {
		region = "asia-northeast3"
	}
	return region
}

// generateTestSuffix creates a unique suffix for test resources
// Uses UnixNano for nanosecond precision to avoid conflicts in parallel tests
func generateTestSuffix() string {
	return fmt.Sprintf("%d", time.Now().UnixNano())
}

// IntegrationTestGCSVars returns test variables for GCS integration tests
// Uses real GCP project and unique bucket names to avoid conflicts
func IntegrationTestGCSVars() map[string]interface{} {
	suffix := generateTestSuffix()
	return map[string]interface{}{
		"project_id":                  GetIntegrationTestProjectID(),
		"environment":                 "test",
		"bucket_name":                 fmt.Sprintf("inttest-gcs-%s", suffix),
		"location":                    "ASIA-NORTHEAST3",
		"storage_class":               "STANDARD",
		"versioning_enabled":          false,
		"force_destroy":               true, // 테스트 후 삭제를 위해 필수
		"uniform_bucket_level_access": true,
	}
}

// IntegrationTestGARVars returns test variables for GAR integration tests
// Uses real GCP project and unique repository names to avoid conflicts
func IntegrationTestGARVars() map[string]interface{} {
	suffix := generateTestSuffix()
	return map[string]interface{}{
		"project_id":    GetIntegrationTestProjectID(),
		"environment":   "test",
		"repository_id": fmt.Sprintf("inttest-gar-%s", suffix),
		"location":      GetIntegrationTestRegion(),
		"format":        "DOCKER",
	}
}

// IntegrationTestGCPVPCVars returns test variables for VPC integration tests
// Uses real GCP project and unique network names to avoid conflicts
func IntegrationTestGCPVPCVars() map[string]interface{} {
	suffix := generateTestSuffix()
	return map[string]interface{}{
		"project_id":                  GetIntegrationTestProjectID(),
		"region":                      GetIntegrationTestRegion(),
		"environment":                 "test",
		"network_name":                fmt.Sprintf("inttest-vpc-%s", suffix),
		"public_subnet_cidr":          "10.100.1.0/24",
		"private_subnet_cidr":         "10.100.2.0/24",
		"enable_nat":                  false, // 비용 절감을 위해 비활성화
		"enable_iap_ssh":              true,
		"enable_gke_secondary_ranges": true,
		"pods_cidr":                   "10.101.0.0/16",
		"services_cidr":               "10.102.0.0/20",
		"routing_mode":                "REGIONAL",
		"flow_sampling":               0.0, // 비용 절감을 위해 비활성화
		"log_aggregation_interval":    "INTERVAL_5_SEC",
		"bgp_asn":                     64514,
		"nat_ip_allocate_option":      "AUTO_ONLY",
	}
}
