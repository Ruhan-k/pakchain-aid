# Generate Password Hash for Admin

## Quick Method: Generate Hash Online

1. Go to: https://emn178.github.io/online-tools/sha256.html
2. Enter your password: `@Rksj786125678`
3. Copy the generated hash
4. Use it in the SQL script

## Method 2: Using Node.js

Open Command Prompt or Terminal and run:

```bash
node -e "const crypto = require('crypto'); console.log(crypto.createHash('sha256').update('@Rksj786125678').digest('hex'));"
```

This will output the SHA-256 hash.

## Method 3: Using PowerShell (Windows)

```powershell
$password = '@Rksj786125678'
$bytes = [System.Text.Encoding]::UTF8.GetBytes($password)
$hash = [System.Security.Cryptography.SHA256]::Create().ComputeHash($bytes)
$hashString = ($hash | ForEach-Object { $_.ToString('x2') }) -join ''
Write-Host $hashString
```

## After Getting the Hash

1. Copy the generated hash
2. Open `backend/sql/create_custom_admin.sql`
3. Replace the `@password_hash` value with your generated hash
4. Run the SQL script in Azure Query Editor

