#!/bin/bash

# Database configuration
DB_NAME="rabbitr1_prompts"
BACKUP_DIR="/home/rabbitr1-prompts/backups"
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.sql"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Create full database backup
echo "Creating database backup..."
sudo -u postgres pg_dump "$DB_NAME" > "$BACKUP_FILE"

# Compress the backup
gzip "$BACKUP_FILE"

# Keep only last 7 days of backups
find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +7 -delete

echo "Backup completed: ${BACKUP_FILE}.gz"

# List all current backups
echo "Current backups:"
ls -lh "$BACKUP_DIR"
