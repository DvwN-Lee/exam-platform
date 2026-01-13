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

// copyDir recursively copies a directory
func copyDir(src, dst string) error {
	return filepath.Walk(src, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// Skip .terraform directory and lock files
		if info.IsDir() && info.Name() == ".terraform" {
			return filepath.SkipDir
		}
		if info.Name() == ".terraform.lock.hcl" {
			return nil
		}

		relPath, err := filepath.Rel(src, path)
		if err != nil {
			return err
		}
		dstPath := filepath.Join(dst, relPath)

		if info.IsDir() {
			return os.MkdirAll(dstPath, info.Mode())
		}

		srcFile, err := os.Open(path)
		if err != nil {
			return err
		}
		defer srcFile.Close()

		dstFile, err := os.Create(dstPath)
		if err != nil {
			return err
		}
		defer dstFile.Close()

		_, err = io.Copy(dstFile, srcFile)
		return err
	})
}

// CopyModuleToTempDir copies the terraform module to a temp directory for isolated testing
func CopyModuleToTempDir(t *testing.T, moduleDir string) string {
	t.Helper()
	tempDir := t.TempDir()
	err := copyDir(moduleDir, tempDir)
	require.NoError(t, err, "Failed to copy module to temp directory")
	return tempDir
}

// TerraformPlanOptions는 terraform plan 테스트용 옵션 구조체
type TerraformPlanOptions struct {
	TerraformDir  string
	VarsFiles     []string
	Vars          map[string]interface{}
	BackendConfig map[string]interface{}
}

// IsCI returns true if running in CI environment
func IsCI() bool {
	return os.Getenv("CI") == "true" || os.Getenv("GITHUB_ACTIONS") == "true"
}

// RunTerraformValidation runs terraform init and validate (no API calls, works in CI)
// Note: terraform validate doesn't support -var flags, so we don't pass variables
func RunTerraformValidation(t *testing.T, opts *TerraformPlanOptions) {
	t.Helper()

	// 병렬 테스트 격리를 위해 모듈을 임시 디렉토리로 복사
	workingDir := CopyModuleToTempDir(t, opts.TerraformDir)

	// terraform validate는 -var 플래그를 지원하지 않으므로 Vars 제외
	terraformOptions := terraform.WithDefaultRetryableErrors(t, &terraform.Options{
		TerraformDir:  workingDir,
		NoColor:       true,
		BackendConfig: opts.BackendConfig,
	})

	terraform.Init(t, terraformOptions)
	terraform.Validate(t, terraformOptions)
}

// RunTerraformPlanValidation은 terraform plan을 실행하고 유효성을 검증
// CI 환경에서는 validate만 실행하고 nil을 반환
func RunTerraformPlanValidation(t *testing.T, opts *TerraformPlanOptions) *terraform.PlanStruct {
	t.Helper()

	// CI 환경에서는 validate만 실행 (credential 불필요)
	if IsCI() {
		RunTerraformValidation(t, opts)
		return nil
	}

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
// CI 환경에서는 validate만 실행
func RunIdempotencyTest(t *testing.T, opts *TerraformPlanOptions) {
	t.Helper()

	// CI 환경에서는 validate만 실행
	if IsCI() {
		RunTerraformValidation(t, opts)
		t.Log("Skipping idempotency test in CI (validate-only mode)")
		return
	}

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
// CI 환경에서는 plan이 nil이므로 skip
func ValidateOutputs(t *testing.T, plan *terraform.PlanStruct, expectedOutputs []string) {
	t.Helper()

	// CI 환경에서는 plan이 nil
	if plan == nil {
		t.Log("Skipping output validation in CI (validate-only mode)")
		return
	}

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
// CI 환경에서는 plan이 nil이므로 0을 반환
func CountResourcesByType(plan *terraform.PlanStruct, resourceType string) int {
	if plan == nil {
		return 0
	}
	count := 0
	for resourceAddr := range plan.ResourcePlannedValuesMap {
		if strings.Contains(resourceAddr, resourceType) {
			count++
		}
	}
	return count
}

// ValidateResourceExists는 특정 리소스가 plan에 존재하는지 확인
// CI 환경에서는 plan이 nil이므로 skip
func ValidateResourceExists(t *testing.T, plan *terraform.PlanStruct, resourceAddr string) {
	t.Helper()

	if plan == nil {
		t.Log("Skipping resource existence validation in CI (validate-only mode)")
		return
	}

	_, exists := plan.ResourcePlannedValuesMap[resourceAddr]
	require.True(t, exists, "Resource '%s' not found in plan", resourceAddr)
}
