# Fix "Failed to fetch" Network Error

## Problem
When creating campaigns in the admin dashboard, you get:
```
Supabase error: { code: "NETWORK_ERROR", message: "Failed to fetch" }
```

## Root Causes

1. **CORS Configuration** - Backend might be blocking the request
2. **API Endpoint Not Reachable** - Backend might be down or URL incorrect
3. **Network Connectivity** - Browser can't reach the backend

## Fixes Applied

### 1. Enhanced Error Logging
- Added detailed logging in `src/lib/api.ts` to show:
  - Full API URL being called
  - Request method and endpoint
  - Error type and details
  - CORS vs network errors

### 2. Improved CORS Configuration
- Updated `backend/src/server.ts` to:
  - Log all CORS checks
  - Show which origins are allowed/blocked
  - Better wildcard matching for Azure Static Web Apps

### 3. Better Error Messages
- Network errors now show the actual API URL
- CORS errors are clearly identified
- Helpful troubleshooting messages

## How to Debug

### Step 1: Check Browser Console
Open browser console (F12) and look for:
- `🔗 API Base URL:` - Should show the Azure backend URL
- `🌐 API Request:` - Shows the actual request being made
- `❌ API Error Response:` - Shows detailed error information

### Step 2: Check Backend Logs
Go to Azure Portal → App Service → Log stream
Look for:
- `🌐 CORS check for origin:` - Shows which origin is making the request
- `✅ Origin matched:` - Shows if CORS allowed the request
- `❌ CORS blocked origin:` - Shows if CORS blocked the request

### Step 3: Test API Directly
Try accessing the API directly in your browser:
```
https://pakchain-aid-api-b9g0dycsaafegfft.centralus-01.azurewebsites.net/health
```

Should return: `{"status":"ok","timestamp":"..."}`

### Step 4: Check CORS Settings
If the origin is being blocked, add it to `allowedOrigins` in `backend/src/server.ts`:
```typescript
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://gray-ground-0184ebd1e.3.azurestaticapps.net',
  'https://YOUR-ACTUAL-FRONTEND-URL.azurestaticapps.net', // Add your actual URL
  'https://*.azurestaticapps.net', // Wildcard for all Azure Static Web Apps
];
```

## Common Issues

### Issue 1: Backend Not Running
**Symptom:** "Failed to fetch" with no response
**Fix:** 
1. Check Azure App Service is running
2. Go to Azure Portal → App Service → Overview
3. Check status is "Running"

### Issue 2: CORS Blocking Request
**Symptom:** Console shows "CORS blocked origin"
**Fix:**
1. Check the exact frontend URL in browser address bar
2. Add it to `allowedOrigins` in backend
3. Redeploy backend

### Issue 3: Wrong API URL
**Symptom:** Console shows wrong API URL
**Fix:**
1. Check `src/lib/api.ts` - `getApiBaseUrl()` function
2. Verify the Azure backend URL is correct
3. Check if `VITE_API_URL` environment variable is set incorrectly

### Issue 4: Network/Firewall Blocking
**Symptom:** Request times out
**Fix:**
1. Check if you're behind a firewall
2. Try accessing the API URL directly in browser
3. Check Azure App Service networking settings

## Quick Test

Run this in browser console (F12) on your frontend:
```javascript
fetch('https://pakchain-aid-api-b9g0dycsaafegfft.centralus-01.azurewebsites.net/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

If this works, the API is reachable. If it fails, there's a network/CORS issue.

## Next Steps

1. **Deploy the fixes:**
   ```bash
   git add .
   git commit -m "Add better error logging and CORS debugging"
   git push origin main
   ```

2. **Check the logs:**
   - Browser console for frontend errors
   - Azure Log stream for backend errors

3. **Share the error details:**
   - Copy the console output
   - Copy the backend log output
   - This will help identify the exact issue

---

**Status:** ✅ Enhanced logging added. Check browser console and backend logs for detailed error information.

