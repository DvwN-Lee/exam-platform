# =============================================================================
# Workload Identity - External Secrets Operator
# =============================================================================

# -----------------------------------------------------------------------------
# Service Account for External Secrets Operator
# -----------------------------------------------------------------------------
resource "google_service_account" "external_secrets" {
  account_id   = "external-secrets-prod"
  display_name = "External Secrets Operator for Production Environment"
  description  = "Service Account used by External Secrets Operator to access Google Secret Manager"
}

# -----------------------------------------------------------------------------
# IAM Permissions - Secret Manager Access
# -----------------------------------------------------------------------------
resource "google_project_iam_member" "external_secrets_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.external_secrets.email}"
}

# -----------------------------------------------------------------------------
# Workload Identity Binding
# -----------------------------------------------------------------------------
resource "google_service_account_iam_member" "workload_identity_binding" {
  service_account_id = google_service_account.external_secrets.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[external-secrets/external-secrets]"
}
