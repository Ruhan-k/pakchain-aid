# Debug Campaign Creation Issue

## Enhanced Logging Added

I've added detailed logging to help identify the issue. When you try to create a campaign, you'll now see:

### In Browser Console (F12):

1. **Before API Call:**
   - `📤 Creating campaign with data:` - Shows all the data being sent
   - `🔗 API Base URL:` - Shows the API URL being used

2. **After API Call:**
   - `📥 Campaign creation response:` - Shows the response from the API
   - `✅ Campaign created successfully:` - If successful
   - `❌ Supabase error:` - If there's an error
   - `❌ Exception creating campaign:` - If there's an exception

## Steps to Debug

### Step 1: Open Browser Console
1. Press **F12** to open Developer Tools
2. Go to **Console** tab
3. Clear the console (click the 🚫 icon)

### Step 2: Try Creating a Campaign
1. Fill in the campaign form
2. Click "Create Campaign"
3. **Watch the console** for the log messages above

### Step 3: Check What You See

#### If you see `📤 Creating campaign with data:`
- ✅ The form validation passed
- ✅ The data is being prepared
- Check if `platform_fee_address` and `platform_fee_amount` are in the data

#### If you see `📥 Campaign creation response:`
- ✅ The API call was made
- Check if `error` is null or has a value
- Check if `data` is an array or null

#### If you see `❌ Supabase error:`
- The API returned an error
- Check the `error.code` and `error.message`
- Common codes:
  - `NETWORK_ERROR` - Can't reach the backend
  - `400` - Bad request (validation error)
  - `500` - Server error (database issue)

#### If you see `❌ Exception creating campaign:`
- An exception occurred (not an API error)
- Check the error message and stack trace

## Common Issues & Fixes

### Issue 1: `NETWORK_ERROR` or `Failed to fetch`
**Cause:** Can't reach the backend API

**Check:**
1. Is the backend running? Test: `https://pakchain-aid-api-b9g0dycsaafegfft.centralus-01.azurewebsites.net/health`
2. Check browser console for CORS errors
3. Check Azure App Service is running

**Fix:**
- Verify backend is deployed and running
- Check CORS configuration in backend

### Issue 2: `400 Bad Request`
**Cause:** Invalid data being sent

**Check:**
1. Look at `📤 Creating campaign with data:` in console
2. Verify all required fields are present
3. Check if `platform_fee_address` or `platform_fee_amount` have invalid values

**Fix:**
- Make sure all required fields are filled
- Verify Ethereum addresses are valid
- Check platform fee amount is a valid number

### Issue 3: `500 Internal Server Error`
**Cause:** Database error (likely missing columns)

**Check:**
1. Look at backend logs in Azure Portal
2. Check if error mentions missing columns
3. Verify you ran the platform fee migration script

**Fix:**
- Run `backend/sql/add_platform_fee_to_campaigns.sql` in Azure SQL
- Verify columns exist: `SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'campaigns'`

### Issue 4: No error but campaign not appearing
**Cause:** Response format issue

**Check:**
1. Look at `📥 Campaign creation response:` in console
2. Check if `data` is an array with the campaign
3. Check if `data` is null or empty

**Fix:**
- The backend should return `{ data: [campaign] }`
- Check backend route returns array format

## What to Share

If the issue persists, share:

1. **Console Output:**
   - Copy all console messages starting from `📤 Creating campaign`
   - Include any `❌` error messages

2. **Network Tab:**
   - Open **Network** tab in Developer Tools
   - Find the request to `/api/campaigns`
   - Check:
     - Request payload (what was sent)
     - Response (what was returned)
     - Status code

3. **Backend Logs:**
   - Azure Portal → App Service → Log stream
   - Copy any errors related to campaign creation

## Quick Test

Try creating a campaign with:
- **Title:** Test Campaign
- **Goal Amount:** 1
- **Receiving Wallet:** Any valid Ethereum address (e.g., `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb`)
- **Platform Fee Address:** (leave empty)
- **Platform Fee Amount:** (leave empty)

This minimal campaign should work. If it doesn't, the issue is with basic campaign creation, not platform fee.

---

**Next:** Try creating a campaign and share the console output!

