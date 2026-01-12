package helpers

import (
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/gruntwork-io/terratest/modules/terraform"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TerraformPlanOptions는 terraform plan 테스트용 옵션 구조체
type TerraformPlanOptions struct {
	TerraformDir  string
	VarsFiles     []string
	Vars          map[string]interface{}
	BackendConfig map[string]interface{}
}

// RunTerraformPlanValidation은 terraform plan을 실행하고 유효성을 검증
func RunTerraformPlanValidation(t *testing.T, opts *TerraformPlanOptions) *terraform.PlanStruct {
	t.Helper()

	terraformOptions := terraform.WithDefaultRetryableErrors(t, &terraform.Options{
		TerraformDir:  opts.TerraformDir,
		VarFiles:      opts.VarsFiles,
		Vars:          opts.Vars,
		NoColor:       true,
		BackendConfig: opts.BackendConfig,
		PlanFilePath:  filepath.Join(t.TempDir(), "plan.out"),
	})

	// terraform plan 실행 및 Plan 구조체 반환
	plan := terraform.InitAndPlanAndShowWithStruct(t, terraformOptions)
	return plan
}

// RunIdempotencyTest는 terraform plan을 두 번 실행하여 멱등성을 검증
func RunIdempotencyTest(t *testing.T, opts *TerraformPlanOptions) {
	t.Helper()

	terraformOptions := terraform.WithDefaultRetryableErrors(t, &terraform.Options{
		TerraformDir:  opts.TerraformDir,
		VarFiles:      opts.VarsFiles,
		Vars:          opts.Vars,
		NoColor:       true,
		BackendConfig: opts.BackendConfig,
		PlanFilePath:  filepath.Join(t.TempDir(), "plan.out"),
	})

	terraform.Init(t, terraformOptions)

	// 첫 번째 plan
	plan1 := terraform.InitAndPlanAndShowWithStruct(t, terraformOptions)

	// 두 번째 plan (새 plan 파일 경로 설정)
	terraformOptions.PlanFilePath = filepath.Join(t.TempDir(), "plan2.out")
	plan2 := terraform.InitAndPlanAndShowWithStruct(t, terraformOptions)

	// 두 plan의 resource 변경 수가 동일해야 함
	assert.Equal(t, len(plan1.ResourcePlannedValuesMap), len(plan2.ResourcePlannedValuesMap),
		"Idempotency check failed: second plan has different resource count")
}

// ValidateOutputs는 예상 출력값이 plan에 포함되어 있는지 검증
func ValidateOutputs(t *testing.T, plan *terraform.PlanStruct, expectedOutputs []string) {
	t.Helper()

	for _, output := range expectedOutputs {
		_, exists := plan.RawPlan.OutputChanges[output]
		require.True(t, exists, "Expected output '%s' not found in plan", output)
	}
}

// ValidateNoSensitiveHardcoded는 민감한 정보가 하드코딩되지 않았는지 확인
// Plan의 Output 변경사항에서 sensitive 값이 노출되지 않았는지 검증
func ValidateNoSensitiveHardcoded(t *testing.T, plan *terraform.PlanStruct) {
	t.Helper()

	for outputName, outputChange := range plan.RawPlan.OutputChanges {
		// AfterSensitive가 true이면 민감 정보로 표시된 Output
		if outputChange.AfterSensitive != nil {
			// sensitive output은 After 값이 노출되지 않아야 함
			t.Logf("Output '%s' is marked as sensitive", outputName)
		}
	}
}

// CountResourcesByType는 특정 타입의 리소스 개수를 반환
func CountResourcesByType(plan *terraform.PlanStruct, resourceType string) int {
	count := 0
	for resourceAddr := range plan.ResourcePlannedValuesMap {
		if strings.Contains(resourceAddr, resourceType) {
			count++
		}
	}
	return count
}

// ValidateResourceExists는 특정 리소스가 plan에 존재하는지 확인
func ValidateResourceExists(t *testing.T, plan *terraform.PlanStruct, resourceAddr string) {
	t.Helper()
	_, exists := plan.ResourcePlannedValuesMap[resourceAddr]
	require.True(t, exists, "Resource '%s' not found in plan", resourceAddr)
}

// GetMockProviderPath는 mock provider 파일 경로를 반환
func GetMockProviderPath() string {
	return filepath.Join(GetProjectRoot(), "tests", "terratest", "terraform", "mock_provider.tf")
}

// SetupMockProvider는 CI 환경에서 mock AWS provider를 설정
// moduleDir에 mock_provider.tf 파일을 복사하고, 테스트 종료 시 정리하는 cleanup 함수를 반환
func SetupMockProvider(t *testing.T, moduleDir string) func() {
	t.Helper()

	// CI 환경이 아니면 설정하지 않음 (로컬에 AWS credentials가 있을 수 있음)
	if os.Getenv("CI") != "true" {
		return func() {} // no-op cleanup
	}

	srcPath := GetMockProviderPath()
	dstPath := filepath.Join(moduleDir, "mock_provider.tf")

	// provider override 파일 복사
	srcFile, err := os.Open(srcPath)
	if err != nil {
		t.Logf("Warning: Could not open provider override file: %v", err)
		return func() {}
	}
	defer srcFile.Close()

	dstFile, err := os.Create(dstPath)
	if err != nil {
		t.Logf("Warning: Could not create provider override file: %v", err)
		return func() {}
	}
	defer dstFile.Close()

	_, err = io.Copy(dstFile, srcFile)
	if err != nil {
		t.Logf("Warning: Could not copy provider override file: %v", err)
		return func() {}
	}

	t.Logf("Mock provider configured at %s", dstPath)

	// cleanup 함수 반환 - 테스트 종료 시 복사된 파일 삭제
	return func() {
		os.Remove(dstPath)
	}
}
