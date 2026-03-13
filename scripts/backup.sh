#!/bin/bash
# Tomato Admin - Database Backup Script
# Usage: ./scripts/backup.sh [full|data-only]

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_TYPE="${1:-full}"
RETENTION_DAYS=30

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Tomato Admin Backup Script ===${NC}"
echo "Timestamp: $TIMESTAMP"
echo "Backup Type: $BACKUP_TYPE"
echo "Backup Directory: $BACKUP_DIR"

# Check required environment variables
if [ -z "$SUPABASE_DB_URL" ]; then
    echo -e "${RED}Error: SUPABASE_DB_URL environment variable not set${NC}"
    echo "Set it with: export SUPABASE_DB_URL='postgresql://postgres...'"
    exit 1
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Generate filename
case "$BACKUP_TYPE" in
    full)
        FILENAME="full_backup_${TIMESTAMP}.dump"
        echo -e "${YELLOW}Creating full database backup...${NC}"
        pg_dump "$SUPABASE_DB_URL" -F c -f "${BACKUP_DIR}/${FILENAME}"
        ;;
    data-only)
        FILENAME="data_backup_${TIMESTAMP}.sql"
        echo -e "${YELLOW}Creating data-only backup...${NC}"
        pg_dump "$SUPABASE_DB_URL" \
            --data-only \
            --table=customers \
            --table=orders \
            --table=order_deliveries \
            --table=stocks \
            --table=delivery_tasks \
            --table=profiles \
            -f "${BACKUP_DIR}/${FILENAME}"
        ;;
    schema)
        FILENAME="schema_backup_${TIMESTAMP}.sql"
        echo -e "${YELLOW}Creating schema-only backup...${NC}"
        pg_dump "$SUPABASE_DB_URL" --schema-only -f "${BACKUP_DIR}/${FILENAME}"
        ;;
    *)
        echo -e "${RED}Unknown backup type: $BACKUP_TYPE${NC}"
        echo "Usage: $0 [full|data-only|schema]"
        exit 1
        ;;
esac

# Check if backup was successful
if [ -f "${BACKUP_DIR}/${FILENAME}" ]; then
    SIZE=$(ls -lh "${BACKUP_DIR}/${FILENAME}" | awk '{print $5}')
    echo -e "${GREEN}Backup created successfully!${NC}"
    echo "File: ${BACKUP_DIR}/${FILENAME}"
    echo "Size: $SIZE"

    # Create checksum
    if command -v sha256sum &> /dev/null; then
        sha256sum "${BACKUP_DIR}/${FILENAME}" > "${BACKUP_DIR}/${FILENAME}.sha256"
        echo "Checksum: ${BACKUP_DIR}/${FILENAME}.sha256"
    fi
else
    echo -e "${RED}Backup failed!${NC}"
    exit 1
fi

# Cleanup old backups
echo -e "${YELLOW}Cleaning up backups older than $RETENTION_DAYS days...${NC}"
find "$BACKUP_DIR" -name "*.dump" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
find "$BACKUP_DIR" -name "*.sql" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
find "$BACKUP_DIR" -name "*.sha256" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true

# List current backups
echo -e "${GREEN}Current backups:${NC}"
ls -lh "$BACKUP_DIR" | tail -5

echo -e "${GREEN}Backup complete!${NC}"
