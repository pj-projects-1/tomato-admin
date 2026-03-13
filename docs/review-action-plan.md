# Tomato Admin - Comprehensive Review & Action Plan

**Review Date:** 2026-03-12
**Project:** 四月红番天 (Tomato Admin) - 有机番茄销售管理系统

---

## Executive Summary

The tomato-admin project is a well-structured Vue 3 application with solid foundations. However, several areas need attention across security, code quality, performance, testing, and accessibility. This document outlines specific issues and actionable improvements.

---

## 1. Security Issues (HIGH PRIORITY)

### 1.1 Database Security Issues (Supabase Advisors)

| Issue | Severity | Description | Action |
|-------|----------|-------------|--------|
| SECURITY DEFINER View | ERROR | `public.current_stock` view uses SECURITY DEFINER | Review and restrict permissions |
| RLS Disabled | ERROR | `spatial_ref_sys` table has no RLS | Enable RLS or move to non-public schema |
| Extension in Public | WARN | PostGIS installed in public schema | Move to extensions schema |
| Leaked Password Protection | WARN | Disabled in Supabase Auth | Enable in Dashboard → Auth → Settings |

**Immediate Action:**
```sql
-- Fix spatial_ref_sys RLS
ALTER TABLE spatial_ref_sys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spatial_ref_sys_public_read" ON spatial_ref_sys FOR SELECT USING (true);
```

### 1.2 Code Security

**Issue:** Some store methods bypass the `withRetry` wrapper, missing auth validation.

**Files affected:**
- `src/stores/customers.ts` - CRUD operations not using withRetry
- `src/stores/orders.ts` - Same issue
- `src/stores/stocks.ts` - Same issue
- `src/stores/deliveries.ts` - Same issue

**Recommendation:** Consider wrapping all database operations with consistent error handling.

---

## 2. Code Quality Issues (MEDIUM PRIORITY)

### 2.1 Unused Code

| File | Action |
|------|--------|
| `src/components/HelloWorld.vue` | DELETE - Unused Vue starter template component |

### 2.2 Console Statements in Production

**Files with console.log:**
```
src/stores/customers.ts:29 - Fetch customers error
src/stores/customers.ts:49 - Fetch customer error
src/stores/auth.ts:37 - Failed to load profile
src/stores/auth.ts:57 - Failed to load profile after sign in
src/stores/auth.ts:72 - Auth initialization error
src/api/supabase.ts:63 - Session error
src/api/supabase.ts:87 - Token refresh failed
src/api/supabase.ts:104 - Session check failed
```

**Recommendation:** Replace with proper error monitoring (already have Sentry/Fundebug).

### 2.3 TODO Comments

**Found:** `src/stores/auth.ts` - Review and address any remaining TODOs.

### 2.4 Duplicate CRUD Pattern

All stores follow the same pattern:
```typescript
async function fetchX() {
  loading.value = true
  try {
    // query
  } catch (error) {
    console.error(...)
  } finally {
    loading.value = false
  }
}
```

**Recommendation:** Create a `useCrudStore` composable:
```typescript
// src/composables/useCrudStore.ts
export function useCrudStore<T>(tableName: string) {
  const items = ref<T[]>([])
  const loading = ref(false)

  async function fetchAll(options?: { search?: string }) { ... }
  async function fetchOne(id: string) { ... }
  async function create(data: Partial<T>) { ... }
  async function update(id: string, data: Partial<T>) { ... }
  async function remove(id: string) { ... }

  return { items, loading, fetchAll, fetchOne, create, update, remove }
}
```

---

## 3. Performance Improvements (MEDIUM PRIORITY)

### 3.1 Route Lazy Loading

**Current:** All routes are eagerly loaded.

**Recommendation:** Implement lazy loading:
```typescript
// src/router/index.ts
const routes = [
  {
    path: '/orders',
    component: () => import('@/views/Orders.vue'),  // Lazy loaded
  },
  // ... other routes
]
```

### 3.2 Large Component Files

| Component | Lines | Recommendation |
|-----------|-------|----------------|
| Orders.vue | ~500+ | Extract order form dialog to separate component |
| Customers.vue | ~400+ | Extract address management to separate component |
| Deliveries.vue | ~500+ | Extract map integration to separate component |

### 3.3 Bundle Size Optimization

**Current chunks:** vue-vendor, element-plus, supabase

**Additional optimizations:**
- Lazy load ECharts (only load when Dashboard is accessed)
- Consider tree-shaking Element Plus icons
- Review dayjs locale imports

---

## 4. Testing Improvements (MEDIUM PRIORITY)

### 4.1 Current Test Coverage

| Type | Files | Status |
|------|-------|--------|
| Unit Tests (Stores) | 5 files | ✅ Present |
| E2E Tests | 8 files | ✅ Present |
| Component Unit Tests | 0 | ❌ Missing |
| Integration Tests | 0 | ❌ Missing |

### 4.2 Missing Tests

**Component tests needed for:**
- `AddressInput.vue`
- `AddressSelector.vue`
- `PhoneField.vue`
- `PullRefreshIndicator.vue`

**Integration tests needed for:**
- Login flow (username/email)
- Order creation with deliveries
- Customer CRUD with addresses

### 4.3 Recommended Test Structure
```
src/
  __tests__/
    components/
      AddressInput.test.ts
      PhoneField.test.ts
    integration/
      auth.flow.test.ts
      order.flow.test.ts
```

---

## 5. Accessibility Issues (MEDIUM PRIORITY)

### 5.1 Found Issues

| Issue | Location | Solution |
|-------|----------|----------|
| Missing ARIA labels | Form inputs | Add aria-label attributes |
| No focus trap | Dialogs | Use Element Plus focus-trap or add custom |
| Missing keyboard nav | Tables | Add keyboard shortcuts for common actions |
| No skip links | Main pages | Add "Skip to content" link |

### 5.2 Screen Reader Support

**Missing:**
- Role attributes on interactive elements
- Live region announcements for async updates
- Descriptive link text (Chinese links need context)

---

## 6. Architecture Improvements (LOW PRIORITY)

### 6.1 State Management

**Current:** Separate Pinia stores per domain.

**Improvement opportunities:**
1. Create base store factory for CRUD operations
2. Add store plugins for persistence
3. Implement optimistic updates

### 6.2 API Layer

**Current:** Direct Supabase client usage in stores.

**Improvement:** Create service layer:
```typescript
// src/services/customer.service.ts
export class CustomerService {
  async getAll(search?: string): Promise<Customer[]>
  async getById(id: string): Promise<Customer | null>
  async create(data: Partial<Customer>): Promise<Customer>
  async update(id: string, data: Partial<Customer>): Promise<Customer>
  async delete(id: string): Promise<void>
}
```

### 6.3 Form Handling

**Missing:** Reusable form validation composable.

**Recommendation:**
```typescript
// src/composables/useFormValidation.ts
export function useFormValidation<T>(rules: ValidationRules<T>) {
  const errors = ref<Record<string, string>>({})
  const validate = async (data: T): Promise<boolean> => { ... }
  const clearErrors = () => { ... }
  return { errors, validate, clearErrors }
}
```

---

## 7. Documentation (LOW PRIORITY)

### 7.1 Missing Documentation

| Type | Priority | Content Needed |
|------|----------|----------------|
| Component docs | Medium | Props, events, slots for each component |
| Store docs | Low | State shape, actions, getters |
| API docs | Low | Service methods, parameters, return types |
| Architecture decisions | Low | ADRs for major decisions |

### 7.2 Code Comments

**Current:** Mostly Chinese comments.

**Recommendation:** Add bilingual comments for broader accessibility.

---

## 8. UX/UI Improvements (LOW PRIORITY)

### 8.1 Mobile Experience

**Issues:**
- Some dialogs overflow on small screens
- Touch targets could be larger in some areas
- Pull-to-refresh indicator could be more visible

### 8.2 Loading States

**Missing:**
- Skeleton screens for initial loads
- Optimistic updates for better perceived performance
- Progress indicators for long operations

### 8.3 Error Handling UX

**Missing:**
- Retry buttons on failed operations
- Offline indicator
- Form field error highlighting

---

## Action Plan Summary

### Phase 1: Security (Immediate - 1 day)
1. [ ] Enable leaked password protection in Supabase
2. [ ] Fix RLS on spatial_ref_sys table
3. [ ] Review SECURITY DEFINER view permissions
4. [ ] Commit and deploy security fixes

### Phase 2: Code Cleanup (Short - 2 days)
1. [ ] Delete HelloWorld.vue
2. [ ] Replace console.log with error monitoring
3. [ ] Address TODO comments
4. [ ] Add missing return type annotations

### Phase 3: Performance (Short - 3 days)
1. [ ] Implement route lazy loading
2. [ ] Extract large components
3. [ ] Add skeleton loading states
4. [ ] Optimize bundle size

### Phase 4: Testing (Medium - 1 week)
1. [ ] Add component unit tests
2. [ ] Add integration tests for critical flows
3. [ ] Increase coverage to 80%+

### Phase 5: Architecture (Long - 2 weeks)
1. [ ] Create base CRUD store factory
2. [ ] Implement service layer
3. [ ] Add form validation composable
4. [ ] Implement optimistic updates

### Phase 6: Accessibility & UX (Long - 1 week)
1. [ ] Add ARIA labels
2. [ ] Implement focus management
3. [ ] Add keyboard navigation
4. [ ] Improve mobile experience

### Phase 7: Documentation (Ongoing)
1. [ ] Document all components
2. [ ] Add inline code comments
3. [ ] Create architecture decision records

---

## Metrics to Track

- Bundle size reduction target: 15%
- Test coverage target: 80%
- Lighthouse accessibility score target: 90+
- Security score: All Supabase advisor issues resolved

---

## Conclusion

The tomato-admin project has solid foundations but would benefit from:
1. **Immediate security fixes** - Critical issues from Supabase advisors
2. **Code cleanup** - Remove unused code, improve error handling
3. **Performance optimization** - Lazy loading, component splitting
4. **Expanded testing** - Component and integration tests
5. **Better accessibility** - ARIA labels, focus management

Following this plan will result in a more secure, maintainable, and performant application.
