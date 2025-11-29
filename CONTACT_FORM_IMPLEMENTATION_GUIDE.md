# Contact Form Implementation Guide

This guide provides step-by-step instructions to implement and deploy the Contact Us page for PakChain Aid.

## Overview

The Contact Us page allows users to send messages directly to `khalidruhan854@gmail.com` through a secure contact form. The form includes validation, error handling, and email notifications.

## Prerequisites

- Backend API running (Node.js/Express)
- Email service configured (Gmail SMTP or SendGrid)
- Frontend build system (Vite)
- Access to Azure Portal (for production deployment)

## Step 1: Install Dependencies

The contact form uses existing dependencies. No new packages are required, but ensure these are installed:

### Backend Dependencies
```bash
cd backend
npm install nodemailer @types/nodemailer
```

If already installed, verify:
```bash
npm list nodemailer
```

### Frontend Dependencies
All frontend dependencies are already included in the project. No additional installation needed.

## Step 2: Configure Email Service

The contact form uses the same email service as OTP emails. Ensure email is configured in Azure App Service:

### Option A: Gmail SMTP (Quick Setup)

1. **Get Gmail App Password:**
   - Go to https://myaccount.google.com/security
   - Enable 2-Step Verification
   - Go to App Passwords → Generate new password
   - Copy the 16-character password

2. **Set Environment Variables in Azure:**
   - Azure Portal → Your App Service (`pakchain-aid-api`)
   - Navigate to **Configuration** → **Application settings**
   - Add/Verify these settings:
     ```
     EMAIL_HOST = smtp.gmail.com
     EMAIL_PORT = 587
     EMAIL_USER = your-email@gmail.com
     EMAIL_PASS = your-16-character-app-password
     EMAIL_FROM = your-email@gmail.com
     ```
   - Click **Save** and wait for app restart

### Option B: SendGrid (Recommended for Production)

1. **Create SendGrid Account:**
   - Go to https://sendgrid.com/
   - Sign up for free account (100 emails/day free)
   - Verify your email

2. **Create API Key:**
   - SendGrid Dashboard → **Settings** → **API Keys**
   - Click **Create API Key**
   - Name it "PakChain Aid Contact"
   - Copy the key (you won't see it again!)

3. **Set Environment Variables in Azure:**
   ```
   EMAIL_HOST = smtp.sendgrid.net
   EMAIL_PORT = 587
   EMAIL_USER = apikey
   EMAIL_PASS = your-sendgrid-api-key
   EMAIL_FROM = your-verified-sender@yourdomain.com
   ```

## Step 3: Build Backend

After adding the contact route, rebuild the backend:

```bash
cd backend
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` folder.

## Step 4: Test Backend Locally (Optional)

1. **Start backend server:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Test contact endpoint:**
   ```bash
   curl -X POST http://localhost:3000/api/contact \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Test User",
       "email": "test@example.com",
       "subject": "Test Subject",
       "message": "This is a test message from the contact form."
     }'
   ```

3. **Check email inbox:**
   - Check `khalidruhan854@gmail.com` for the test message
   - Verify all fields are included correctly

## Step 5: Deploy Backend to Azure

1. **Build for production:**
   ```bash
   cd backend
   npm run build
   ```

2. **Deploy to Azure:**
   - Use Azure CLI, VS Code Azure extension, or Git deployment
   - Ensure `dist/` folder is deployed
   - Verify `package.json` has correct start script: `"start": "node dist/server.js"`

3. **Verify deployment:**
   - Check Azure Portal → App Service → **Log stream**
   - Look for "Server running on port" message
   - Test health endpoint: `https://your-api-url.azurewebsites.net/health`

## Step 6: Build Frontend

1. **Build frontend:**
   ```bash
   npm run build
   ```

2. **Test locally (optional):**
   ```bash
   npm run dev
   ```
   - Navigate to http://localhost:5173
   - Click "Contact Us" in navigation
   - Fill out and submit the form
   - Check email inbox

## Step 7: Deploy Frontend

### Option A: Azure Static Web Apps

1. **Build:**
   ```bash
   npm run build
   ```

2. **Deploy:**
   - Use Azure Static Web Apps deployment
   - Or upload `dist/` folder contents to Azure Storage

### Option B: Other Hosting

1. **Build:**
   ```bash
   npm run build
   ```

2. **Upload `dist/` folder contents to your hosting provider**

## Step 8: Verify Deployment

1. **Test Contact Form:**
   - Visit your website
   - Navigate to Contact Us page
   - Fill out the form with test data
   - Submit and verify success message

2. **Check Email:**
   - Check `khalidruhan854@gmail.com` inbox
   - Verify email contains:
     - User's name
     - User's email (as reply-to)
     - Subject
     - Message content

3. **Test Validation:**
   - Try submitting empty form (should show errors)
   - Try invalid email format (should show error)
   - Try message less than 10 characters (should show error)

## Step 9: Database (Not Required)

**Note:** The contact form does NOT require database changes. All submissions are sent directly via email. No SQL queries or table creation is needed.

## Troubleshooting

### Email Not Sending

1. **Check Azure Logs:**
   - Azure Portal → App Service → **Log stream**
   - Look for error messages when submitting form

2. **Verify Environment Variables:**
   - Check all email variables are set correctly
   - No quotes around values
   - No extra spaces

3. **Test Email Service:**
   - Try sending OTP email first (if that works, contact form should work)
   - Check spam folder

### Form Not Submitting

1. **Check Browser Console:**
   - Open Developer Tools (F12)
   - Look for error messages in Console tab

2. **Check Network Tab:**
   - Verify POST request to `/api/contact`
   - Check response status and error message

3. **Verify CORS:**
   - Check backend CORS settings in `server.ts`
   - Ensure frontend URL is in allowed origins

### Backend Errors

1. **Check Backend Logs:**
   ```bash
   # In Azure Portal
   App Service → Log stream
   ```

2. **Verify Route Registration:**
   - Check `backend/src/server.ts` includes contact route
   - Verify route is registered: `app.use('/api/contact', contactRoutes);`

3. **Check File Exists:**
   - Verify `backend/src/routes/contact.ts` exists
   - Verify `backend/src/services/email.ts` has `sendContactEmail` function

## File Structure

### New Files Created

```
src/
  components/
    Contact.tsx              # Contact form component

backend/
  src/
    routes/
      contact.ts             # Contact API route
```

### Modified Files

```
src/
  App.tsx                    # Added Contact page routing
  components/
    Navigation.tsx           # Added Contact Us link
  lib/
    api.ts                   # Added sendContactEmail function

backend/
  src/
    server.ts                # Added contact route registration
    services/
      email.ts               # Added sendContactEmail function
```

## API Endpoint

### POST /api/contact

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "subject": "Question about donations",
  "message": "I have a question about how donations work..."
}
```

**Success Response (200):**
```json
{
  "message": "Contact form submitted successfully",
  "code": "SUCCESS"
}
```

**Error Response (400/500):**
```json
{
  "message": "Error description",
  "code": "VALIDATION_ERROR" | "INTERNAL_ERROR"
}
```

## Security Features

1. **Input Validation:**
   - Required field validation
   - Email format validation
   - Minimum message length (10 characters)
   - Input sanitization (max lengths)

2. **Email Security:**
   - Uses existing secure email service
   - Reply-to header set to user's email
   - No sensitive data stored

3. **CORS Protection:**
   - Backend validates allowed origins
   - Only configured domains can submit

## Testing Checklist

- [ ] Form displays correctly
- [ ] All fields are visible
- [ ] Submit button works
- [ ] Validation shows errors for empty fields
- [ ] Email format validation works
- [ ] Message length validation works
- [ ] Success message displays after submission
- [ ] Error message displays on failure
- [ ] Email received at khalidruhan854@gmail.com
- [ ] Email contains all form fields
- [ ] Reply-to header works correctly
- [ ] Form resets after successful submission
- [ ] Mobile responsive design works

## Next Steps

After implementation:

1. **Monitor Email Inbox:**
   - Regularly check `khalidruhan854@gmail.com`
   - Set up email filters if needed

2. **Optional Enhancements:**
   - Add rate limiting to prevent spam
   - Add CAPTCHA for additional security
   - Store submissions in database for tracking
   - Add auto-reply confirmation email to user

## Support

If you encounter issues:

1. Check Azure App Service logs
2. Verify email configuration
3. Test backend endpoint directly
4. Check browser console for frontend errors
5. Review this guide's troubleshooting section

---

**Implementation Date:** November 2024  
**Version:** 1.0  
**Status:** Production Ready

