package gcp_vpc_test

import (
	"testing"

	"github.com/DvwN-Lee/exam-platform/tests/terratest/helpers"
	"github.com/stretchr/testify/assert"
)

func TestGCPVPCModulePlanValidation(t *testing.T) {
	t.Parallel()

	moduleDir := helpers.GetTerraformModulePath("gcp-vpc")

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: moduleDir,
		Vars:         helpers.DefaultGCPVPCVars(),
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	// CI 환경에서는 plan이 nil이므로 리소스 검증 skip
	if plan == nil {
		t.Log("Skipping resource count validation in CI (validate-only mode)")
		return
	}

	// VPC Network 존재 확인
	networkCount := helpers.CountResourcesByType(plan, "google_compute_network")
	assert.Equal(t, 1, networkCount, "Expected 1 VPC Network")

	// Subnet 개수 확인 (public + private)
	subnetCount := helpers.CountResourcesByType(plan, "google_compute_subnetwork")
	assert.Equal(t, 2, subnetCount, "Expected 2 subnets (public + private)")

	// Firewall 규칙 확인 (internal + iap_ssh + health_check)
	firewallCount := helpers.CountResourcesByType(plan, "google_compute_firewall")
	assert.GreaterOrEqual(t, firewallCount, 2, "Expected at least 2 firewall rules")
}

func TestGCPVPCModuleOutputValidation(t *testing.T) {
	t.Parallel()

	moduleDir := helpers.GetTerraformModulePath("gcp-vpc")

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: moduleDir,
		Vars:         helpers.DefaultGCPVPCVars(),
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	// 필수 Output 검증
	expectedOutputs := []string{
		"network_id",
		"network_name",
		"network_self_link",
		"public_subnet_id",
		"public_subnet_name",
		"private_subnet_id",
		"private_subnet_name",
		"pods_secondary_range_name",
		"services_secondary_range_name",
		"region",
	}

	helpers.ValidateOutputs(t, plan, expectedOutputs)
}

func TestGCPVPCModuleIdempotency(t *testing.T) {
	t.Parallel()

	moduleDir := helpers.GetTerraformModulePath("gcp-vpc")

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: moduleDir,
		Vars:         helpers.DefaultGCPVPCVars(),
	}

	helpers.RunIdempotencyTest(t, opts)
}

func TestGCPVPCModuleWithNATEnabled(t *testing.T) {
	t.Parallel()

	moduleDir := helpers.GetTerraformModulePath("gcp-vpc")

	vars := helpers.DefaultGCPVPCVars()
	vars["enable_nat"] = true

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: moduleDir,
		Vars:         vars,
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	// CI 환경에서는 plan이 nil이므로 리소스 검증 skip
	if plan == nil {
		t.Log("Skipping resource count validation in CI (validate-only mode)")
		return
	}

	// Cloud Router 존재 확인
	routerCount := helpers.CountResourcesByType(plan, "google_compute_router")
	assert.Equal(t, 1, routerCount, "Expected 1 Cloud Router when NAT enabled")

	// Cloud NAT 존재 확인
	natCount := helpers.CountResourcesByType(plan, "google_compute_router_nat")
	assert.Equal(t, 1, natCount, "Expected 1 Cloud NAT when NAT enabled")

	// NAT 관련 Output 검증
	expectedOutputs := []string{
		"router_id",
		"router_name",
		"nat_id",
		"nat_name",
	}
	helpers.ValidateOutputs(t, plan, expectedOutputs)
}

func TestGCPVPCModuleWithNATDisabled(t *testing.T) {
	t.Parallel()

	moduleDir := helpers.GetTerraformModulePath("gcp-vpc")

	vars := helpers.DefaultGCPVPCVars()
	vars["enable_nat"] = false

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: moduleDir,
		Vars:         vars,
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	// CI 환경에서는 plan이 nil이므로 리소스 검증 skip
	if plan == nil {
		t.Log("Skipping resource count validation in CI (validate-only mode)")
		return
	}

	// Cloud Router/NAT 없음 확인
	routerCount := helpers.CountResourcesByType(plan, "google_compute_router")
	assert.Equal(t, 0, routerCount, "Expected 0 Cloud Router when NAT disabled")

	natCount := helpers.CountResourcesByType(plan, "google_compute_router_nat")
	assert.Equal(t, 0, natCount, "Expected 0 Cloud NAT when NAT disabled")
}

func TestGCPVPCModuleWithoutGKESecondaryRanges(t *testing.T) {
	t.Parallel()

	moduleDir := helpers.GetTerraformModulePath("gcp-vpc")

	vars := helpers.DefaultGCPVPCVars()
	vars["enable_gke_secondary_ranges"] = false

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: moduleDir,
		Vars:         vars,
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	// 기본 Output은 여전히 존재해야 함
	expectedOutputs := []string{
		"network_id",
		"public_subnet_id",
		"private_subnet_id",
	}
	helpers.ValidateOutputs(t, plan, expectedOutputs)
}

func TestGCPVPCModuleWithIAPSSHDisabled(t *testing.T) {
	t.Parallel()

	moduleDir := helpers.GetTerraformModulePath("gcp-vpc")

	vars := helpers.DefaultGCPVPCVars()
	vars["enable_iap_ssh"] = false

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: moduleDir,
		Vars:         vars,
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	// CI 환경에서는 plan이 nil이므로 리소스 검증 skip
	if plan == nil {
		t.Log("Skipping resource count validation in CI (validate-only mode)")
		return
	}

	// IAP SSH firewall이 비활성화되면 firewall 규칙 수가 줄어듦
	// internal + health_check = 2개
	firewallCount := helpers.CountResourcesByType(plan, "google_compute_firewall")
	assert.Equal(t, 2, firewallCount, "Expected 2 firewall rules when IAP SSH disabled")
}

func TestGCPVPCModuleWithCustomCIDRs(t *testing.T) {
	t.Parallel()

	moduleDir := helpers.GetTerraformModulePath("gcp-vpc")

	vars := helpers.DefaultGCPVPCVars()
	vars["public_subnet_cidr"] = "10.10.1.0/24"
	vars["private_subnet_cidr"] = "10.10.2.0/24"
	vars["pods_cidr"] = "10.20.0.0/16"
	vars["services_cidr"] = "10.30.0.0/20"

	opts := &helpers.TerraformPlanOptions{
		TerraformDir: moduleDir,
		Vars:         vars,
	}

	plan := helpers.RunTerraformPlanValidation(t, opts)

	// CI 환경에서는 plan이 nil이므로 리소스 검증 skip
	if plan == nil {
		t.Log("Skipping resource count validation in CI (validate-only mode)")
		return
	}

	// 기본 리소스 존재 확인
	networkCount := helpers.CountResourcesByType(plan, "google_compute_network")
	assert.Equal(t, 1, networkCount, "Expected 1 VPC Network with custom CIDRs")

	subnetCount := helpers.CountResourcesByType(plan, "google_compute_subnetwork")
	assert.Equal(t, 2, subnetCount, "Expected 2 subnets with custom CIDRs")
}
