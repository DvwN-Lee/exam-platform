# =============================================================================
# Cloud Build Module - Main Configuration
# =============================================================================

# -----------------------------------------------------------------------------
# Cloud Build Service Account
# -----------------------------------------------------------------------------
resource "google_service_account" "cloud_build" {
  project      = var.project_id
  account_id   = "${var.environment}-cloud-build"
  display_name = "Cloud Build SA (${var.environment})"
}

resource "google_project_iam_member" "cloud_build_ar_writer" {
  project = var.project_id
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${google_service_account.cloud_build.email}"
}

resource "google_project_iam_member" "cloud_build_log_writer" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.cloud_build.email}"
}

# Cloud Build SA -> Deploy Key Secret 읽기 권한 (Git Write-Back)
resource "google_secret_manager_secret_iam_member" "cloud_build_deploy_key" {
  project   = var.project_id
  secret_id = "github-deploy-key"
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloud_build.email}"
}

# -----------------------------------------------------------------------------
# GitHub Connection (Cloud Build 2nd Gen)
# -----------------------------------------------------------------------------
resource "google_cloudbuildv2_connection" "github" {
  project  = var.project_id
  location = var.region
  name     = "${var.environment}-github-connection"

  github_config {
    app_installation_id = var.github_app_installation_id

    authorizer_credential {
      oauth_token_secret_version = var.github_oauth_token_secret_version
    }
  }
}

resource "google_cloudbuildv2_repository" "main" {
  project           = var.project_id
  location          = var.region
  name              = "${var.github_owner}-${var.github_repo}"
  parent_connection = google_cloudbuildv2_connection.github.name
  remote_uri        = "https://github.com/${var.github_owner}/${var.github_repo}.git"
}

# -----------------------------------------------------------------------------
# Cloud Build Triggers
# -----------------------------------------------------------------------------
resource "google_cloudbuild_trigger" "backend" {
  project         = var.project_id
  location        = var.region
  name            = "${var.environment}-backend-build"
  description     = "Backend image build on ${var.branch} push (examonline/**)"
  service_account = google_service_account.cloud_build.id

  repository_event_config {
    repository = google_cloudbuildv2_repository.main.id
    push {
      branch = "^${var.branch}$"
    }
  }

  included_files = ["examonline/**"]

  filename = "cloudbuild-backend.yaml"

  substitutions = {
    _IMAGE_URL = "${var.registry_url}/backend"
  }
}

resource "google_cloudbuild_trigger" "frontend" {
  project         = var.project_id
  location        = var.region
  name            = "${var.environment}-frontend-build"
  description     = "Frontend image build on ${var.branch} push (frontend/**)"
  service_account = google_service_account.cloud_build.id

  repository_event_config {
    repository = google_cloudbuildv2_repository.main.id
    push {
      branch = "^${var.branch}$"
    }
  }

  included_files = ["frontend/**"]

  filename = "cloudbuild-frontend.yaml"

  substitutions = {
    _IMAGE_URL          = "${var.registry_url}/frontend"
    _VITE_API_BASE_URL  = var.vite_api_base_url
  }
}
