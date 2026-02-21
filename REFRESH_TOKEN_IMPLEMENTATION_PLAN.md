# Refresh Token System Implementation Plan

**Date:** February 21, 2026  
**Priority:** HIGH - Security Enhancement  
**Estimated Time:** 45 minutes  
**Risk Level:** MEDIUM (requires careful implementation)

---

## 📋 Table of Contents
1. [Problem Analysis](#problem-analysis)
2. [Current System Architecture](#current-system-architecture)
3. [Proposed Solution](#proposed-solution)
4. [Impact Analysis](#impact-analysis)
5. [Implementation Steps](#implementation-steps)
6. [Potential Errors & Mitigation](#potential-errors--mitigation)
7. [Testing Checklist](#testing-checklist)
8. [Rollback Plan](#rollback-plan)

---

## 1. Problem Analysis

### 🔴 Current Security Issues

#### Issue #1: No Token Revocation
**Location:** `server/src/controllers/authController.ts` - `login()` function

**Current Code:**
```typescript
// Line 38-45
const token = jwt.sign(
    { user: { id: user_id } }, 
    process.env.JWT_SECRET as string, 
    { expiresIn: 3600 }  // ⚠️ 1 hour = 3600 seconds
);

res.cookie('token', token, {
    httpOnly: true,
    maxAge: 3600000  // 1 hour in milliseconds
});
```

**Problem:**
- Once token is issued, it's valid for 1 FULL HOUR
- If token is stolen (network intercept, server breach), attacker has 1 hour of access
- **NO WAY to revoke the token** - it's stateless JWT
- Even if user clicks "logout", token remains valid until expiry

**Real-World Scenario:**
```
10:00 AM - User logs in, gets token (valid until 11:00 AM)
10:15 AM - Attacker steals token via MITM attack
10:16 AM - User notices suspicious activity, clicks logout
10:17 AM - User is logged out, but...
         ⚠️ ATTACKER STILL HAS VALID TOKEN UNTIL 11:00 AM (44 minutes!)
         ⚠️ No way to stop them!
```

#### Issue #2: Poor User Experience
**Location:** Client-side - All authenticated pages

**Problem:**
- Token expires after 1 hour
- User gets kicked out while working
- Must re-login frequently (annoying!)

**User Journey:**
```
10:00 AM - User logs in
10:30 AM - User working on sales entry (30 min in)
11:00 AM - Token expires
11:01 AM - User clicks "Save Sale"
         ❌ 401 Unauthorized - Redirected to login
         ❌ Loses unsaved work
         ❌ Frustrated user
```

#### Issue #3: No Session Management
**Location:** Database - No session tracking

**Problem:**
- Can't see who's logged in
- Can't force logout specific users
- Can't detect multiple logins from same account
- No audit trail of login sessions

---

## 2. Current System Architecture

### 2.1 Authentication Flow (Current)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USER LOGIN                                                │
├─────────────────────────────────────────────────────────────┤
│ POST /api/auth/login                                         │
│ { email, password }                                          │
│                                                              │
│ Server:                                                      │
│  ├─> Verify password (bcrypt)                               │
│  ├─> Generate JWT (1 hour expiry)                           │
│  ├─> Set httpOnly cookie                                    │
│  └─> Return: { token, user, role }                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 2. AUTHENTICATED REQUESTS                                    │
├─────────────────────────────────────────────────────────────┤
│ GET /api/sales (with cookie)                                 │
│                                                              │
│ Server:                                                      │
│  ├─> authMiddleware: Extract token from cookie              │
│  ├─> jwt.verify(token, JWT_SECRET)                          │
│  ├─> If valid: req.user = decoded.user                      │
│  ├─> If expired: 401 Unauthorized                           │
│  └─> Continue to route handler                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 3. TOKEN EXPIRY (After 1 hour)                              │
├─────────────────────────────────────────────────────────────┤
│ GET /api/sales (with expired cookie)                         │
│                                                              │
│ Server:                                                      │
│  ├─> authMiddleware: jwt.verify() throws error              │
│  └─> Return: 401 Unauthorized                               │
│                                                              │
│ Client:                                                      │
│  ├─> Axios interceptor catches 401                          │
│  └─> Redirect to /login                                     │
│                                                              │
│ ❌ User must re-login (no auto-refresh)                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 4. LOGOUT                                                    │
├─────────────────────────────────────────────────────────────┤
│ POST /api/auth/logout                                        │
│                                                              │
│ Server:                                                      │
│  ├─> Clear cookie: res.clearCookie('token')                 │
│  └─> Return: { msg: 'Logged out' }                          │
│                                                              │
│ ⚠️ PROBLEM: Token still valid until expiry!                 │
│ ⚠️ If attacker has token, they can still use it!            │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Files Involved (Current System)

**Server-Side:**
```
server/src/
├── controllers/authController.ts
│   ├── login()           - Issues JWT token (1 hour)
│   ├── logout()          - Clears cookie only
│   ├── verifyToken()     - Validates JWT
│   └── register()        - Creates user + issues token
│
├── middleware/authMiddleware.ts
│   └── authMiddleware()  - Validates JWT on every request
│
├── db/Authdb.ts
│   ├── loginUser()       - Password verification
│   └── registerUser()    - User creation
│
└── routes/auth.ts
    └── All auth routes
```

**Client-Side:**
```
client/src/
├── utils/api.js
│   └── Axios interceptors (handles 401 → redirect to login)
│
├── components/Login.jsx
│   └── Login form (stores token in cookie)
│
└── components/PrivateRoute.jsx
    └── Checks auth via /api/auth/verify
```

### 2.3 Current Token Structure

**JWT Payload:**
```json
{
  "user": {
    "id": "uuid-here"
  },
  "iat": 1708502400,  // Issued at
  "exp": 1708506000   // Expires at (1 hour later)
}
```

**Cookie Configuration:**
```javascript
{
  httpOnly: true,           // ✅ XSS protection
  secure: true,             // ✅ HTTPS only (production)
  sameSite: 'strict',       // ✅ CSRF protection
  maxAge: 3600000          // 1 hour
}
```

---

## 3. Proposed Solution

### 3.1 New Architecture: Dual Token System

```
┌─────────────────────────────────────────────────────────────┐
│ ACCESS TOKEN (Short-lived)                                   │
├─────────────────────────────────────────────────────────────┤
│ Purpose:    Access protected resources                       │
│ Lifetime:   15 minutes                                       │
│ Storage:    httpOnly cookie                                  │
│ Revocable:  No (stateless JWT)                              │
│ Use:        Every API request                                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ REFRESH TOKEN (Long-lived)                                   │
├─────────────────────────────────────────────────────────────┤
│ Purpose:    Get new access tokens                            │
│ Lifetime:   7 days                                           │
│ Storage:    httpOnly cookie + Database (hashed)             │
│ Revocable:  Yes (delete from database)                      │
│ Use:        Only when access token expires                   │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 New Authentication Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. LOGIN (Enhanced)                                          │
├─────────────────────────────────────────────────────────────┤
│ POST /api/auth/login                                         │
│                                                              │
│ Server:                                                      │
│  ├─> Verify password                                        │
│  ├─> Generate Access Token (15 min)                         │
│  ├─> Generate Refresh Token (7 days)                        │
│  ├─> Hash refresh token (bcrypt)                            │
│  ├─> Store hash in database (refresh_tokens table)          │
│  ├─> Set both tokens in httpOnly cookies                    │
│  └─> Return: { user, role }                                 │
│                                                              │
│ Database:                                                    │
│  INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
│  VALUES (?, ?, NOW() + INTERVAL '7 days')                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 2. AUTHENTICATED REQUEST (Same as before)                    │
├─────────────────────────────────────────────────────────────┤
│ GET /api/sales                                               │
│                                                              │
│ Server:                                                      │
│  ├─> authMiddleware: Verify access token                    │
│  ├─> If valid: Continue                                     │
│  └─> If expired: Return 401                                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 3. AUTO-REFRESH (New!)                                       │
├─────────────────────────────────────────────────────────────┤
│ Client detects 401 (access token expired)                    │
│                                                              │
│ POST /api/auth/refresh (automatic)                           │
│                                                              │
│ Server:                                                      │
│  ├─> Extract refresh token from cookie                      │
│  ├─> Hash it and check database                             │
│  ├─> If valid & not expired:                                │
│  │   ├─> Generate new access token (15 min)                 │
│  │   ├─> Set new cookie                                     │
│  │   └─> Return: { accessToken }                            │
│  └─> If invalid: Return 401 (force re-login)                │
│                                                              │
│ Client:                                                      │
│  ├─> Receives new access token                              │
│  └─> Retry original request automatically                   │
│                                                              │
│ ✅ User never notices - seamless!                           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 4. LOGOUT (Enhanced)                                         │
├─────────────────────────────────────────────────────────────┤
│ POST /api/auth/logout                                        │
│                                                              │
│ Server:                                                      │
│  ├─> Extract refresh token from cookie                      │
│  ├─> DELETE FROM refresh_tokens WHERE token_hash = ?        │
│  ├─> Clear both cookies                                     │
│  └─> Return: { msg: 'Logged out' }                          │
│                                                              │
│ ✅ Refresh token deleted from DB                            │
│ ✅ Can't get new access tokens                              │
│ ✅ Access token expires in max 15 min                       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 5. FORCE LOGOUT (New Feature!)                              │
├─────────────────────────────────────────────────────────────┤
│ Admin wants to logout specific user                          │
│                                                              │
│ DELETE /api/auth/revoke/:user_id                             │
│                                                              │
│ Server:                                                      │
│  ├─> DELETE FROM refresh_tokens WHERE user_id = ?           │
│  └─> Return: { msg: 'User sessions revoked' }               │
│                                                              │
│ ✅ User can't refresh access token                          │
│ ✅ Forced logout within 15 minutes                          │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Database Schema Changes

**New Table:**
```sql
CREATE TABLE refresh_tokens (
    token_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    last_used TIMESTAMP DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);
```

**Why hash the token?**
- If database is breached, attacker can't use the tokens
- Similar to password hashing

---

## 4. Impact Analysis

### 4.1 Files That MUST Be Modified

#### ✅ Server-Side (8 files)

**1. `server/src/controllers/authController.ts`**
- **Functions to modify:**
  - `login()` - Generate both tokens, store refresh token in DB
  - `logout()` - Delete refresh token from DB
  - `register()` - Generate both tokens (if auto-login after register)
- **New functions to add:**
  - `refreshAccessToken()` - Handle token refresh
  - `revokeUserSessions()` - Admin force logout
- **Risk:** HIGH - Core authentication logic
- **Lines affected:** ~100 lines

**2. `server/src/db/Authdb.ts`**
- **Functions to add:**
  - `storeRefreshToken()` - Insert into refresh_tokens table
  - `validateRefreshToken()` - Check if token exists and valid
  - `deleteRefreshToken()` - Remove on logout
  - `deleteAllUserTokens()` - Force logout all sessions
- **Risk:** MEDIUM - New database operations
- **Lines affected:** ~80 lines

**3. `server/src/middleware/authMiddleware.ts`**
- **Changes:** NONE (access token validation stays the same)
- **Risk:** NONE
- **Why:** Access token structure unchanged, only lifetime reduced

**4. `server/src/routes/auth.ts`**
- **New routes to add:**
  - `POST /api/auth/refresh` - Refresh access token
  - `DELETE /api/auth/revoke/:user_id` - Admin revoke (optional)
- **Risk:** LOW - Just route definitions
- **Lines affected:** ~10 lines

**5. Database Migration File (NEW)**
- **File:** `server/migrations/add_refresh_tokens_table.sql`
- **Purpose:** Create refresh_tokens table
- **Risk:** LOW - Standard migration
- **Lines:** ~20 lines

**6. `server/src/index.ts`**
- **Changes:** NONE
- **Risk:** NONE

**7. `.env` files**
- **New variables:**
  - `REFRESH_TOKEN_SECRET` - Separate secret for refresh tokens
- **Risk:** LOW
- **Lines:** 1 line

**8. `server/src/db.ts`**
- **Changes:** NONE (connection pool already configured)
- **Risk:** NONE

#### ✅ Client-Side (3 files)

**1. `client/src/utils/api.js`**
- **Changes:**
  - Modify axios response interceptor
  - Add refresh token logic on 401
  - Retry failed request after refresh
- **Risk:** HIGH - Core API client
- **Lines affected:** ~30 lines

**Current Code:**
```javascript
// Line 35-50
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isVerifyEndpoint = error.config?.url?.includes('/auth/verify');
      if (!isVerifyEndpoint) {
        localStorage.removeItem('userRole');
        window.location.href = '/login';  // ⚠️ Immediate redirect
      }
    }
    return Promise.reject(error);
  }
);
```

**New Code:**
```javascript
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh token
        await api.post('/auth/refresh');
        // Retry original request
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('userRole');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
```

**2. `client/src/components/Login.jsx`**
- **Changes:** NONE (token handling is automatic via cookies)
- **Risk:** NONE

**3. `client/src/components/PrivateRoute.jsx`**
- **Changes:** NONE (still uses /auth/verify)
- **Risk:** NONE

### 4.2 Files That DON'T Need Changes

✅ **All route handlers** - No changes needed
✅ **All controllers (except auth)** - No changes needed
✅ **All middleware (except auth)** - No changes needed
✅ **All validators** - No changes needed
✅ **All client pages** - No changes needed
✅ **All client components (except Login)** - No changes needed

**Why?**
- Access token structure remains the same
- Only lifetime changes (1 hour → 15 minutes)
- Refresh happens automatically in background
- Existing code doesn't know/care about refresh tokens

---

## 5. Implementation Steps

### Phase 1: Database Setup (5 minutes)

**Step 1.1:** Create migration file
**Step 1.2:** Run migration
**Step 1.3:** Verify table created

### Phase 2: Server-Side Implementation (25 minutes)

**Step 2.1:** Add REFRESH_TOKEN_SECRET to .env
**Step 2.2:** Create refresh token database functions (Authdb.ts)
**Step 2.3:** Modify login() to generate both tokens
**Step 2.4:** Modify logout() to delete refresh token
**Step 2.5:** Create refreshAccessToken() endpoint
**Step 2.6:** Add new routes

### Phase 3: Client-Side Implementation (10 minutes)

**Step 3.1:** Modify axios interceptor
**Step 3.2:** Test auto-refresh flow

### Phase 4: Testing (5 minutes)

**Step 4.1:** Test login
**Step 4.2:** Test auto-refresh
**Step 4.3:** Test logout
**Step 4.4:** Test token expiry

---

## 6. Potential Errors & Mitigation

### 🔴 Critical Errors (Must Prevent)

#### Error #1: Infinite Refresh Loop
**Scenario:**
```javascript
// BAD CODE:
api.interceptors.response.use(null, async (error) => {
  if (error.response?.status === 401) {
    await api.post('/auth/refresh');  // ⚠️ This can also return 401!
    return api(originalRequest);       // ⚠️ Infinite loop!
  }
});
```

**Problem:**
- If refresh endpoint returns 401, interceptor catches it
- Tries to refresh again → 401 → refresh again → INFINITE LOOP
- Browser hangs, server overloaded

**Solution:**
```javascript
// GOOD CODE:
api.interceptors.response.use(null, async (error) => {
  const originalRequest = error.config;
  
  // ✅ Prevent retry on refresh endpoint itself
  if (originalRequest.url?.includes('/auth/refresh')) {
    return Promise.reject(error);
  }
  
  // ✅ Only retry once
  if (error.response?.status === 401 && !originalRequest._retry) {
    originalRequest._retry = true;
    try {
      await api.post('/auth/refresh');
      return api(originalRequest);
    } catch (refreshError) {
      window.location.href = '/login';
    }
  }
});
```

#### Error #2: Forgot to Delete Refresh Token on Logout
**Location:** `authController.ts` - `logout()` function

**Problem:**
```typescript
// BAD CODE:
export const logout = async (req: Request, res: Response) => {
    res.clearCookie('token');
    res.clearCookie('refreshToken');
    // ⚠️ Forgot to delete from database!
    res.json({ msg: 'Logged out' });
};
```

**Impact:**
- User clicks logout
- Cookies cleared, but refresh token still in database
- If attacker has the refresh token, they can still get new access tokens!
- User thinks they're logged out, but session is still active

**Solution:**
```typescript
// GOOD CODE:
export const logout = async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.refreshToken;
    
    // ✅ Delete from database first
    if (refreshToken) {
        await Authdb.deleteRefreshToken(refreshToken);
    }
    
    // Then clear cookies
    res.clearCookie('token');
    res.clearCookie('refreshToken');
    res.json({ msg: 'Logged out' });
};
```

#### Error #3: Not Hashing Refresh Token in Database
**Location:** `Authdb.ts` - `storeRefreshToken()` function

**Problem:**
```typescript
// BAD CODE:
await pool.query(
    'INSERT INTO refresh_tokens (user_id, token_hash) VALUES ($1, $2)',
    [user_id, refreshToken]  // ⚠️ Storing plain token!
);
```

**Impact:**
- Database breach → Attacker gets all refresh tokens
- Can impersonate any user for 7 days!

**Solution:**
```typescript
// GOOD CODE:
const tokenHash = await bcrypt.hash(refreshToken, 10);
await pool.query(
    'INSERT INTO refresh_tokens (user_id, token_hash) VALUES ($1, $2)',
    [user_id, tokenHash]  // ✅ Storing hash
);
```

### ⚠️ Medium Errors (Should Prevent)

#### Error #4: Wrong Token Expiry Times
**Location:** `authController.ts` - Token generation

**Problem:**
```typescript
// BAD CODE:
const accessToken = jwt.sign({...}, SECRET, { expiresIn: 900 });      // 15 min
const refreshToken = jwt.sign({...}, SECRET, { expiresIn: 604800 });  // 7 days

// ⚠️ Using same secret for both!
```

**Impact:**
- If JWT_SECRET is compromised, both tokens can be forged
- Should use separate secrets

**Solution:**
```typescript
// GOOD CODE:
const accessToken = jwt.sign({...}, process.env.JWT_SECRET, { expiresIn: '15m' });
const refreshToken = jwt.sign({...}, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
```

#### Error #5: Not Cleaning Up Expired Tokens
**Location:** Database - refresh_tokens table

**Problem:**
- Tokens accumulate in database forever
- Database grows indefinitely
- Performance degrades

**Solution:**
```sql
-- Add cleanup job (run daily)
DELETE FROM refresh_tokens 
WHERE expires_at < NOW();
```

### 🟡 Minor Errors (Nice to Prevent)

#### Error #6: Not Updating last_used Timestamp
**Impact:** Can't track inactive sessions
**Solution:** Update timestamp on each refresh

#### Error #7: No IP/User-Agent Tracking
**Impact:** Can't detect suspicious logins
**Solution:** Store IP and user-agent in refresh_tokens table

---

## 7. Testing Checklist

### ✅ Manual Testing

**Test 1: Login Flow**
- [ ] Login with valid credentials
- [ ] Verify access token cookie set (15 min expiry)
- [ ] Verify refresh token cookie set (7 day expiry)
- [ ] Verify refresh token stored in database (hashed)
- [ ] Verify can access protected routes

**Test 2: Auto-Refresh Flow**
- [ ] Wait 15 minutes (or manually expire access token)
- [ ] Make API request
- [ ] Verify 401 returned
- [ ] Verify refresh endpoint called automatically
- [ ] Verify new access token received
- [ ] Verify original request retried successfully
- [ ] User never sees error

**Test 3: Logout Flow**
- [ ] Click logout
- [ ] Verify refresh token deleted from database
- [ ] Verify both cookies cleared
- [ ] Verify can't access protected routes
- [ ] Verify can't refresh token

**Test 4: Token Expiry**
- [ ] Wait 7 days (or manually expire refresh token)
- [ ] Try to refresh
- [ ] Verify 401 returned
- [ ] Verify redirected to login

**Test 5: Multiple Sessions**
- [ ] Login from browser 1
- [ ] Login from browser 2
- [ ] Verify 2 refresh tokens in database
- [ ] Logout from browser 1
- [ ] Verify browser 2 still works

**Test 6: Force Logout**
- [ ] Admin revokes user sessions
- [ ] Verify all refresh tokens deleted
- [ ] Verify user logged out within 15 minutes

---

## 8. Rollback Plan

### If Something Goes Wrong

**Step 1: Immediate Rollback (Git)**
```bash
git checkout HEAD~1 server/src/controllers/authController.ts
git checkout HEAD~1 server/src/db/Authdb.ts
git checkout HEAD~1 client/src/utils/api.js
npm run build
pm2 restart all
```

**Step 2: Database Rollback**
```sql
-- Drop new table (data loss acceptable - just re-login)
DROP TABLE IF EXISTS refresh_tokens;
```

**Step 3: Environment Rollback**
```bash
# Remove new variable from .env
# REFRESH_TOKEN_SECRET=... (delete this line)
```

**Step 4: Verify**
- Test login
- Test API requests
- Verify old system working

---

## 9. Success Criteria

✅ **Security Improvements:**
- [ ] Can revoke user sessions instantly
- [ ] Reduced attack window (1 hour → 15 minutes)
- [ ] Session tracking in database

✅ **User Experience:**
- [ ] Users stay logged in for 7 days
- [ ] No manual re-login required
- [ ] Seamless auto-refresh (invisible to user)

✅ **No Breaking Changes:**
- [ ] All existing features work
- [ ] No user-facing errors
- [ ] No performance degradation

---

## 10. Timeline

**Total Estimated Time:** 45 minutes

- Database setup: 5 minutes
- Server implementation: 25 minutes
- Client implementation: 10 minutes
- Testing: 5 minutes

**Ready to proceed?** ✅
