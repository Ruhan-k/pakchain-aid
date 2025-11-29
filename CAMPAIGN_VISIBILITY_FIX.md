# Fix Campaign Visibility Issue

## Problem
Campaigns are being created successfully (status 201), but they're not appearing on the campaigns page.

## Root Cause
The API returns data in nested format `{ data: [...] }`, but the frontend components weren't extracting the inner array correctly.

## Fixes Applied

### 1. Fixed API Client Data Extraction
- Updated `src/lib/api.ts` to handle nested data structure in:
  - `select().then()` - For fetching lists
  - `select().maybeSingle()` - For fetching single items
  - `select().single()` - For fetching single items
  - `insert().select()` - For creating items

### 2. Fixed CampaignsList Component
- Removed Supabase real-time subscriptions (don't work with Azure API)
- Added polling every 5 seconds to refresh campaigns
- Added handling for nested data structure

### 3. Fixed AdminDashboard Component
- Added handling for nested data structure when fetching campaigns

## What Changed

### Before:
```javascript
// API returns: { data: [...] }
// Code expected: [...]
// Result: campaigns not showing
```

### After:
```javascript
// API returns: { data: [...] }
// Code extracts: result.data.data (the inner array)
// Result: campaigns showing correctly
```

## Next Steps

1. **Deploy the fixes:**
   ```bash
   git add .
   git commit -m "Fix campaign visibility - handle nested API response structure"
   git push origin main
   ```

2. **After deployment:**
   - Refresh the campaigns page
   - New campaigns should appear immediately
   - Campaigns will auto-refresh every 5 seconds

3. **Test:**
   - Create a new campaign in admin dashboard
   - Check campaigns page - should appear within 5 seconds
   - Or manually refresh the page

## Files Changed

1. `src/lib/api.ts` - Fixed data extraction for all query methods
2. `src/components/CampaignsList.tsx` - Fixed data handling and removed real-time subscriptions
3. `src/components/AdminDashboard.tsx` - Fixed data handling for campaigns list

---

**Status:** ✅ All fixes applied. Campaigns should now be visible after deployment.

