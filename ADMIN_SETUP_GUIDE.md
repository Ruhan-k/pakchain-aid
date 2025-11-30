# Admin Setup Guide for PakChain Aid

This guide explains how to set up the admin account in your Azure SQL Database.

## Default Admin Credentials

**Username:** `admin`  
**Password:** `admin123`

⚠️ **IMPORTANT**: Change the default password immediately after first login!

## Step 1: Create Admins Table

1. Go to **Azure Portal** → Your SQL Database
2. Click **Query editor** in the left menu
3. Sign in with your SQL authentication
4. Copy and paste the contents of `backend/sql/create_admins_table.sql`
5. Click **Run**
6. You should see: "Admins table created successfully!"

## Step 2: Create Default Admin User

1. In the same Query Editor
2. Copy and paste the contents of `backend/sql/create_default_admin.sql`
3. Click **Run**
4. You should see: "Default admin user created successfully!"

## Step 3: Generate Your Own Password Hash (Optional)

If you want to use a different password:

### Option A: Using Node.js

1. Open a terminal/command prompt
2. Run Node.js:
```bash
node
```

3. Then run:
```javascript
const crypto = require('crypto');
const hash = crypto.createHash('sha256').update('your-password-here').digest('hex');
console.log(hash);
```

4. Copy the hash output
5. Update the admin in SQL:
```sql
UPDATE admins 
SET password_hash = 'YOUR_HASH_HERE' 
WHERE username = 'admin';
```

### Option B: Using Online Tool

1. Go to: https://emn178.github.io/online-tools/sha256.html
2. Enter your password
3. Copy the SHA-256 hash
4. Update in SQL (same as above)

## Step 4: Update Frontend Admin Auth (Required)

The frontend still uses Supabase for admin login. We need to update it to use Azure API.

**This will be done in a future update.** For now, admin login might not work from the frontend until we migrate the admin auth to use Azure API.

## Step 5: Test Admin Login

1. Go to your frontend: `https://gray-ground-0184ebd1e.3.azurestaticapps.net`
2. Look for "Admin Login" button (usually in navigation)
3. Enter:
   - Username: `admin`
   - Password: `admin123`
4. Click Login

## Troubleshooting

### "Admin not found" error
- Make sure you ran both SQL scripts
- Check that the `admins` table exists in your database
- Verify the username is correct (case-sensitive)

### "Invalid password" error
- The password hash might be incorrect
- Generate a new hash and update it in the database
- Make sure you're using SHA-256 hashing

### Admin login not working from frontend
- The frontend admin auth still uses Supabase
- We need to update `src/lib/adminAuth.ts` to use Azure API
- This is a known issue that will be fixed

## Security Best Practices

1. **Change default password** immediately after setup
2. **Use strong passwords** (minimum 12 characters, mix of letters, numbers, symbols)
3. **Don't share admin credentials** with unauthorized users
4. **Regularly rotate passwords**
5. **Monitor admin login activity** in database logs

## Current Status

- ✅ Backend admin API ready (`/api/admins`)
- ✅ Database schema ready
- ⚠️ Frontend admin auth still uses Supabase (needs update)
- ⚠️ Admin login from frontend may not work until frontend is updated

---

**Next Steps**: Update `src/lib/adminAuth.ts` to use Azure API instead of Supabase.

