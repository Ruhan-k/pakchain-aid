# Fix Admin Login Issue

## Problem
Admin login fails with "Invalid password!" error even when using correct credentials (`admin` / `admin123`).

## Diagnosis Steps

### Step 1: Verify Admin Setup in Database

1. Go to **Azure Portal** → Your SQL Database
2. Click **Query editor**
3. Copy and paste the contents of `backend/sql/verify_admin_setup.sql`
4. Click **Run**
5. Review the output - it will tell you what's wrong

### Step 2: Common Issues and Fixes

#### Issue 1: Admins Table Doesn't Exist
**Error:** "Admins table does NOT exist"

**Fix:**
1. Run `backend/sql/create_admins_table.sql` in Query Editor
2. Then run `backend/sql/create_default_admin.sql`

#### Issue 2: Admin User Doesn't Exist
**Error:** "Admin user does NOT exist"

**Fix:**
1. Run `backend/sql/create_default_admin.sql` in Query Editor
2. Verify it says "Default admin user created successfully!"

#### Issue 3: Password Hash Mismatch
**Error:** "Password hash does NOT match expected value"

**Fix Option A (Recommended):**
```sql
UPDATE admins 
SET password_hash = '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918' 
WHERE username = 'admin';
```

**Fix Option B:**
1. Delete existing admin:
```sql
DELETE FROM admins WHERE username = 'admin';
```
2. Run `backend/sql/create_default_admin.sql` again

#### Issue 4: Admin Account is Inactive
**Error:** "Admin account is INACTIVE"

**Fix:**
```sql
UPDATE admins SET is_active = 1 WHERE username = 'admin';
```

### Step 3: Verify Password Hash

The expected SHA-256 hash for "admin123" is:
```
8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918
```

Check your database:
```sql
SELECT username, password_hash, is_active 
FROM admins 
WHERE username = 'admin';
```

The `password_hash` should match the hash above (case-insensitive).

### Step 4: Test Login Again

1. Clear browser cache and localStorage:
   - Open browser console (F12)
   - Run: `localStorage.clear()`
   - Refresh page
2. Try logging in again:
   - Username: `admin`
   - Password: `admin123`

## Quick Fix Script

If you want to reset everything, run this in Query Editor:

```sql
-- Delete existing admin (if any)
DELETE FROM admins WHERE username = 'admin';
GO

-- Create fresh admin user
DECLARE @username NVARCHAR(50) = 'admin';
DECLARE @password_hash NVARCHAR(255) = '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918';
DECLARE @email NVARCHAR(255) = 'admin@pakchainaid.com';
DECLARE @full_name NVARCHAR(255) = 'Administrator';

INSERT INTO admins (username, email, full_name, password_hash, is_active)
VALUES (@username, @email, @full_name, @password_hash, 1);

PRINT 'Admin user reset successfully!';
PRINT 'Username: admin';
PRINT 'Password: admin123';
GO
```

## Verify Hash Generation

If you want to verify the hash is correct, you can generate it:

**Using Node.js:**
```javascript
const crypto = require('crypto');
const hash = crypto.createHash('sha256').update('admin123').digest('hex');
console.log(hash);
// Should output: 8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918
```

**Using Online Tool:**
- Go to: https://emn178.github.io/online-tools/sha256.html
- Enter: `admin123`
- Should get: `8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918`

## Still Not Working?

1. **Check browser console** (F12) for detailed error messages
2. **Check Azure App Service logs** for backend errors
3. **Verify API endpoint** is accessible:
   - `https://pakchain-aid-api-b9g0dycsaafegfft.centralus-01.azurewebsites.net/api/admins?username=admin`
   - Should return JSON with admin data

## Expected Console Output (Success)

When login works, you should see:
- Admin data fetched successfully
- Password hash matches
- Login successful

## Expected Console Output (Failure)

When login fails, you'll see:
- ❌ Invalid password!
- 🔍 DEBUG INFO showing:
  - Generated hash
  - Database hash
  - Hash match status
- 🔧 TO FIX instructions

---

**Next Steps:**
1. Run `backend/sql/verify_admin_setup.sql` to diagnose
2. Fix any issues found
3. Try login again
4. Check browser console for detailed debug info

