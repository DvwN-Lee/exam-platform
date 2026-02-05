package helm_test

import (
	"fmt"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/DvwN-Lee/exam-platform/tests/terratest/helpers"
	"github.com/gruntwork-io/terratest/modules/helm"
	"github.com/gruntwork-io/terratest/modules/k8s"
	"github.com/gruntwork-io/terratest/modules/random"
	"github.com/stretchr/testify/require"
)

// TestHelmDeploymentIntegration은 Kind cluster에 실제 배포하여 테스트
// 환경변수 RUN_INTEGRATION_TESTS=true로 활성화
func TestHelmDeploymentIntegration(t *testing.T) {
	if os.Getenv("RUN_INTEGRATION_TESTS") != "true" {
		t.Skip("Skipping integration test. Set RUN_INTEGRATION_TESTS=true to run")
	}

	t.Parallel()

	chartPath := helpers.GetHelmChartPath()
	namespaceName := strings.ToLower(fmt.Sprintf("exam-test-%s", random.UniqueId()))

	kubectlOptions := k8s.NewKubectlOptions("", "", namespaceName)

	// Namespace 생성
	k8s.CreateNamespace(t, kubectlOptions, namespaceName)
	defer k8s.DeleteNamespace(t, kubectlOptions, namespaceName)

	// Helm 옵션 설정 (namespace 생성 비활성화 - 테스트용 namespace 사용)
	// nginxinc/nginx-unprivileged 사용 (non-root 실행, podSecurityContext 호환)
	// Django 전용 probe 비활성화
	helmOptions := &helm.Options{
		KubectlOptions: kubectlOptions,
		SetValues: map[string]string{
			"backend.image.repository":         "nginxinc/nginx-unprivileged",
			"backend.image.tag":                "alpine",
			"frontend.image.repository":        "nginxinc/nginx-unprivileged",
			"frontend.image.tag":               "alpine",
			"backend.replicaCount":             "1",
			"frontend.replicaCount":            "1",
			"namespace.create":                 "false",
			"namespace.name":                   namespaceName,
			"backend.livenessProbe.enabled":    "false",
			"backend.readinessProbe.enabled":   "false",
			"frontend.livenessProbe.enabled":   "false",
			"frontend.readinessProbe.enabled":  "false",
		},
	}

	// Helm Chart 설치
	releaseName := "exam-test"
	helm.Install(t, helmOptions, chartPath, releaseName)
	defer helm.Delete(t, helmOptions, releaseName, true)

	// fullname = releaseName-exam-platform (chart name 포함)
	fullname := releaseName + "-exam-platform"

	// Backend Deployment Ready 대기
	helpers.WaitForDeploymentReady(t, kubectlOptions, fullname+"-backend", 5*time.Minute)

	// Frontend Deployment Ready 대기
	helpers.WaitForDeploymentReady(t, kubectlOptions, fullname+"-frontend", 5*time.Minute)

	// Service Endpoint 확인
	helpers.WaitForServiceEndpoint(t, kubectlOptions, fullname+"-backend", 2*time.Minute)
	helpers.WaitForServiceEndpoint(t, kubectlOptions, fullname+"-frontend", 2*time.Minute)
}

// TestHelmUpgradeIntegration은 Helm upgrade 시나리오를 테스트
func TestHelmUpgradeIntegration(t *testing.T) {
	if os.Getenv("RUN_INTEGRATION_TESTS") != "true" {
		t.Skip("Skipping integration test. Set RUN_INTEGRATION_TESTS=true to run")
	}

	t.Parallel()

	chartPath := helpers.GetHelmChartPath()
	namespaceName := strings.ToLower(fmt.Sprintf("exam-upgrade-%s", random.UniqueId()))

	kubectlOptions := k8s.NewKubectlOptions("", "", namespaceName)

	k8s.CreateNamespace(t, kubectlOptions, namespaceName)
	defer k8s.DeleteNamespace(t, kubectlOptions, namespaceName)

	// 초기 설치 (namespace 생성 비활성화 - 테스트용 namespace 사용)
	// nginxinc/nginx-unprivileged 사용 (non-root 실행, podSecurityContext 호환)
	// Django 전용 probe 비활성화
	helmOptions := &helm.Options{
		KubectlOptions: kubectlOptions,
		SetValues: map[string]string{
			"backend.image.repository":         "nginxinc/nginx-unprivileged",
			"backend.image.tag":                "1.24-alpine",
			"frontend.image.repository":        "nginxinc/nginx-unprivileged",
			"frontend.image.tag":               "1.24-alpine",
			"backend.replicaCount":             "1",
			"frontend.replicaCount":            "1",
			"namespace.create":                 "false",
			"namespace.name":                   namespaceName,
			"backend.livenessProbe.enabled":    "false",
			"backend.readinessProbe.enabled":   "false",
			"frontend.livenessProbe.enabled":   "false",
			"frontend.readinessProbe.enabled":  "false",
		},
	}

	releaseName := "exam-upgrade"
	helm.Install(t, helmOptions, chartPath, releaseName)
	defer helm.Delete(t, helmOptions, releaseName, true)

	// fullname = releaseName-exam-platform (chart name 포함)
	fullname := releaseName + "-exam-platform"

	// 초기 배포 Ready 대기
	helpers.WaitForDeploymentReady(t, kubectlOptions, fullname+"-backend", 5*time.Minute)

	// Upgrade 수행
	helmOptions.SetValues["backend.image.tag"] = "1.25-alpine"
	helmOptions.SetValues["frontend.image.tag"] = "1.25-alpine"
	helm.Upgrade(t, helmOptions, chartPath, releaseName)

	// Upgrade 후 Ready 대기
	helpers.WaitForDeploymentReady(t, kubectlOptions, fullname+"-backend", 5*time.Minute)
	helpers.WaitForDeploymentReady(t, kubectlOptions, fullname+"-frontend", 5*time.Minute)
}

// TestHelmRollbackIntegration은 Helm rollback 시나리오를 테스트
func TestHelmRollbackIntegration(t *testing.T) {
	if os.Getenv("RUN_INTEGRATION_TESTS") != "true" {
		t.Skip("Skipping integration test. Set RUN_INTEGRATION_TESTS=true to run")
	}

	t.Parallel()

	chartPath := helpers.GetHelmChartPath()
	namespaceName := strings.ToLower(fmt.Sprintf("exam-rollback-%s", random.UniqueId()))

	kubectlOptions := k8s.NewKubectlOptions("", "", namespaceName)

	k8s.CreateNamespace(t, kubectlOptions, namespaceName)
	defer k8s.DeleteNamespace(t, kubectlOptions, namespaceName)

	// namespace 생성 비활성화 - 테스트용 namespace 사용
	// nginxinc/nginx-unprivileged 사용 (non-root 실행, podSecurityContext 호환)
	// Django 전용 probe 비활성화
	helmOptions := &helm.Options{
		KubectlOptions: kubectlOptions,
		SetValues: map[string]string{
			"backend.image.repository":         "nginxinc/nginx-unprivileged",
			"backend.image.tag":                "1.24-alpine",
			"frontend.image.repository":        "nginxinc/nginx-unprivileged",
			"frontend.image.tag":               "1.24-alpine",
			"backend.replicaCount":             "1",
			"frontend.replicaCount":            "1",
			"namespace.create":                 "false",
			"namespace.name":                   namespaceName,
			"backend.livenessProbe.enabled":    "false",
			"backend.readinessProbe.enabled":   "false",
			"frontend.livenessProbe.enabled":   "false",
			"frontend.readinessProbe.enabled":  "false",
		},
	}

	releaseName := "exam-rollback"
	helm.Install(t, helmOptions, chartPath, releaseName)
	defer helm.Delete(t, helmOptions, releaseName, true)

	// fullname = releaseName-exam-platform (chart name 포함)
	fullname := releaseName + "-exam-platform"

	helpers.WaitForDeploymentReady(t, kubectlOptions, fullname+"-backend", 5*time.Minute)

	// Upgrade
	helmOptions.SetValues["backend.image.tag"] = "1.25-alpine"
	helm.Upgrade(t, helmOptions, chartPath, releaseName)
	helpers.WaitForDeploymentReady(t, kubectlOptions, fullname+"-backend", 5*time.Minute)

	// Rollback to revision 1
	helm.Rollback(t, helmOptions, releaseName, "1")
	helpers.WaitForDeploymentReady(t, kubectlOptions, fullname+"-backend", 5*time.Minute)
}

// TestHelmHealthCheckIntegration은 배포 후 Health Check을 수행
// NOTE: 이 테스트는 실제 애플리케이션 이미지가 필요함 (placeholder nginx 이미지 사용 불가)
// - Backend: Django 앱이 /api/v1/health/ endpoint 제공
// - Frontend: Nginx가 정적 파일 서빙
// CI에서는 placeholder 이미지를 사용하므로 이 테스트는 스킵됨
func TestHelmHealthCheckIntegration(t *testing.T) {
	if os.Getenv("RUN_INTEGRATION_TESTS") != "true" {
		t.Skip("Skipping integration test. Set RUN_INTEGRATION_TESTS=true to run")
	}

	// Health check 테스트는 실제 애플리케이션 이미지가 필요
	// placeholder 이미지(nginx-unprivileged)는 port 8080을 사용하고 /health endpoint가 없음
	if os.Getenv("RUN_HEALTH_CHECK_TESTS") != "true" {
		t.Skip("Skipping health check test. Set RUN_HEALTH_CHECK_TESTS=true with real application images")
	}

	t.Parallel()

	chartPath := helpers.GetHelmChartPath()
	namespaceName := strings.ToLower(fmt.Sprintf("exam-health-%s", random.UniqueId()))

	kubectlOptions := k8s.NewKubectlOptions("", "", namespaceName)

	k8s.CreateNamespace(t, kubectlOptions, namespaceName)
	defer k8s.DeleteNamespace(t, kubectlOptions, namespaceName)

	// 실제 애플리케이션 이미지 사용 시에만 이 테스트 실행
	// CI에서는 RUN_HEALTH_CHECK_TESTS가 설정되지 않으므로 스킵됨
	helmOptions := &helm.Options{
		KubectlOptions: kubectlOptions,
		SetValues: map[string]string{
			// 실제 애플리케이션 이미지는 환경변수로 주입
			"backend.image.repository":         os.Getenv("BACKEND_IMAGE_REPO"),
			"backend.image.tag":                os.Getenv("BACKEND_IMAGE_TAG"),
			"frontend.image.repository":        os.Getenv("FRONTEND_IMAGE_REPO"),
			"frontend.image.tag":               os.Getenv("FRONTEND_IMAGE_TAG"),
			"backend.replicaCount":             "1",
			"frontend.replicaCount":            "1",
			"namespace.create":                 "false",
			"namespace.name":                   namespaceName,
		},
	}

	releaseName := "exam-health"
	helm.Install(t, helmOptions, chartPath, releaseName)
	defer helm.Delete(t, helmOptions, releaseName, true)

	// fullname = releaseName-exam-platform (chart name 포함)
	fullname := releaseName + "-exam-platform"

	helpers.WaitForDeploymentReady(t, kubectlOptions, fullname+"-backend", 5*time.Minute)
	helpers.WaitForDeploymentReady(t, kubectlOptions, fullname+"-frontend", 5*time.Minute)

	// Port Forward로 Backend Health 확인
	backendURL, backendCleanup := helpers.PortForwardService(t, kubectlOptions, fullname+"-backend", 8080, 8000)
	defer backendCleanup()

	helpers.CheckHealthEndpoint(t, backendURL+"/api/v1/health/", 200, 30*time.Second)

	// Port Forward로 Frontend Health 확인
	frontendURL, frontendCleanup := helpers.PortForwardService(t, kubectlOptions, fullname+"-frontend", 3000, 80)
	defer frontendCleanup()

	helpers.CheckHealthEndpoint(t, frontendURL+"/", 200, 30*time.Second)
}

// TestHelmScalingIntegration은 Replica 스케일링을 테스트
func TestHelmScalingIntegration(t *testing.T) {
	if os.Getenv("RUN_INTEGRATION_TESTS") != "true" {
		t.Skip("Skipping integration test. Set RUN_INTEGRATION_TESTS=true to run")
	}

	t.Parallel()

	chartPath := helpers.GetHelmChartPath()
	namespaceName := strings.ToLower(fmt.Sprintf("exam-scale-%s", random.UniqueId()))

	kubectlOptions := k8s.NewKubectlOptions("", "", namespaceName)

	k8s.CreateNamespace(t, kubectlOptions, namespaceName)
	defer k8s.DeleteNamespace(t, kubectlOptions, namespaceName)

	// namespace 생성 비활성화 - 테스트용 namespace 사용
	// nginxinc/nginx-unprivileged 사용 (non-root 실행, podSecurityContext 호환)
	// Django 전용 probe 비활성화
	helmOptions := &helm.Options{
		KubectlOptions: kubectlOptions,
		SetValues: map[string]string{
			"backend.image.repository":         "nginxinc/nginx-unprivileged",
			"backend.image.tag":                "alpine",
			"frontend.image.repository":        "nginxinc/nginx-unprivileged",
			"frontend.image.tag":               "alpine",
			"backend.replicaCount":             "1",
			"frontend.replicaCount":            "1",
			"namespace.create":                 "false",
			"namespace.name":                   namespaceName,
			"backend.livenessProbe.enabled":    "false",
			"backend.readinessProbe.enabled":   "false",
			"frontend.livenessProbe.enabled":   "false",
			"frontend.readinessProbe.enabled":  "false",
		},
	}

	releaseName := "exam-scale"
	helm.Install(t, helmOptions, chartPath, releaseName)
	defer helm.Delete(t, helmOptions, releaseName, true)

	// fullname = releaseName-exam-platform (chart name 포함)
	fullname := releaseName + "-exam-platform"

	helpers.WaitForDeploymentReady(t, kubectlOptions, fullname+"-backend", 5*time.Minute)

	// Scale up
	helmOptions.SetValues["backend.replicaCount"] = "3"
	helm.Upgrade(t, helmOptions, chartPath, releaseName)

	// Scale up 후 Ready 대기
	helpers.WaitForDeploymentReady(t, kubectlOptions, fullname+"-backend", 5*time.Minute)

	// Deployment의 Replica 수 확인
	deployment := k8s.GetDeployment(t, kubectlOptions, fullname+"-backend")
	require.Equal(t, int32(3), *deployment.Spec.Replicas)
}

// TestPlaywrightSmokeAfterDeployment는 Helm 배포 후 Playwright Smoke 테스트 실행
func TestPlaywrightSmokeAfterDeployment(t *testing.T) {
	if os.Getenv("RUN_INTEGRATION_TESTS") != "true" {
		t.Skip("Skipping integration test. Set RUN_INTEGRATION_TESTS=true to run")
	}

	if os.Getenv("RUN_PLAYWRIGHT_TESTS") != "true" {
		t.Skip("Skipping Playwright tests. Set RUN_PLAYWRIGHT_TESTS=true to run")
	}

	t.Parallel()

	chartPath := helpers.GetHelmChartPath()
	frontendPath := helpers.GetFrontendPath()
	namespaceName := strings.ToLower(fmt.Sprintf("exam-e2e-%s", random.UniqueId()))

	kubectlOptions := k8s.NewKubectlOptions("", "", namespaceName)

	k8s.CreateNamespace(t, kubectlOptions, namespaceName)
	defer k8s.DeleteNamespace(t, kubectlOptions, namespaceName)

	// namespace 생성 비활성화 - 테스트용 namespace 사용
	// nginxinc/nginx-unprivileged 사용 (non-root 실행, podSecurityContext 호환)
	// Django 전용 probe 비활성화
	helmOptions := &helm.Options{
		KubectlOptions: kubectlOptions,
		SetValues: map[string]string{
			"backend.image.repository":         "nginxinc/nginx-unprivileged",
			"backend.image.tag":                "alpine",
			"frontend.image.repository":        "nginxinc/nginx-unprivileged",
			"frontend.image.tag":               "alpine",
			"backend.replicaCount":             "1",
			"frontend.replicaCount":            "1",
			"namespace.create":                 "false",
			"namespace.name":                   namespaceName,
			"backend.livenessProbe.enabled":    "false",
			"backend.readinessProbe.enabled":   "false",
			"frontend.livenessProbe.enabled":   "false",
			"frontend.readinessProbe.enabled":  "false",
		},
	}

	releaseName := "exam-e2e"
	helm.Install(t, helmOptions, chartPath, releaseName)
	defer helm.Delete(t, helmOptions, releaseName, true)

	// fullname = releaseName-exam-platform (chart name 포함)
	fullname := releaseName + "-exam-platform"

	helpers.WaitForDeploymentReady(t, kubectlOptions, fullname+"-backend", 5*time.Minute)
	helpers.WaitForDeploymentReady(t, kubectlOptions, fullname+"-frontend", 5*time.Minute)

	// Port Forward로 Frontend 접근
	frontendURL, cleanup := helpers.PortForwardService(t, kubectlOptions, fullname+"-frontend", 3000, 80)
	defer cleanup()

	// Playwright Smoke 테스트 실행
	helpers.RunHealthCheckTests(t, frontendPath, frontendURL)
}
