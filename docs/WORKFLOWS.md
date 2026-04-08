# Tomato Admin - Workflow Documentation

This document outlines the development, preview, and deployment workflows for the Tomato Admin project.

---

## 1. LOCAL DEVELOPMENT WORKFLOW

### Starting the Development Server

```bash
# Navigate to project directory
cd /Users/Paul/tomato-admin

# Install dependencies (if needed)
npm install

# Start development server
npm run dev
```

### Access URL
- **Local**: http://localhost:5173
- The dev server will display the exact URL in the terminal

### Database Connection
- **IMPORTANT**: Local development connects to the **production Supabase database**
- No separate development database exists
- All data changes during local testing affect real production data

### Safety Considerations

| Safe Operations | Risky Operations |
|----------------|------------------|
| Viewing data | Creating test orders |
| Testing read features | Modifying customer data |
| UI/UX changes | Deleting records |
| Bug fixes (read-only) | Bulk operations |

### Best Practices for Local Development
1. **Always check before modifying data** - Ask yourself if this change should affect production
2. **Use test accounts** - Create dedicated test customers if needed
3. **Communicate with team** - Let others know when you're testing features that modify data
4. **Test destructive operations carefully** - Consider using Supabase branching for isolated testing

### Hot Reload Behavior
- Vite provides instant hot module replacement (HMR)
- Changes to Vue components update instantly without full page reload
- Changes to TypeScript files may require a page refresh
- Changes to `vite.config.ts` or `package.json` require server restart

### When to Use This Workflow
- Developing new features
- Debugging issues
- UI/UX improvements
- Testing code changes before deployment

---

## 2. PREVIEW BRANCH WORKFLOW

### Creating a Preview Deployment

Preview deployments allow testing changes in a production-like environment before going live.

```bash
# 1. Create a feature branch from main
git checkout -b feature/my-new-feature

# 2. Make your changes and commit
git add .
git commit -m "feat: add new feature"

# 3. Push to origin (creates remote branch)
git push -u origin feature/my-new-feature

# 4. Deploy to preview (without --branch=master)
npm run build
npx wrangler pages deploy dist --project-name=tomato-admin --branch=feature-my-new-feature
```

### Preview URL Format
- **URL Pattern**: `https://<branch-name>.tomato-admin.pages.dev`
- **Example**: `https://feature-my-new-feature.tomato-admin.pages.dev`

### Preview vs Production

| Aspect | Preview | Production |
|--------|---------|------------|
| URL | `<branch>.pages.dev` | `hongfantian.dpdns.org` |
| Database | Production Supabase | Production Supabase |
| Visibility | Only you/team | All users |
| Indexing | No index | Indexed by search engines |

### Cleaning Up Preview Branches

```bash
# Delete local branch
git checkout main
git branch -D feature/my-new-feature

# Delete remote branch
git push origin --delete feature/my-new-feature
```

### When to Use This Workflow
- Testing major UI changes
- Sharing work-in-progress with stakeholders
- QA testing before production deployment
- Feature branch review

---

## 3. PRODUCTION DEPLOYMENT WORKFLOW

### CRITICAL REQUIREMENT
**Always use `--branch=master` for production deployments.**
Without this flag, the deployment goes to preview only.

### Pre-Deployment Checklist

- [ ] All tests pass locally
- [ ] Code reviewed and approved
- [ ] Changes tested in preview (recommended)
- [ ] Migration scripts ready (if database changes)
- [ ] Notification to team (if significant changes)
- [ ] Verified you're on correct branch

### Deployment Commands

```bash
# 1. Pull latest changes
git checkout main
git pull origin main

# 2. Ensure dependencies are up to date
npm install

# 3. Build the project
npm run build

# 4. Deploy to production
# CRITICAL: --branch=master is REQUIRED for production
npx wrangler pages deploy dist --project-name=tomato-admin --branch=master
```

### One-Liner Deployment
```bash
npm run build && npx wrangler pages deploy dist --project-name=tomato-admin --branch=master
```

### Verifying Deployment

1. **Check URL**: Visit https://hongfantian.dpdns.org
2. **Check Deployment Logs**: Cloudflare Pages dashboard
3. **Verify Features**: Test key functionality
4. **Check Console**: No JavaScript errors in browser dev tools

### Deployment Timeline
- Build: ~30-60 seconds
- Upload to Cloudflare: ~10-30 seconds
- CDN propagation: ~1-5 minutes globally

### When to Use This Workflow
- Releasing new features
- Deploying bug fixes
- Urgent hotfixes
- Scheduled releases

---

## 4. DATABASE SAFETY

### Development Database Reality
- **Production database is used for all environments**
- No separate staging or development database exists
- Local dev, preview, and production all use the same Supabase instance

### Safe vs Risky Operations

#### Safe Operations (Direct on Production)
- Reading data (orders, customers, products)
- Creating legitimate orders
- Updating order status
- Customer service operations

#### Risky Operations (Consider Supabase Branching)
- Schema migrations
- Bulk data updates
- Testing destructive features
- Performance testing with large datasets

### Supabase Branching (Optional)

Supabase offers branching to create isolated database copies for testing.

#### Creating a Branch
```bash
# Using Supabase CLI
supabase branches create my-test-branch

# Or via Supabase Dashboard:
# Settings > Database > Branches > Create Branch
```

#### Using a Branch
1. Create branch in Supabase dashboard
2. Update `.env` to use branch connection string
3. Run tests and experiments
4. Delete branch when done

#### Deleting a Branch
```bash
# Via CLI
supabase branches delete my-test-branch

# Or via Supabase Dashboard:
# Settings > Database > Branches > [Branch] > Delete
```

### When to Use Supabase Branching
- Major schema changes
- Testing migrations
- Performance testing
- Data-intensive experiments

---

## 5. EMERGENCY ROLLBACK

### Scenario: A Bad Deployment

If a deployment introduces critical bugs, follow these steps to rollback.

### Option 1: Quick Revert and Redeploy

```bash
# 1. Go to project directory
cd /Users/Paul/tomato-admin

# 2. Check recent commits
git log --oneline -5

# 3. Revert the problematic commit
git revert <commit-hash>

# 4. Build and redeploy
npm run build
npx wrangler pages deploy dist --project-name=tomato-admin --branch=master
```

### Option 2: Reset to Previous Version

```bash
# 1. Check recent commits
git log --oneline -10

# 2. Reset to a known-good commit
git reset --hard <known-good-commit-hash>

# 3. Build and redeploy
npm run build
npx wrangler pages deploy dist --project-name=tomato-admin --branch=master

# 4. Force push to update origin (if needed)
git push origin main --force
```

### Option 3: Cloudflare Pages Rollback

1. Go to Cloudflare Pages Dashboard
2. Select `tomato-admin` project
3. Go to **Deployments** tab
4. Find the last known-good deployment
5. Click **Rollback to this deployment**

### When to Use Each Option

| Option | Use When | Speed | Risk |
|--------|----------|-------|------|
| Git revert | Single bad commit | Medium | Low |
| Git reset + force push | Multiple bad commits | Fast | Medium |
| Cloudflare rollback | Immediate need | Fastest | Lowest |

### Post-Rollback Actions
1. Investigate the cause of the bad deployment
2. Fix the issue in a separate branch
3. Test thoroughly in preview
4. Document the incident
5. Deploy fix via normal workflow

---

## 6. BRANCH STRUCTURE

### Overview

The project uses a non-standard branch structure due to Cloudflare Pages configuration.

```
Local Repository                    Remote (GitHub)                    Cloudflare Pages
===============                    ===============                    ================
main (default)          --->       origin/main            --->        Preview deployments
                                     origin/master          --->        Production (hongfantian.dpdns.org)
```

### Branch Details

| Branch | Location | Purpose | Deployment |
|--------|----------|---------|------------|
| `main` | Local | Active development | None (local only) |
| `origin/main` | GitHub | Backup/sync | Preview (via default) |
| `origin/master` | GitHub | Production source | Production |
| `master` | Local | Legacy/sync | Not used directly |

### Critical Rules

1. **NEVER deploy without `--branch=master`** - This is the production flag
2. **Local branch is `main`, Cloudflare uses `master`** - This is intentional
3. **Both `main` and `master` exist on origin** - For historical reasons
4. **Always work on `main` locally** - Then deploy with master flag

### Common Mistakes to Avoid

```bash
# WRONG - Deploys to preview only
npx wrangler pages deploy dist --project-name=tomato-admin

# WRONG - Wrong branch name
npx wrangler pages deploy dist --project-name=tomato-admin --branch=main

# WRONG - Forgot to build
npx wrangler pages deploy dist --project-name=tomato-admin --branch=master

# CORRECT - Full production deployment
npm run build && npx wrangler pages deploy dist --project-name=tomato-admin --branch=master
```

### Branch Workflow Diagram

```
┌─────────────────┐
│  Local Changes  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  git push origin│
│      main       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Build & Deploy  │
│  --branch=master│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Production    │
│ hongfantian.dpdns.org │
└─────────────────┘
```

---

## Quick Reference

### Common Commands

| Task | Command |
|------|---------|
| Start dev server | `npm run dev` |
| Build project | `npm run build` |
| Deploy to production | `npm run build && npx wrangler pages deploy dist --project-name=tomato-admin --branch=master` |
| Deploy to preview | `npm run build && npx wrangler pages deploy dist --project-name=tomato-admin` |
| Run tests | `npm run test` |
| Check git status | `git status` |
| View recent commits | `git log --oneline -5` |

### URLs

| Environment | URL |
|-------------|-----|
| Production | https://hongfantian.dpdns.org |
| Preview | `https://<branch>.tomato-admin.pages.dev` |
| Local Dev | http://localhost:5173 |
| Cloudflare Dashboard | https://dash.cloudflare.com |
| Supabase Dashboard | https://supabase.com/dashboard |

---

## 7. CI/CD (GitHub Actions)

### Pipeline Overview

The project uses GitHub Actions for continuous integration (`.github/workflows/ci.yml`):

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   test      │ ──► │    e2e      │ ──► │   build     │
│ (unit tests)│     │ (playwright)│     │ (artifacts) │
└─────────────┘     └─────────────┘     └─────────────┘
```

### Required GitHub Secrets

For CI to pass, configure these secrets in GitHub repository settings:

**Settings → Secrets and variables → Actions → New repository secret**

| Secret | Required For | Description |
|--------|--------------|-------------|
| `VITE_SUPABASE_URL` | Build, E2E | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Build, E2E | Supabase anonymous key |
| `VITE_AMAP_KEY` | Build, E2E | AMap Web Service Key |
| `VITE_AMAP_JS_KEY` | Build, E2E | AMap JS API Key |
| `VITE_AMAP_JS_SECURITY_KEY` | Build, E2E | AMap security key |
| `TEST_USER_EMAIL` | E2E (optional) | Test account email for E2E auth |
| `TEST_USER_PASSWORD` | E2E (optional) | Test account password |
| `VITE_SENTRY_DSN` | Optional | Sentry error tracking |
| `VITE_FUNDEBUG_APIKEY` | Optional | Fundebug error tracking |

### CI Behavior

1. **Unit Tests**: Always run. Must pass for CI to succeed.
2. **E2E Tests**: Gracefully skip if `TEST_USER_EMAIL` and `TEST_USER_PASSWORD` aren't set.
3. **Build**: Creates production artifacts for deployment.

### Running Tests Locally

```bash
# Unit tests
npm run test:run

# E2E tests (requires dev server)
npm run dev              # Terminal 1
npm run test:e2e         # Terminal 2

# Or let Playwright start the server
npm run test:e2e         # Playwright will start dev server automatically
```

### Troubleshooting CI Failures

| Failure | Likely Cause | Solution |
|---------|--------------|----------|
| Unit test failure | Code change broke test | Run `npm run test:run` locally, fix |
| Build failure | TypeScript error | Run `npm run build` locally |
| E2E timeout | Server slow to start | Check webServer config |
| Auth test skip | Missing secrets | Configure GitHub secrets |
| E2E flaky | Network/timeout issues | Increase retries in CI |

### CI on Different Branches

- **main**: CI runs on push
- **master**: CI runs on push (production branch)
- **PRs**: CI runs on pull requests to main/master

---

*Last updated: April 2026*
