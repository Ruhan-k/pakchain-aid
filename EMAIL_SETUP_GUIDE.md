# Email Setup Guide for PakChain Aid

This guide explains how to configure email sending for OTP verification codes in your Azure-deployed application.

> **Note**: This application has been migrated from Supabase to Azure. Email sending is now handled by the backend API using nodemailer, not Supabase Auth.

## Overview

The application uses **nodemailer** to send OTP verification emails. You can configure it to use:
- Gmail SMTP (easiest for testing)
- Azure Communication Services Email (recommended for production)
- SendGrid (popular alternative)
- Any SMTP server

## Option 1: Gmail SMTP (Quick Setup for Testing)

### Step 1: Enable App Password in Gmail

**Important**: App Passwords are only available for:
- Personal Google accounts (not Google Workspace/Enterprise accounts)
- Accounts with 2-Step Verification enabled

#### Method 1: Direct Link to App Passwords

1. Go directly to: https://myaccount.google.com/apppasswords
2. If you see "App passwords aren't available for your account", see **Alternative Options** below
3. If available, select **Mail** and **Other (Custom name)**
4. Enter "PakChain Aid" and click **Generate**
5. Copy the 16-character password (you'll need this)

#### Method 2: Through Security Settings

1. Go to your Google Account: https://myaccount.google.com/
2. Click **Security** in the left menu
3. Under **How you sign in to Google**, find **2-Step Verification**
4. Click on **2-Step Verification** (not the toggle, but the text/link)
5. Scroll down to find **App passwords** (it's at the bottom of the 2-Step Verification page)
6. Click **App passwords**
7. Select **Mail** and **Other (Custom name)**
8. Enter "PakChain Aid" and click **Generate**
9. Copy the 16-character password

#### If App Passwords Are Not Available:

If you can't find App Passwords, you might have:
- **Google Workspace account**: Use SendGrid or another email service instead (see Option 3)
- **Account type that doesn't support it**: Use SendGrid (recommended - it's free and easier)

**Quick Alternative**: Skip to **Option 3: SendGrid** below - it's actually easier and more reliable!

### Step 2: Set Environment Variables in Azure

1. Go to Azure Portal → Your App Service (`pakchain-aid-api`)
2. Navigate to **Configuration** → **Application settings**
3. Click **+ New application setting** and add:

```
EMAIL_HOST = smtp.gmail.com
EMAIL_PORT = 587
EMAIL_USER = your-email@gmail.com
EMAIL_PASS = your-16-character-app-password
EMAIL_FROM = your-email@gmail.com
```

4. Click **Save** and wait for the app to restart

### Step 3: Test Email Sending

1. Try signing up with your email
2. Check your inbox for the OTP code
3. If it doesn't work, check the App Service logs

## Option 2: Azure Communication Services Email (Production)

### Step 1: Create Communication Services Resource

1. Azure Portal → **Create a resource**
2. Search for **Communication Services**
3. Click **Create**
4. Fill in:
   - **Resource group**: Your existing group
   - **Name**: `pakchain-aid-email`
   - **Region**: Same as your app
5. Click **Review + create** → **Create**

### Step 2: Create Email Communication Service

1. Go to your Communication Services resource
2. Click **Email** in the left menu
3. Click **Add domain** or **Connect Azure Communication Services**
4. Follow the setup wizard to verify your domain

### Step 3: Get Connection String

1. In Communication Services → **Keys**
2. Copy the **Connection string**

### Step 4: Update Backend Code

You'll need to update `backend/src/services/email.ts` to use Azure Communication Services SDK instead of nodemailer. This requires additional setup.

## Option 3: SendGrid (Recommended - Easiest Setup!)

**Why SendGrid?**
- ✅ Free tier: 100 emails/day (perfect for testing)
- ✅ Works with any email account type
- ✅ No App Password needed
- ✅ More reliable than Gmail SMTP
- ✅ Better for production use

### Step 1: Create SendGrid Account

### Step 1: Create SendGrid Account

1. Go to https://sendgrid.com/
2. Sign up for free account (100 emails/day free)
3. Verify your email

### Step 2: Create API Key

1. SendGrid Dashboard → **Settings** → **API Keys**
2. Click **Create API Key**
3. Name it "PakChain Aid"
4. Copy the key (you won't see it again!)

### Step 3: Set Environment Variables

In Azure App Service Configuration:

```
EMAIL_HOST = smtp.sendgrid.net
EMAIL_PORT = 587
EMAIL_USER = apikey
EMAIL_PASS = your-sendgrid-api-key
EMAIL_FROM = your-verified-sender@yourdomain.com
```

## Verification

After setting up email:

1. **Check logs**: Azure Portal → App Service → **Log stream**
2. **Test endpoint**: Try sending an OTP
3. **Check email**: Look for the verification code

## Troubleshooting

### Email not sending?

1. **Check environment variables**: Make sure all are set correctly
2. **Check logs**: Look for error messages in App Service logs
3. **Test SMTP connection**: The email service verifies connection on startup
4. **Check spam folder**: OTP emails might be filtered

### Gmail "Less secure app" error or can't find App Passwords?

**If you can't find App Passwords:**
- You might have a Google Workspace account (App Passwords not available)
- Try the direct link: https://myaccount.google.com/apppasswords
- **Solution**: Use SendGrid instead (Option 3) - it's easier and more reliable!

**If you see "Less secure app" error:**
- Use App Passwords (not your regular password)
- Make sure 2-Step Verification is enabled
- If still not working, switch to SendGrid (Option 3)

### Azure Communication Services not working?

- Verify domain is properly configured
- Check connection string is correct
- Ensure email service is provisioned

## Security Notes

- **Never commit** email passwords/API keys to Git
- Use **App Passwords** for Gmail (not your account password)
- Rotate API keys regularly
- Consider using Azure Key Vault for production

## Next Steps

Once email is working:
1. Test the full sign-up flow
2. Verify OTP codes are received
3. Test OTP expiration (10 minutes)
4. Monitor email delivery rates

## Related Documentation

- `SETUP_COMPLETE.md` - Complete setup guide for Azure migration
- `README.md` - General project documentation
- `CLEANUP_SUMMARY.md` - Details about Supabase cleanup

---

**Important**: This email service replaces Supabase Auth's email functionality. All OTP codes are generated and verified by your Azure backend API.

