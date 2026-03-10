# Data Backup and Recovery Guide

This document outlines the backup strategy and recovery procedures for the Tomato Admin application.

## Overview

**Database**: Supabase (PostgreSQL) hosted in Singapore
**Backup Responsibility**: Shared between Supabase (automatic) and manual exports

---

## Supabase Automatic Backups

### What's Included (Automatic)

Supabase provides automatic daily backups for Pro plans:

| Component | Backup Frequency | Retention |
|-----------|------------------|-----------|
| PostgreSQL Database | Daily | 7 days (Pro) |
| WAL Archives | Continuous | Point-in-time recovery |

### How to Access

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Settings → Database → Backups**
4. View available backup snapshots

### Point-in-Time Recovery (PITR)

For Pro plans, Supabase supports restoring to any point in time within the retention period:

1. Go to **Settings → Database → Backups**
2. Click "Restore to point in time"
3. Select the target timestamp
4. Confirm the restore operation

**Warning**: PITR creates a new project. Original data is preserved.

---

## Manual Backup Procedures

### Full Database Export (Recommended: Weekly)

Use `pg_dump` via Supabase CLI or connection string:

```bash
# Using Supabase CLI
supabase db dump -f backup_$(date +%Y%m%d).sql

# Or using pg_dump directly
pg_dump "postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres" \
  -F c -f backup_$(date +%Y%m%d).dump
```

### Table-Specific Export

For critical business data:

```sql
-- Export specific tables
pg_dump "your_connection_string" \
  --data-only \
  --table=customers \
  --table=orders \
  --table=order_deliveries \
  --table=stocks \
  -f business_data_$(date +%Y%m%d).sql
```

### Storage Backup

Document files stored in Supabase Storage should be backed up separately:

```bash
# Using Supabase CLI (if storage is used)
supabase storage download --recursive bucket_name ./storage_backup
```

---

## Backup Schedule Recommendation

| Backup Type | Frequency | Retention | Storage Location |
|-------------|-----------|-----------|------------------|
| Supabase Auto | Daily | 7 days | Supabase Cloud |
| Manual Full DB | Weekly | 4 weeks | Local/Cloud Storage |
| Business Data | Daily | 30 days | Cloud Storage (S3/OSS) |

---

## Recovery Procedures

### Scenario 1: Accidental Data Deletion

**Symptoms**: Records accidentally deleted by application bug or user error

**Recovery Steps**:

1. **Immediate**: Stop writes to prevent further data loss
   ```sql
   -- In Supabase SQL Editor, lock affected tables
   LOCK TABLE orders IN ACCESS SHARE MODE;
   ```

2. **Identify scope**: Check what was deleted
   ```sql
   -- Enable temporal table queries if available
   SELECT * FROM orders FOR SYSTEM_TIME AS OF '2024-01-15 10:00:00';
   ```

3. **Restore from backup**:
   - Option A: Use Supabase PITR to create restored project
   - Option B: Manual restore from pg_dump backup

4. **Migrate data back**:
   ```sql
   -- Insert missing records from backup
   INSERT INTO orders
   SELECT * FROM backup_orders
   WHERE id NOT IN (SELECT id FROM orders);
   ```

### Scenario 2: Database Corruption

**Symptoms**: Queries failing, data integrity issues

**Recovery Steps**:

1. **Create support ticket** with Supabase immediately
2. **Download latest backup** from Supabase dashboard
3. **Evaluate PITR** to recent healthy state
4. **Export healthy data** to new project if needed

### Scenario 3: Complete Project Loss

**Symptoms**: Project deleted, region unavailable, catastrophic failure

**Recovery Steps**:

1. **Create new Supabase project** in same region
2. **Restore from latest backup**:
   ```bash
   # Restore from pg_dump backup
   psql "new_connection_string" < backup_20240115.sql
   ```
3. **Update application environment variables**
4. **Verify data integrity**
5. **Resume operations**

### Scenario 4: Malicious Attack / Ransomware

**Symptoms**: Data encrypted, deleted, or held ransom

**Recovery Steps**:

1. **Immediately revoke all access**:
   - Rotate all API keys in Supabase dashboard
   - Change database password
   - Review and remove suspicious auth users

2. **Document attack details** for authorities

3. **Restore from backup predating attack**

4. **Security audit** before resuming:
   - Review RLS policies
   - Check for malicious code/firmware
   - Enable additional security features

---

## Emergency Contacts

| Role | Contact |
|------|---------|
| Supabase Support | support@supabase.com |
| Project Owner | [Your Name] |
| Backup Storage | [Your Backup Location] |

---

## Backup Verification Checklist

Run monthly to ensure backups are working:

- [ ] Can access Supabase backup dashboard
- [ ] Most recent backup is < 24 hours old
- [ ] Manual backup script runs without errors
- [ ] Backup files exist in cloud storage
- [ ] Test restore on staging environment (quarterly)

---

## Scripts Directory

Store backup scripts in the project:

```
scripts/
  backup.sh      # Full backup script
  restore.sh     # Restore script
  verify.sh      # Backup verification
```

---

## Important Notes

1. **Never store database passwords in scripts** - use environment variables
2. **Test restore procedures quarterly**
3. **Keep backups in a different region/account** than production
4. **Document any schema changes** that affect backup/restore
5. **Include Supabase Storage** if your app uses file uploads

---

## Supabase Dashboard Quick Links

- **Backups**: https://supabase.com/dashboard/project/[PROJECT_ID]/database/backups
- **Logs**: https://supabase.com/dashboard/project/[PROJECT_ID]/logs
- **Settings**: https://supabase.com/dashboard/project/[PROJECT_ID]/settings/general
