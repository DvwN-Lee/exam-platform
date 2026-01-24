terraform {
  required_version = ">= 1.0.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }

  # Phase 1: Local state (첫 실행 시)
  # Phase 3: GCS backend로 마이그레이션 후 아래 주석 해제
  # backend "gcs" {
  #   bucket = "titanium-k3s-20260123-tf-state-staging"
  #   prefix = "bootstrap"
  # }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

module "state_bucket" {
  source = "../modules/gcs-state-bucket"

  project_id  = var.project_id
  environment = var.environment
  location    = var.location
}
