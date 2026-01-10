package helpers

import (
	"path/filepath"
	"runtime"
)

// GetProjectRoot는 프로젝트 루트 디렉토리 경로를 반환
func GetProjectRoot() string {
	_, filename, _, _ := runtime.Caller(0)
	// helpers 디렉토리에서 4단계 상위로 이동하여 프로젝트 루트 획득
	return filepath.Join(filepath.Dir(filename), "..", "..", "..", "..")
}

// GetTerraformModulePath는 Terraform 모듈 경로를 반환
func GetTerraformModulePath(moduleName string) string {
	return filepath.Join(GetProjectRoot(), "terraform", "modules", moduleName)
}

// GetHelmChartPath는 Helm Chart 경로를 반환
func GetHelmChartPath() string {
	return filepath.Join(GetProjectRoot(), "charts", "exam-platform")
}

// GetHelmValuesPath는 특정 환경의 values 파일 경로를 반환
func GetHelmValuesPath(environment string) string {
	chartPath := GetHelmChartPath()
	if environment == "" || environment == "default" {
		return filepath.Join(chartPath, "values.yaml")
	}
	return filepath.Join(chartPath, "values-"+environment+".yaml")
}

// GetFrontendPath는 Frontend 디렉토리 경로를 반환
func GetFrontendPath() string {
	return filepath.Join(GetProjectRoot(), "frontend")
}
