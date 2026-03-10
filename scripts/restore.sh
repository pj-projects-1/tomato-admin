#!/bin/bash
# Tomato Admin - Database Restore Script
# Usage: ./scripts/restore.sh <backup_file>

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKUP_FILE="${1:-}"
DRY_RUN="${DRY_RUN:-false}"

echo -e "${GREEN}=== Tomato Admin Restore Script ===${NC}"

# Validate arguments
if [ -z "$BACKUP_FILE" ]; then
    echo -e "${RED}Error: No backup file specified${NC}"
    echo "Usage: $0 <backup_file>"
    echo ""
    echo "Available backups:"
    ls -lh ./backups/*.dump ./backups/*.sql 2>/dev/null || echo "No backups found in ./backups/"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}Error: Backup file not found: $BACKUP_FILE${NC}"
    exit 1
fi

# Check required environment variables
if [ -z "$SUPABASE_DB_URL" ]; then
    echo -e "${RED}Error: SUPABASE_DB_URL environment variable not set${NC}"
    echo "Set it with: export SUPABASE_DB_URL='postgresql://postgres...'"
    exit 1
fi

# Verify checksum if available
if [ -f "${BACKUP_FILE}.sha256" ]; then
    echo -e "${YELLOW}Verifying checksum...${NC}"
    if sha256sum -c "${BACKUP_FILE}.sha256" --quiet; then
        echo -e "${GREEN}Checksum verified${NC}"
    else
        echo -e "${RED}Checksum verification failed!${NC}"
        echo "The backup file may be corrupted."
        read -p "Continue anyway? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
fi

# Display warning
echo ""
echo -e "${YELLOW}=============================================${NC}"
echo -e "${YELLOW}WARNING: This will modify the production database${NC}"
echo -e "${YELLOW}=============================================${NC}"
echo ""
echo "Backup file: $BACKUP_FILE"
echo "Target database: [configured in SUPABASE_DB_URL]"
echo ""

if [ "$DRY_RUN" = "true" ]; then
    echo -e "${YELLOW}DRY RUN MODE - No changes will be made${NC}"
    echo ""
fi

read -p "Are you sure you want to continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Restore cancelled."
    exit 0
fi

# Detect backup format and restore
FILE_EXT="${BACKUP_FILE##*.}"

case "$FILE_EXT" in
    dump)
        echo -e "${YELLOW}Restoring from PostgreSQL custom dump...${NC}"
        if [ "$DRY_RUN" = "true" ]; then
            echo "Would run: pg_restore --dbname=$SUPABASE_DB_URL $BACKUP_FILE"
        else
            # Create a pre-restore backup first
            PRE_RESTORE_BACKUP="./backups/pre_restore_$(date +%Y%m%d_%H%M%S).dump"
            echo -e "${YELLOW}Creating pre-restore backup: $PRE_RESTORE_BACKUP${NC}"
            pg_dump "$SUPABASE_DB_URL" -F c -f "$PRE_RESTORE_BACKUP"

            # Restore
            pg_restore --dbname="$SUPABASE_DB_URL" --clean --if-exists "$BACKUP_FILE"
        fi
        ;;
    sql)
        echo -e "${YELLOW}Restoring from SQL file...${NC}"
        if [ "$DRY_RUN" = "true" ]; then
            echo "Would run: psql -f $BACKUP_FILE"
        else
            # Create a pre-restore backup first
            PRE_RESTORE_BACKUP="./backups/pre_restore_$(date +%Y%m%d_%H%M%S).dump"
            echo -e "${YELLOW}Creating pre-restore backup: $PRE_RESTORE_BACKUP${NC}"
            pg_dump "$SUPABASE_DB_URL" -F c -f "$PRE_RESTORE_BACKUP"

            # Restore
            psql "$SUPABASE_DB_URL" -f "$BACKUP_FILE"
        fi
        ;;
    *)
        echo -e "${RED}Unknown backup format: $FILE_EXT${NC}"
        exit 1
        ;;
esac

if [ "$DRY_RUN" != "true" ]; then
    echo -e "${GREEN}Restore complete!${NC}"
    echo ""
    echo "Post-restore checklist:"
    echo "  [ ] Verify application connectivity"
    echo "  [ ] Check recent orders exist"
    echo "  [ ] Verify customer data"
    echo "  [ ] Test critical workflows"
else
    echo -e "${GREEN}Dry run complete${NC}"
fi
