package helpers

import (
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
	})

	terraform.Init(t, terraformOptions)

	// 첫 번째 plan
	plan1 := terraform.InitAndPlanAndShowWithStruct(t, terraformOptions)

	// 두 번째 plan - 변경 사항이 없어야 함
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
func ValidateNoSensitiveHardcoded(t *testing.T, plan *terraform.PlanStruct) {
	t.Helper()

	for outputName, outputChange := range plan.RawPlan.OutputChanges {
		if outputChange.Sensitive {
			assert.Nil(t, outputChange.After,
				"Sensitive output '%s' should not have hardcoded value", outputName)
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
