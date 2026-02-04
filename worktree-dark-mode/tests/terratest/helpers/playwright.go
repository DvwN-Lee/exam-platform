package helpers

import (
	"os/exec"
	"testing"

	"github.com/stretchr/testify/require"
)

// PlaywrightOptions는 Playwright 테스트 실행 옵션
type PlaywrightOptions struct {
	ProjectDir  string
	TestPattern string
	BaseURL     string
	Project     string // chromium, firefox, webkit
	Headless    bool
	Timeout     int // milliseconds
}

// RunPlaywrightSmokeTests는 Playwright smoke test를 실행
func RunPlaywrightSmokeTests(t *testing.T, opts *PlaywrightOptions) {
	t.Helper()

	args := []string{"playwright", "test"}

	if opts.TestPattern != "" {
		args = append(args, opts.TestPattern)
	}

	if opts.Project != "" {
		args = append(args, "--project", opts.Project)
	}

	if opts.Headless {
		args = append(args, "--headed=false")
	}

	cmd := exec.Command("npx", args...)
	cmd.Dir = opts.ProjectDir

	if opts.BaseURL != "" {
		cmd.Env = append(cmd.Environ(), "PLAYWRIGHT_BASE_URL="+opts.BaseURL)
	}

	output, err := cmd.CombinedOutput()
	require.NoError(t, err, "Playwright tests failed: %s", string(output))
}

// RunHealthCheckTests는 배포 후 health check 테스트만 실행
func RunHealthCheckTests(t *testing.T, frontendDir string, baseURL string) {
	t.Helper()

	opts := &PlaywrightOptions{
		ProjectDir:  frontendDir,
		TestPattern: "smoke/*.spec.ts",
		BaseURL:     baseURL,
		Project:     "chromium",
		Headless:    true,
	}

	RunPlaywrightSmokeTests(t, opts)
}

// RunSpecificTest는 특정 테스트 파일을 실행
func RunSpecificTest(t *testing.T, frontendDir string, testFile string, baseURL string) {
	t.Helper()

	opts := &PlaywrightOptions{
		ProjectDir:  frontendDir,
		TestPattern: testFile,
		BaseURL:     baseURL,
		Project:     "chromium",
		Headless:    true,
	}

	RunPlaywrightSmokeTests(t, opts)
}
