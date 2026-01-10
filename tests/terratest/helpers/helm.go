package helpers

import (
	"os/exec"
	"strings"
	"testing"

	"github.com/gruntwork-io/terratest/modules/helm"
	"github.com/stretchr/testify/require"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
)

// HelmTemplateOptions는 helm template 테스트용 옵션 구조체
type HelmTemplateOptions struct {
	ChartPath   string
	ReleaseName string
	Namespace   string
	ValuesFiles []string
	SetValues   map[string]string
}

// RenderHelmTemplate은 helm template을 렌더링하고 결과를 반환
func RenderHelmTemplate(t *testing.T, opts *HelmTemplateOptions) []string {
	t.Helper()

	helmOpts := &helm.Options{
		ValuesFiles: opts.ValuesFiles,
		SetValues:   opts.SetValues,
	}

	output := helm.RenderTemplate(t, helmOpts, opts.ChartPath, opts.ReleaseName, nil)
	return strings.Split(output, "---")
}

// ValidateDeploymentTemplate은 Deployment YAML이 유효한지 검증
func ValidateDeploymentTemplate(t *testing.T, opts *HelmTemplateOptions, templateFile string) *appsv1.Deployment {
	t.Helper()

	helmOpts := &helm.Options{
		ValuesFiles: opts.ValuesFiles,
		SetValues:   opts.SetValues,
	}

	output := helm.RenderTemplate(t, helmOpts, opts.ChartPath, opts.ReleaseName, []string{templateFile})

	var deployment appsv1.Deployment
	helm.UnmarshalK8SYaml(t, output, &deployment)

	return &deployment
}

// ValidateServiceTemplate은 Service YAML이 유효한지 검증
func ValidateServiceTemplate(t *testing.T, opts *HelmTemplateOptions, templateFile string) *corev1.Service {
	t.Helper()

	helmOpts := &helm.Options{
		ValuesFiles: opts.ValuesFiles,
		SetValues:   opts.SetValues,
	}

	output := helm.RenderTemplate(t, helmOpts, opts.ChartPath, opts.ReleaseName, []string{templateFile})

	var service corev1.Service
	helm.UnmarshalK8SYaml(t, output, &service)

	return &service
}

// ValidateIngressTemplate은 Ingress YAML이 유효한지 검증
func ValidateIngressTemplate(t *testing.T, opts *HelmTemplateOptions, templateFile string) *networkingv1.Ingress {
	t.Helper()

	helmOpts := &helm.Options{
		ValuesFiles: opts.ValuesFiles,
		SetValues:   opts.SetValues,
	}

	output := helm.RenderTemplate(t, helmOpts, opts.ChartPath, opts.ReleaseName, []string{templateFile})

	var ingress networkingv1.Ingress
	helm.UnmarshalK8SYaml(t, output, &ingress)

	return &ingress
}

// ValidateConfigMapTemplate은 ConfigMap YAML이 유효한지 검증
func ValidateConfigMapTemplate(t *testing.T, opts *HelmTemplateOptions, templateFile string) *corev1.ConfigMap {
	t.Helper()

	helmOpts := &helm.Options{
		ValuesFiles: opts.ValuesFiles,
		SetValues:   opts.SetValues,
	}

	output := helm.RenderTemplate(t, helmOpts, opts.ChartPath, opts.ReleaseName, []string{templateFile})

	var configMap corev1.ConfigMap
	helm.UnmarshalK8SYaml(t, output, &configMap)

	return &configMap
}

// HelmLintChart는 helm lint를 실행하여 Chart의 문법을 검증
func HelmLintChart(t *testing.T, chartPath string, valuesFiles []string) {
	t.Helper()

	args := []string{"lint", chartPath}
	for _, f := range valuesFiles {
		args = append(args, "-f", f)
	}

	cmd := exec.Command("helm", args...)
	output, err := cmd.CombinedOutput()
	require.NoError(t, err, "helm lint failed: %s", string(output))
}

// HelmTemplateRaw는 helm template 전체 출력을 반환
func HelmTemplateRaw(t *testing.T, opts *HelmTemplateOptions) string {
	t.Helper()

	helmOpts := &helm.Options{
		ValuesFiles: opts.ValuesFiles,
		SetValues:   opts.SetValues,
	}

	return helm.RenderTemplate(t, helmOpts, opts.ChartPath, opts.ReleaseName, nil)
}
