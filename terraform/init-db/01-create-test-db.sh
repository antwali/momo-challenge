#!/bin/bash
set -e
# Creates the test database (dev DB is created by POSTGRES_DB).
# Runs in /docker-entrypoint-initdb.d; same user as main DB.
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  CREATE DATABASE momo_wallet_test;
EOSQL
