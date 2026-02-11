# PostgreSQL for dev + test (single container, two databases)

resource "docker_network" "momo" {
  name = "momo-net"
}

resource "docker_volume" "pgdata" {
  name = "momo-pgdata"
}

resource "docker_image" "postgres" {
  name = var.postgres_image
}

resource "docker_container" "postgres" {
  name  = "momo-postgres"
  image = docker_image.postgres.image_id
  hostname = "postgres"

  env = [
    "POSTGRES_USER=${var.postgres_user}",
    "POSTGRES_PASSWORD=${var.postgres_password}",
    "POSTGRES_DB=${var.db_name_dev}",
  ]

  ports {
    internal = 5432
    external = var.port
  }

  volumes {
    volume_name    = docker_volume.pgdata.name
    container_path = "/var/lib/postgresql/data"
  }

  volumes {
    host_path      = abspath("${path.module}/init-db")
    container_path = "/docker-entrypoint-initdb.d"
    read_only      = true
  }

  networks_advanced {
    name = docker_network.momo.name
  }

  restart = "unless-stopped"

  healthcheck {
    test         = ["CMD-SHELL", "pg_isready -U ${var.postgres_user} -d ${var.db_name_dev}"]
    interval     = "5s"
    timeout      = "5s"
    retries      = 5
    start_period = "10s"
  }
}
