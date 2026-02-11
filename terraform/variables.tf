variable "postgres_image" {
  description = "PostgreSQL Docker image"
  type        = string
  default     = "postgres:16-alpine"
}

variable "port" {
  description = "Host port for PostgreSQL"
  type        = number
  default     = 5432
}

variable "postgres_user" {
  description = "PostgreSQL user"
  type        = string
  default     = "momo"
}

variable "postgres_password" {
  description = "PostgreSQL password"
  type        = string
  default     = "momo"
  sensitive   = true
}

variable "db_name_dev" {
  description = "Development database name"
  type        = string
  default     = "momo_wallet"
}

variable "db_name_test" {
  description = "Test database name"
  type        = string
  default     = "momo_wallet_test"
}
