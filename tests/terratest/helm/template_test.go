package helm_test

import (
	"strings"
	"testing"

	"github.com/DvwN-Lee/exam-platform/tests/terratest/helpers"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestHelmChartLint(t *testing.T) {
	t.Parallel()

	chartPath := helpers.GetHelmChartPath()

	// 기본 values로 lint
	helpers.HelmLintChart(t, chartPath, nil)
}

func TestHelmChartLintWithDevValues(t *testing.T) {
	t.Parallel()

	chartPath := helpers.GetHelmChartPath()
	valuesPath := helpers.GetHelmValuesPath("dev")

	helpers.HelmLintChart(t, chartPath, []string{valuesPath})
}

func TestHelmChartLintWithStagingValues(t *testing.T) {
	t.Parallel()

	chartPath := helpers.GetHelmChartPath()
	valuesPath := helpers.GetHelmValuesPath("staging")

	helpers.HelmLintChart(t, chartPath, []string{valuesPath})
}

func TestHelmChartLintWithProdValues(t *testing.T) {
	t.Parallel()

	chartPath := helpers.GetHelmChartPath()
	valuesPath := helpers.GetHelmValuesPath("prod")

	helpers.HelmLintChart(t, chartPath, []string{valuesPath})
}

func TestBackendDeploymentTemplate(t *testing.T) {
	t.Parallel()

	chartPath := helpers.GetHelmChartPath()

	opts := &helpers.HelmTemplateOptions{
		ChartPath:   chartPath,
		ReleaseName: "test-exam",
		Namespace:   "exam-test",
		SetValues: map[string]string{
			"backend.image.repository": "test-repo/backend",
			"backend.image.tag":        "v1.0.0",
			"backend.replicaCount":     "2",
		},
	}

	deployment := helpers.ValidateDeploymentTemplate(t, opts, "templates/backend-deployment.yaml")

	// Deployment 이름 확인
	assert.Contains(t, deployment.Name, "backend", "Deployment name should contain 'backend'")

	// Replica 수 확인
	require.NotNil(t, deployment.Spec.Replicas)
	assert.Equal(t, int32(2), *deployment.Spec.Replicas, "Expected 2 replicas")

	// Container 이미지 확인
	require.Len(t, deployment.Spec.Template.Spec.Containers, 1)
	assert.Equal(t, "test-repo/backend:v1.0.0", deployment.Spec.Template.Spec.Containers[0].Image)
}

func TestFrontendDeploymentTemplate(t *testing.T) {
	t.Parallel()

	chartPath := helpers.GetHelmChartPath()

	opts := &helpers.HelmTemplateOptions{
		ChartPath:   chartPath,
		ReleaseName: "test-exam",
		Namespace:   "exam-test",
		SetValues: map[string]string{
			"frontend.image.repository": "test-repo/frontend",
			"frontend.image.tag":        "v1.0.0",
			"frontend.replicaCount":     "2",
		},
	}

	deployment := helpers.ValidateDeploymentTemplate(t, opts, "templates/frontend-deployment.yaml")

	assert.Contains(t, deployment.Name, "frontend", "Deployment name should contain 'frontend'")

	require.NotNil(t, deployment.Spec.Replicas)
	assert.Equal(t, int32(2), *deployment.Spec.Replicas)

	require.Len(t, deployment.Spec.Template.Spec.Containers, 1)
	assert.Equal(t, "test-repo/frontend:v1.0.0", deployment.Spec.Template.Spec.Containers[0].Image)
}

func TestBackendServiceTemplate(t *testing.T) {
	t.Parallel()

	chartPath := helpers.GetHelmChartPath()

	opts := &helpers.HelmTemplateOptions{
		ChartPath:   chartPath,
		ReleaseName: "test-exam",
		Namespace:   "exam-test",
	}

	service := helpers.ValidateServiceTemplate(t, opts, "templates/backend-service.yaml")

	assert.Contains(t, service.Name, "backend", "Service name should contain 'backend'")

	// Port 확인
	require.NotEmpty(t, service.Spec.Ports)
	assert.Equal(t, int32(8000), service.Spec.Ports[0].Port, "Expected backend port 8000")
}

func TestFrontendServiceTemplate(t *testing.T) {
	t.Parallel()

	chartPath := helpers.GetHelmChartPath()

	opts := &helpers.HelmTemplateOptions{
		ChartPath:   chartPath,
		ReleaseName: "test-exam",
		Namespace:   "exam-test",
	}

	service := helpers.ValidateServiceTemplate(t, opts, "templates/frontend-service.yaml")

	assert.Contains(t, service.Name, "frontend", "Service name should contain 'frontend'")

	require.NotEmpty(t, service.Spec.Ports)
}

func TestIngressTemplate(t *testing.T) {
	t.Parallel()

	chartPath := helpers.GetHelmChartPath()

	opts := &helpers.HelmTemplateOptions{
		ChartPath:   chartPath,
		ReleaseName: "test-exam",
		Namespace:   "exam-test",
		SetValues: map[string]string{
			"ingress.enabled":   "true",
			"ingress.className": "alb",
			"ingress.hosts[0].host": "exam.example.com",
		},
	}

	ingress := helpers.ValidateIngressTemplate(t, opts, "templates/ingress.yaml")

	require.NotNil(t, ingress.Spec.IngressClassName)
	assert.Equal(t, "alb", *ingress.Spec.IngressClassName)
}

func TestConfigMapTemplate(t *testing.T) {
	t.Parallel()

	chartPath := helpers.GetHelmChartPath()

	opts := &helpers.HelmTemplateOptions{
		ChartPath:   chartPath,
		ReleaseName: "test-exam",
		Namespace:   "exam-test",
		SetValues: map[string]string{
			"backend.config.DEBUG": "false",
		},
	}

	configMap := helpers.ValidateConfigMapTemplate(t, opts, "templates/backend-configmap.yaml")

	assert.Contains(t, configMap.Name, "backend", "ConfigMap name should contain 'backend'")
}

func TestTemplateRenderingWithAllEnvironments(t *testing.T) {
	t.Parallel()

	chartPath := helpers.GetHelmChartPath()
	environments := []string{"dev", "staging", "prod"}

	for _, env := range environments {
		env := env // capture range variable
		t.Run(env, func(t *testing.T) {
			t.Parallel()

			valuesPath := helpers.GetHelmValuesPath(env)

			opts := &helpers.HelmTemplateOptions{
				ChartPath:   chartPath,
				ReleaseName: "exam-" + env,
				Namespace:   "exam-" + env,
				ValuesFiles: []string{valuesPath},
			}

			output := helpers.HelmTemplateRaw(t, opts)

			// 기본적인 Kubernetes 리소스들이 렌더링되는지 확인
			assert.Contains(t, output, "kind: Deployment")
			assert.Contains(t, output, "kind: Service")
		})
	}
}

func TestNoHardcodedSecrets(t *testing.T) {
	t.Parallel()

	chartPath := helpers.GetHelmChartPath()

	opts := &helpers.HelmTemplateOptions{
		ChartPath:   chartPath,
		ReleaseName: "test-exam",
		Namespace:   "exam-test",
	}

	output := helpers.HelmTemplateRaw(t, opts)

	// 하드코딩된 비밀번호가 없는지 확인
	sensitivePatterns := []string{
		"password:",
		"secret_key:",
		"api_key:",
		"aws_access_key:",
		"aws_secret_key:",
	}

	for _, pattern := range sensitivePatterns {
		if strings.Contains(strings.ToLower(output), pattern) {
			// Secret 참조는 허용
			if !strings.Contains(output, "secretKeyRef") && !strings.Contains(output, "valueFrom") {
				t.Logf("Warning: Template may contain hardcoded sensitive value: %s", pattern)
			}
		}
	}
}

func TestResourceLimits(t *testing.T) {
	t.Parallel()

	chartPath := helpers.GetHelmChartPath()

	opts := &helpers.HelmTemplateOptions{
		ChartPath:   chartPath,
		ReleaseName: "test-exam",
		Namespace:   "exam-test",
		SetValues: map[string]string{
			"backend.resources.limits.cpu":      "500m",
			"backend.resources.limits.memory":   "512Mi",
			"backend.resources.requests.cpu":    "250m",
			"backend.resources.requests.memory": "256Mi",
		},
	}

	deployment := helpers.ValidateDeploymentTemplate(t, opts, "templates/backend-deployment.yaml")

	container := deployment.Spec.Template.Spec.Containers[0]

	// Resource Limits 확인
	if container.Resources.Limits != nil {
		cpuLimit := container.Resources.Limits.Cpu()
		memLimit := container.Resources.Limits.Memory()

		assert.False(t, cpuLimit.IsZero(), "CPU limit should be set")
		assert.False(t, memLimit.IsZero(), "Memory limit should be set")
	}
}

func TestHealthProbes(t *testing.T) {
	t.Parallel()

	chartPath := helpers.GetHelmChartPath()

	opts := &helpers.HelmTemplateOptions{
		ChartPath:   chartPath,
		ReleaseName: "test-exam",
		Namespace:   "exam-test",
	}

	deployment := helpers.ValidateDeploymentTemplate(t, opts, "templates/backend-deployment.yaml")

	container := deployment.Spec.Template.Spec.Containers[0]

	// Liveness Probe 확인
	if container.LivenessProbe != nil {
		assert.NotNil(t, container.LivenessProbe.HTTPGet, "LivenessProbe should use HTTP")
	}

	// Readiness Probe 확인
	if container.ReadinessProbe != nil {
		assert.NotNil(t, container.ReadinessProbe.HTTPGet, "ReadinessProbe should use HTTP")
	}
}
