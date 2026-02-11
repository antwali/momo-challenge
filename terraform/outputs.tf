output "postgres_host" {
  description = "PostgreSQL host (use localhost when accessing from host)"
  value       = "localhost"
}

output "port" {
  description = "PostgreSQL port"
  value       = var.port
}

output "database_url_dev" {
  description = "Connection string for development database"
  value       = "postgresql://${var.postgres_user}:${var.postgres_password}@localhost:${var.port}/${var.db_name_dev}?schema=public"
  sensitive   = true
}

output "database_url_test" {
  description = "Connection string for test database"
  value       = "postgresql://${var.postgres_user}:${var.postgres_password}@localhost:${var.port}/${var.db_name_test}?schema=public"
  sensitive   = true
}

output "container_name" {
  description = "PostgreSQL container name"
  value       = docker_container.postgres.name
}
