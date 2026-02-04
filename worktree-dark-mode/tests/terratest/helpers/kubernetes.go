package helpers

import (
	"fmt"
	"net/http"
	"testing"
	"time"

	"github.com/gruntwork-io/terratest/modules/k8s"
	"github.com/gruntwork-io/terratest/modules/retry"
)

// WaitForDeploymentReady는 Deployment가 Ready 상태가 될 때까지 대기
func WaitForDeploymentReady(t *testing.T, kubectlOpts *k8s.KubectlOptions, deploymentName string, timeout time.Duration) {
	t.Helper()

	retries := int(timeout.Seconds() / 10)
	retry.DoWithRetry(t, fmt.Sprintf("Waiting for deployment %s to be ready", deploymentName), retries, 10*time.Second,
		func() (string, error) {
			deployment := k8s.GetDeployment(t, kubectlOpts, deploymentName)
			if deployment.Status.ReadyReplicas == *deployment.Spec.Replicas {
				return "Deployment is ready", nil
			}
			return "", fmt.Errorf("deployment not ready: %d/%d replicas ready",
				deployment.Status.ReadyReplicas, *deployment.Spec.Replicas)
		})
}

// WaitForServiceEndpoint는 Service의 Endpoint가 준비될 때까지 대기
func WaitForServiceEndpoint(t *testing.T, kubectlOpts *k8s.KubectlOptions, serviceName string, timeout time.Duration) {
	t.Helper()

	retries := int(timeout.Seconds() / 5)
	retry.DoWithRetry(t, fmt.Sprintf("Waiting for service %s endpoints", serviceName), retries, 5*time.Second,
		func() (string, error) {
			service := k8s.GetService(t, kubectlOpts, serviceName)
			if len(service.Spec.Ports) > 0 {
				return "Service has endpoints", nil
			}
			return "", fmt.Errorf("service has no endpoints")
		})
}

// CheckHealthEndpoint는 Health endpoint의 응답을 확인
func CheckHealthEndpoint(t *testing.T, url string, expectedStatus int, timeout time.Duration) {
	t.Helper()

	retries := int(timeout.Seconds() / 5)
	retry.DoWithRetry(t, fmt.Sprintf("Checking health endpoint %s", url), retries, 5*time.Second,
		func() (string, error) {
			client := &http.Client{Timeout: 10 * time.Second}
			resp, err := client.Get(url)
			if err != nil {
				return "", err
			}
			defer resp.Body.Close()

			if resp.StatusCode != expectedStatus {
				return "", fmt.Errorf("unexpected status code: %d", resp.StatusCode)
			}
			return "Health check passed", nil
		})
}

// PortForwardService는 Service에 대한 port-forward를 설정하고 local URL을 반환
func PortForwardService(t *testing.T, kubectlOpts *k8s.KubectlOptions, serviceName string, localPort int, remotePort int) (string, func()) {
	t.Helper()

	tunnel := k8s.NewTunnel(kubectlOpts, k8s.ResourceTypeService, serviceName, localPort, remotePort)
	tunnel.ForwardPort(t)

	cleanup := func() {
		tunnel.Close()
	}

	return fmt.Sprintf("http://localhost:%d", localPort), cleanup
}

// GetPodLogs는 특정 Pod의 로그를 가져옴
func GetPodLogs(t *testing.T, kubectlOpts *k8s.KubectlOptions, podName string) string {
	t.Helper()
	pod := k8s.GetPod(t, kubectlOpts, podName)
	return k8s.GetPodLogs(t, kubectlOpts, pod, "")
}

// WaitForPodReady는 Pod가 Ready 상태가 될 때까지 대기
func WaitForPodReady(t *testing.T, kubectlOpts *k8s.KubectlOptions, podName string, timeout time.Duration) {
	t.Helper()

	retries := int(timeout.Seconds() / 5)
	retry.DoWithRetry(t, fmt.Sprintf("Waiting for pod %s to be ready", podName), retries, 5*time.Second,
		func() (string, error) {
			pod := k8s.GetPod(t, kubectlOpts, podName)
			for _, condition := range pod.Status.Conditions {
				if condition.Type == "Ready" && condition.Status == "True" {
					return "Pod is ready", nil
				}
			}
			return "", fmt.Errorf("pod not ready")
		})
}
