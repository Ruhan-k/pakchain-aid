# Fix Continuous Refresh Issue

## Problem
Campaigns are visible but keep refreshing continuously, causing 500 errors in console.

## Root Causes

1. **Aggressive Polling** - Polling every 5 seconds is too frequent
2. **No Error Handling** - Polling continues even when errors occur
3. **500 Errors** - Backend might still have issues with order parameter

## Fixes Applied

### 1. Reduced Polling Frequency
- Changed from 5 seconds to **30 seconds**
- Only polls when page is visible (using Page Visibility API)
- Stops polling after 3 consecutive errors

### 2. Better Error Handling
- `fetchCampaigns()` now throws errors properly
- Polling stops after 3 errors to avoid spamming server
- Errors are logged but don't cause infinite retries

### 3. Backend Error Logging
- Added detailed error logging in backend
- Logs show actual SQL query and error details

## What Changed

**Before:**
```javascript
// Poll every 5 seconds, no error handling
setInterval(() => fetchCampaigns(), 5000);
```

**After:**
```javascript
// Poll every 30 seconds, only when visible, stops on errors
let errorCount = 0;
setInterval(() => {
  if (visible && errorCount < 3) {
    fetchCampaigns().catch(() => errorCount++);
  }
}, 30000);
```

## Next Steps

1. **Deploy the fixes:**
   ```bash
   git add .
   git commit -m "Fix continuous refresh - reduce polling and add error handling"
   git push origin main
   ```

2. **Check backend logs** for the 500 error:
   - Azure Portal → App Service → Log stream
   - Look for "Get campaigns error:" messages
   - Share the error message if it persists

3. **After deployment:**
   - Campaigns should load once
   - Auto-refresh every 30 seconds (only when page visible)
   - Stops refreshing if errors occur

## If 500 Error Persists

The backend logs will show the exact error. Common causes:
1. SQL syntax error in ORDER BY clause
2. Column name doesn't exist in database
3. Database connection issue

Check Azure Log stream and share the error message.

---

**Status:** ✅ Polling reduced and error handling added. Backend error needs investigation via logs.

