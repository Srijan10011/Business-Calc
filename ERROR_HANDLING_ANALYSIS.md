# Error Handling Analysis & Improvement Plan

## Current State

### ✅ What's Already Good
- **Snackbar system exists** (`SnackbarContext.jsx`) with Material-UI Alert
- **API interceptor** handles 403 permission errors automatically
- **Some alerts** exist for critical user actions

### ❌ Issues Found

#### 1. **142+ instances of `console.error` without user feedback**
Files with most issues:
- `Finance.jsx` - 14 instances
- `TeamProfile.jsx` - 12 instances  
- `COGSEditor.jsx` - 10 instances
- `AddSaleModal.jsx` - 10 instances
- `Inventory.jsx` - 10 instances
- `Dashboard.jsx` - 10 instances
- `Sales.jsx` - 10 instances
- And 16 more files...

#### 2. **20+ instances of `alert()` (blocking native alerts)**
Files using alerts:
- `COGSEditor.jsx` - 7 instances
- `Inventory.jsx` - 4 instances
- `CostAllocationEditor.jsx` - 3 instances
- `Team.jsx` - 2 instances
- `Finance.jsx`, `Credits.jsx`, `Login.jsx`, `Register.jsx` - 1 each

#### 3. **No retry logic** for failed API calls

#### 4. **Inconsistent error handling patterns**

---

## Improvement Plan

### Phase 1: Replace console.error with Snackbar (High Priority)

#### Pattern to Replace:
```javascript
// ❌ BEFORE
try {
    const response = await api.get('/endpoint');
    setData(response.data);
} catch (error) {
    console.error('Error fetching data:', error);
}
```

```javascript
// ✅ AFTER
import { useSnackbar } from '../context/SnackbarContext';

const { showSnackbar } = useSnackbar();

try {
    const response = await api.get('/endpoint');
    setData(response.data);
} catch (error) {
    console.error('Error fetching data:', error);
    showSnackbar(
        error.response?.data?.message || 'Failed to fetch data. Please try again.',
        'error'
    );
}
```

#### Files to Update (Priority Order):

**Critical User-Facing Pages:**
1. ✅ `Finance.jsx` - 14 errors (money operations)
2. ✅ `TeamProfile.jsx` - 12 errors (salary operations)
3. ✅ `Sales.jsx` - 10 errors (revenue operations)
4. ✅ `Inventory.jsx` - 10 errors (stock operations)
5. ✅ `Dashboard.jsx` - 10 errors (overview page)

**Important Components:**
6. ✅ `COGSEditor.jsx` - 10 errors
7. ✅ `AddSaleModal.jsx` - 10 errors
8. ✅ `Credits.jsx` - 6 errors
9. ✅ `CustomerProfile.jsx` - 6 errors
10. ✅ `CostAllocationEditor.jsx` - 6 errors

**Other Pages:**
11. ✅ `Assets.jsx` - 8 errors
12. ✅ `Team.jsx` - 8 errors
13. ✅ `Admin.jsx` - 7 errors
14. ✅ `ProductDetail.jsx` - 6 errors
15. ✅ `Products.jsx` - 5 errors
16. ✅ `Customers.jsx` - 2 errors
17. ✅ `Reports.jsx` - 2 errors
18. ✅ `AddAssetModal.jsx` - 2 errors
19. ✅ `AddProductModal.jsx` - 2 errors
20. ✅ `AddCustomerModal.jsx` - 2 errors
21. ✅ `DashboardLayout.jsx` - 2 errors
22. ✅ `Register.jsx` - 1 error
23. ✅ `PermissionContext.jsx` - 1 error

---

### Phase 2: Replace alert() with Snackbar (High Priority)

#### Pattern to Replace:
```javascript
// ❌ BEFORE
alert('Operation successful!');
alert('Error: ' + error.message);
```

```javascript
// ✅ AFTER
showSnackbar('Operation successful!', 'success');
showSnackbar(error.response?.data?.message || 'Operation failed', 'error');
```

#### Files to Update:
1. ✅ `COGSEditor.jsx` - 7 alerts
2. ✅ `Inventory.jsx` - 4 alerts
3. ✅ `CostAllocationEditor.jsx` - 3 alerts
4. ✅ `Team.jsx` - 2 alerts
5. ✅ `Finance.jsx` - 1 alert
6. ✅ `Credits.jsx` - 1 alert
7. ✅ `Login.jsx` - 1 alert
8. ✅ `Register.jsx` - 1 alert

---

### Phase 3: Add Retry Logic (Medium Priority)

#### Create Retry Utility:
```javascript
// utils/retryRequest.js
export const retryRequest = async (requestFn, maxRetries = 3, delay = 1000) => {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on client errors (4xx) except 408, 429
      const status = error.response?.status;
      if (status && status >= 400 && status < 500 && status !== 408 && status !== 429) {
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  }
  
  throw lastError;
};
```

#### Usage:
```javascript
import { retryRequest } from '../utils/retryRequest';

const fetchData = async () => {
  try {
    const response = await retryRequest(() => api.get('/endpoint'));
    setData(response.data);
  } catch (error) {
    showSnackbar('Failed to fetch data after multiple attempts', 'error');
  }
};
```

#### Apply to Critical Operations:
- Financial transactions (Finance.jsx)
- Salary payouts (TeamProfile.jsx, Finance.jsx)
- Sales creation (Sales.jsx, AddSaleModal.jsx)
- Inventory updates (Inventory.jsx)
- Account balance fetches (Dashboard.jsx)

---

### Phase 4: Enhanced API Interceptor (Medium Priority)

#### Update `utils/api.js`:
```javascript
// Add response interceptor for common errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    
    // Handle specific status codes
    if (status === 401) {
      // Unauthorized - redirect to login
      localStorage.removeItem('token');
      window.location.href = '/';
      return Promise.reject(error);
    }
    
    if (status === 403) {
      const method = error.config?.method?.toUpperCase();
      const isWriteOperation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);
      
      if (isWriteOperation && showSnackbarFn) {
        const message = error.response?.data?.msg || 'Permission Denied';
        showSnackbarFn(message, 'error');
      }
    }
    
    if (status === 500) {
      if (showSnackbarFn) {
        showSnackbarFn('Server error. Please try again later.', 'error');
      }
    }
    
    if (!error.response) {
      // Network error
      if (showSnackbarFn) {
        showSnackbarFn('Network error. Please check your connection.', 'error');
      }
    }
    
    return Promise.reject(error);
  }
);
```

---

### Phase 5: Add Success Messages (Low Priority)

Add success feedback for important operations:

```javascript
// After successful operations
showSnackbar('Sale created successfully!', 'success');
showSnackbar('Salary paid successfully!', 'success');
showSnackbar('Product added successfully!', 'success');
showSnackbar('Transfer completed successfully!', 'success');
```

#### Operations needing success messages:
- Sales creation
- Salary payouts
- Inventory updates
- Account transfers
- Product creation/updates
- Customer creation/updates
- Team member operations

---

## Implementation Checklist

### Immediate (This Week)
- [ ] Update top 5 critical pages (Finance, TeamProfile, Sales, Inventory, Dashboard)
- [ ] Replace all `alert()` calls with snackbar
- [ ] Add success messages for financial operations

### Short Term (Next Week)
- [ ] Update remaining 18 files with console.error
- [ ] Create retry utility
- [ ] Apply retry logic to critical operations
- [ ] Enhance API interceptor

### Medium Term (Next 2 Weeks)
- [ ] Add loading states to all async operations
- [ ] Add confirmation dialogs for destructive actions
- [ ] Implement offline detection
- [ ] Add error boundary components

---

## Testing Checklist

After implementing changes, test:
- [ ] Network failures (disconnect internet)
- [ ] Server errors (stop backend)
- [ ] Permission errors (use restricted account)
- [ ] Invalid inputs
- [ ] Concurrent operations
- [ ] Slow network (throttle in DevTools)

---

## Metrics to Track

- **User-visible errors**: Should increase (good - users now see what's wrong)
- **Console errors**: Should remain (for debugging)
- **User complaints**: Should decrease (better feedback)
- **Support tickets**: Should decrease (clearer error messages)

---

## Example: Complete Error Handling Pattern

```javascript
import { useState } from 'react';
import { useSnackbar } from '../context/SnackbarContext';
import { retryRequest } from '../utils/retryRequest';
import api from '../utils/api';

const MyComponent = () => {
  const [loading, setLoading] = useState(false);
  const { showSnackbar } = useSnackbar();
  
  const handleOperation = async () => {
    setLoading(true);
    try {
      const response = await retryRequest(() => 
        api.post('/endpoint', data)
      );
      
      // Success
      showSnackbar('Operation completed successfully!', 'success');
      // Update UI
      
    } catch (error) {
      console.error('Operation failed:', error);
      
      // User-friendly error message
      const message = error.response?.data?.message 
        || error.response?.data?.msg
        || 'Operation failed. Please try again.';
      
      showSnackbar(message, 'error');
      
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Button 
      onClick={handleOperation} 
      disabled={loading}
    >
      {loading ? 'Processing...' : 'Submit'}
    </Button>
  );
};
```
