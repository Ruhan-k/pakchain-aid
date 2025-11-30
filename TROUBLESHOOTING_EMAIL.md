# Email Troubleshooting Guide

If you're not receiving OTP verification emails, follow these steps:

## Step 1: Check Azure Logs

1. Go to Azure Portal → `pakchain-aid-api`
2. Click **Log stream** in the left menu
3. Try sending an OTP again
4. Look for these error messages:

### Common Errors:

**"Email service not configured"**
- Solution: Environment variables are missing
- Fix: Add all 5 email environment variables in Azure Configuration

**"Authentication failed"**
- Solution: Wrong email or password
- Fix: Double-check EMAIL_USER and EMAIL_PASS values

**"Connection timeout" or "ECONNREFUSED"**
- Solution: Gmail is blocking the connection
- Fix: Try SendGrid instead (see below)

**"Invalid login" or "535 Authentication failed"**
- Solution: App Password is incorrect or expired
- Fix: Generate a new App Password in Gmail

## Step 2: Verify Environment Variables

In Azure Portal → Configuration → Application settings, verify:

✅ **EMAIL_HOST** = `smtp.gmail.com` (exactly, no spaces)
✅ **EMAIL_PORT** = `587` (number, no quotes)
✅ **EMAIL_USER** = `your-email@gmail.com` (your full Gmail address)
✅ **EMAIL_PASS** = `xxxxxxxxxxxxxxxx` (16-character App Password, no spaces)
✅ **EMAIL_FROM** = `your-email@gmail.com` (same as EMAIL_USER)

**Important**: 
- No quotes around values
- No spaces before/after values
- App Password must be exactly 16 characters

## Step 3: Restart the App Service

After setting environment variables:

1. Azure Portal → `pakchain-aid-api`
2. Click **Restart** button at the top
3. Wait 1-2 minutes for restart
4. Try sending OTP again

## Step 4: Check Gmail Settings

1. Make sure 2-Step Verification is enabled
2. Verify App Password was generated correctly
3. Check if Gmail is blocking "less secure apps" (shouldn't be needed with App Passwords)

## Step 5: Test Email Connection

### Option A: Check Logs for OTP Code

Even if email fails, the OTP is generated. Check Azure logs for:
```
OTP sent to your-email@gmail.com - Code: 123456
```

You can manually use this code to test!

### Option B: Use SendGrid Instead

If Gmail continues to fail, switch to SendGrid:

1. Sign up at https://sendgrid.com (free)
2. Create API Key
3. Update Azure environment variables:

```
EMAIL_HOST = smtp.sendgrid.net
EMAIL_PORT = 587
EMAIL_USER = apikey
EMAIL_PASS = [your-sendgrid-api-key]
EMAIL_FROM = [your-verified-email]
```

## Step 6: Verify Package Installation

The `nodemailer` package must be installed. Check:

1. Azure Portal → `pakchain-aid-api` → **Deployment Center**
2. Make sure deployment completed successfully
3. Check **Log stream** for any npm install errors

If package is missing, trigger a new deployment:
1. Go to **Deployment Center**
2. Click **Sync** or push a new commit to GitHub

## Step 7: Test the API Directly

You can test the email endpoint directly:

```bash
curl -X POST https://pakchain-aid-api-b9g0dycsaafegfft.centralus-01.azurewebsites.net/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@gmail.com"}'
```

Check the response and Azure logs for errors.

## Common Issues & Solutions

### Issue: "Email service not configured"
**Solution**: All 5 environment variables must be set. Double-check they're all there.

### Issue: "535 Authentication failed"
**Solution**: 
- Regenerate App Password in Gmail
- Make sure you're using App Password (16 chars), not regular password
- Copy-paste the password (don't type it manually)

### Issue: No errors but no email received
**Solution**:
- Check spam folder
- Wait 1-2 minutes (sometimes delayed)
- Check Azure logs for the OTP code (you can use it manually)
- Verify EMAIL_FROM matches your Gmail address

### Issue: "Connection timeout"
**Solution**: 
- Gmail might be blocking Azure IP
- Switch to SendGrid (more reliable)
- Or check Azure firewall settings

## Still Not Working?

1. **Check all logs**: Azure Log stream, browser console, network tab
2. **Verify deployment**: Make sure latest code is deployed
3. **Try SendGrid**: It's more reliable than Gmail SMTP
4. **Check email address**: Make sure you're checking the correct inbox

## Quick Test

1. Open Azure Log stream
2. Try sending OTP
3. Look for: `OTP sent to [email] - Code: [6 digits]`
4. If you see the code, email service is working but delivery failed
5. If no code, email service isn't being called

---

**Need more help?** Share the error messages from Azure Log stream!

