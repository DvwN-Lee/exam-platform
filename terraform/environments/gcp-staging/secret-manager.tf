# =============================================================================
# Google Secret Manager - Infrastructure Secrets
# =============================================================================

# -----------------------------------------------------------------------------
# Database Credentials
# -----------------------------------------------------------------------------
resource "google_secret_manager_secret" "db_host" {
  secret_id = "examonline-staging-db-host"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "db_host" {
  secret      = google_secret_manager_secret.db_host.id
  secret_data = module.cloudsql.private_ip_address
}

resource "google_secret_manager_secret" "db_port" {
  secret_id = "examonline-staging-db-port"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "db_port" {
  secret      = google_secret_manager_secret.db_port.id
  secret_data = var.db_port
}

resource "google_secret_manager_secret" "db_name" {
  secret_id = "examonline-staging-db-name"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "db_name" {
  secret      = google_secret_manager_secret.db_name.id
  secret_data = var.database_name
}

resource "google_secret_manager_secret" "db_user" {
  secret_id = "examonline-staging-db-user"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "db_user" {
  secret      = google_secret_manager_secret.db_user.id
  secret_data = module.cloudsql.database_user
}

resource "google_secret_manager_secret" "db_password" {
  secret_id = "examonline-staging-db-password"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "db_password" {
  secret      = google_secret_manager_secret.db_password.id
  secret_data = module.cloudsql.database_password
}

# -----------------------------------------------------------------------------
# Redis Credentials
# -----------------------------------------------------------------------------
resource "google_secret_manager_secret" "redis_host" {
  secret_id = "examonline-staging-redis-host"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "redis_host" {
  secret      = google_secret_manager_secret.redis_host.id
  secret_data = module.memorystore.host
}

resource "google_secret_manager_secret" "redis_port" {
  secret_id = "examonline-staging-redis-port"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "redis_port" {
  secret      = google_secret_manager_secret.redis_port.id
  secret_data = "6379"
}

# -----------------------------------------------------------------------------
# Application Secrets
# -----------------------------------------------------------------------------
resource "random_password" "django_secret_key" {
  length  = 50
  special = true
}

resource "google_secret_manager_secret" "django_secret_key" {
  secret_id = "examonline-staging-django-secret-key"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "django_secret_key" {
  secret      = google_secret_manager_secret.django_secret_key.id
  secret_data = random_password.django_secret_key.result
}

resource "random_password" "jwt_secret_key" {
  length  = 32
  special = true
}

resource "google_secret_manager_secret" "jwt_secret_key" {
  secret_id = "examonline-staging-jwt-secret-key"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "jwt_secret_key" {
  secret      = google_secret_manager_secret.jwt_secret_key.id
  secret_data = random_password.jwt_secret_key.result
}

# -----------------------------------------------------------------------------
# GCS Bucket Name (for backend configuration)
# -----------------------------------------------------------------------------
resource "google_secret_manager_secret" "gcs_bucket_name" {
  secret_id = "examonline-staging-gcs-bucket-name"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "gcs_bucket_name" {
  secret      = google_secret_manager_secret.gcs_bucket_name.id
  secret_data = module.gcs.bucket_name
}
