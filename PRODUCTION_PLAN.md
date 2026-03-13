# Tomato Admin - China Production Launch Plan

## Executive Summary
- **Target Market**: Mainland China, small organic tomato business
- **Primary User**: Business owner (manages everything solo)
- **Devices**: Desktop (office) + Mobile (field)
- **Current State**: Core features implemented, needs production hardening
- **Timeline**: Flexible (quality over speed)

---

## Phase 1: Production Foundation (Priority: Critical)

### 1.1 Testing Framework
**Why**: Zero test coverage = high regression risk

**Tasks**:
- [ ] Install Vitest + Vue Test Utils
- [ ] Add unit tests for critical paths:
  - Auth store (login/logout/session)
  - Order creation flow
  - Stock management
  - Amap service
- [ ] Add E2E tests with Playwright:
  - Login flow (email + username)
  - Order creation and status changes
  - Delivery route planning

**Files to create**:
```
src/__tests__/auth.test.ts
src/__tests__/orders.test.ts
tests/e2e/login.spec.ts
vitest.config.ts
playwright.config.ts
```

### 1.2 Error Monitoring
**Why**: Production issues need visibility

**Options for China**:
| Service | Pros | Cons |
|---------|------|------|
| Sentry | Industry standard, good docs | May need proxy for China |
| Fundebug | China-native, Chinese docs | Less features |
| FrontJS (腾讯) | Great China CDN, Chinese support | Smaller community |

**Recommendation**: Sentry with China relay OR Fundebug

**Tasks**:
- [ ] Integrate error monitoring SDK
- [ ] Set up alerting (errors > threshold)
- [ ] Add source maps for better stack traces

### 1.3 Data Backup & Safety
**Tasks**:
- [ ] Verify Supabase backup is enabled (Point-in-Time Recovery)
- [ ] Add database migration version control
- [ ] Document restore procedures

---

## Phase 2: Mobile Responsiveness (Priority: High)

### 2.1 Responsive Layout
**Current Gap**: No @media queries, Element Plus defaults not optimized for mobile

**Tasks**:
- [ ] Add responsive breakpoints utility
- [ ] Refactor main layout for mobile:
  - Sidebar → collapsible drawer on mobile
  - Tables → card view on mobile
  - Forms → full-width inputs on mobile
- [ ] Add touch-friendly interactions:
  - Larger tap targets (min 44px)
  - Swipe actions for lists
  - Pull-to-refresh

**Files to modify**:
```
src/layouts/MainLayout.vue
src/views/Orders.vue
src/views/Customers.vue
src/views/Deliveries.vue
```

### 2.2 PWA Support
**Why**: Installable app experience, offline capability, better mobile UX

**Tasks**:
- [ ] Add vite-plugin-pwa
- [ ] Create service worker for offline caching
- [ ] Add app manifest with icons
- [ ] Enable "Add to Home Screen" prompt

**Benefits**:
- Works offline for viewing cached data
- Faster load times
- Native app feel on mobile

---

## Phase 3: China-Specific Deployment (Priority: High)

### 3.1 Hosting Architecture

**Current**: Supabase in Singapore (ap-southeast-1)
- Latency to China: ~50-100ms (acceptable)

**Frontend Deployment Options**:

| Option | Speed in China | ICP Required | Cost | Setup |
|--------|----------------|--------------|------|-------|
| Vercel | Medium (CDN helps) | No | Free | Easy |
| Netlify | Medium | No | Free | Easy |
| 阿里云 OSS+CDN | Fast | Yes | Pay | Complex |
| 腾讯云 COS+CDN | Fast | Yes | Pay | Complex |

**Recommendation for Launch**: Vercel (free, fast setup, good CDN)
**Future**: Consider 阿里云/腾讯云 if China speed is critical

### 3.2 Domain Strategy

**Option A: Quick Launch (No ICP)**
- Use `.app` or `.dev` domain (Google registry, always HTTPS)
- No ICP备案 needed for non-China-hosted sites
- Example: `tomato-admin.app` or `tomato.farm`

**Option B: China-Optimized (ICP Required)**
- Register `.cn` or `.com.cn` domain
- Complete ICP备案 process (2-4 weeks)
- Host on China CDN

**Recommendation**: Start with Option A, migrate later if needed

### 3.3 Performance for China
**Tasks**:
- [ ] Optimize bundle size (lazy loading, tree shaking)
- [ ] Use China CDN for static assets
- [ ] Consider font hosting (Google Fonts blocked, use local)
- [ ] Test with China network simulation

---

## Phase 4: Feature Enhancements (Priority: Medium)

### 4.1 Mobile Dashboard Optimization
**Tasks**:
- [ ] Create simplified mobile dashboard view
- [ ] Add quick action buttons (new order, check stock)
- [ ] Optimize charts for small screens

### 4.2 Notifications System
**Future Value**: Alert for important events

**Tasks**:
- [ ] Add browser notifications (order status changes)
- [ ] Future: WeChat notification integration

### 4.3 Offline Capabilities
**Tasks**:
- [ ] Cache product/customer data locally
- [ ] Queue offline operations
- [ ] Sync when back online

---

## Phase 5: Security Hardening (Priority: Medium)

### 5.1 Current Status
- RLS policies: Implemented
- Auth: Supabase Auth (secure)
- Input validation: Basic

### 5.2 Enhancements
- [ ] Add rate limiting for login attempts
- [ ] Implement audit logging (who changed what)
- [ ] Add CSRF protection verification
- [ ] Security headers audit

---

## Implementation Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Testing & Monitoring | Week 1-2 | None |
| Phase 2: Mobile Responsive | Week 2-3 | None |
| Phase 3: Deployment | Week 3-4 | Phase 1 & 2 |
| Phase 4: Enhancements | Week 4+ | Phase 3 |
| Phase 5: Security | Ongoing | Phase 3 |

---

## Quick Launch Checklist

For fastest production launch:

- [ ] **Testing**: Add basic E2E tests for login flow
- [ ] **Mobile**: Make sidebar collapsible on mobile
- [ ] **Deploy**: Push to Vercel with custom domain
- [ ] **Monitor**: Add Sentry error tracking
- [ ] **Backup**: Verify Supabase backups enabled

---

## Current Tech Stack Status

| Component | Status | Notes |
|-----------|--------|-------|
| Vue 3 + TypeScript | ✅ Ready | |
| Element Plus | ✅ Ready | Need responsive tweaks |
| Supabase (Singapore) | ✅ Ready | Acceptable China latency |
| 高德地图 | ✅ Ready | Full integration |
| PWA | ❌ Missing | Needed for mobile |
| Tests | ❌ Missing | Critical for production |
| Error Monitoring | ❌ Missing | Critical for production |

---

## Decision Points

1. **Domain**: Do you want a quick launch without ICP, or delay for China hosting?
2. **Error Monitoring**: Sentry (global) or Fundebug (China-native)?
3. **PWA Priority**: Should we ship mobile responsiveness first, then PWA?
