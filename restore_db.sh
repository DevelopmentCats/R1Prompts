#!/bin/bash

# Load environment variables
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
else
  echo "Error: .env file not found."
  exit 1
fi

# Database configuration
DB_NAME="${POSTGRES_DB:-rabbitr1_prompts}"
DB_USER="${POSTGRES_USER:-rabbitr1}"
DB_PASSWORD="${POSTGRES_PASSWORD}"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"

WORKSPACE_DIR="$(pwd)"
SQL_FILE="$WORKSPACE_DIR/rabbitr1_prompts_backup.sql"

# Check if required env vars are set
if [ -z "$DB_PASSWORD" ]; then
  echo "Error: POSTGRES_PASSWORD not set in .env file."
  exit 1
fi

# Check if SQL file exists
if [ ! -f "$SQL_FILE" ]; then
  echo "Error: SQL backup file not found at $SQL_FILE"
  exit 1
fi

echo "Using SQL backup file: $SQL_FILE"

# Prepare database
echo "Preparing database for restoration..."

# Create the user if it doesn't exist
echo "Creating database user $DB_USER if it doesn't exist..."
sudo -u postgres psql -c "DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$DB_USER') THEN
    CREATE ROLE $DB_USER WITH LOGIN SUPERUSER PASSWORD '$DB_PASSWORD';
  ELSE
    ALTER ROLE $DB_USER WITH PASSWORD '$DB_PASSWORD';
  END IF;
END
\$\$;"

# Check if database exists
if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
  echo "Database $DB_NAME exists. Dropping..."
  sudo -u postgres psql -c "DROP DATABASE IF EXISTS $DB_NAME;"
fi

# Create fresh database
echo "Creating new database $DB_NAME owned by $DB_USER..."
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"

# Restore from SQL file
echo "Restoring database from SQL file..."
sudo -u postgres psql "$DB_NAME" < "$SQL_FILE"

# Verify the restoration
echo "Verifying database restoration..."
TABLES_COUNT=$(sudo -u postgres psql -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" "$DB_NAME")
echo "Number of tables restored: $TABLES_COUNT"

echo "Database restoration completed!" 