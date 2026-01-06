# Google Drive API Setup Guide

This guide explains how to set up Google Drive API credentials for the Diedrico application.

## Prerequisites

- A Google account
- Access to [Google Cloud Console](https://console.cloud.google.com/)

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** → **New Project**
3. Enter project name: `Diedrico` (or your preferred name)
4. Click **Create**
5. Wait for the project to be created and select it

## Step 2: Enable Google Drive API

1. In the left sidebar, go to **APIs & Services** → **Library**
2. Search for "Google Drive API"
3. Click on **Google Drive API**
4. Click **Enable**

## Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** (for public access) or **Internal** (for organization only)
3. Click **Create**
4. Fill in the required fields:
   - **App name**: `Diedrico`
   - **User support email**: Your email
   - **Developer contact information**: Your email
5. Click **Save and Continue**
6. **Scopes**: Click **Add or Remove Scopes**
   - Search for "Google Drive API"
   - Select: `https://www.googleapis.com/auth/drive.file`
   - This scope allows the app to access only files it creates
7. Click **Save and Continue**
8. **Test users** (if External): Add your email for testing
9. Click **Save and Continue**

## Step 4: Create OAuth 2.0 Client ID

1. Go to **APIs & Services** → **Credentials**
2. Click **+ Create Credentials** → **OAuth client ID**
3. Application type: **Web application**
4. Name: `Diedrico Web Client`
5. **Authorized JavaScript origins**:
   - For local development: `http://localhost:5173`
   - For production: Add your production URL (e.g., `https://yourusername.github.io`)
6. **Authorized redirect URIs**: Leave empty (not needed for implicit flow)
7. Click **Create**
8. **Copy the Client ID** - you'll need this for the `.env` file

## Step 5: Create API Key

1. Still in **APIs & Services** → **Credentials**
2. Click **+ Create Credentials** → **API Key**
3. **Copy the API Key** immediately
4. Click **Restrict Key** (recommended for security)
5. Under **API restrictions**:
   - Select **Restrict key**
   - Select **Google Drive API**
6. Under **Website restrictions**:
   - Select **HTTP referrers**
   - Add: `http://localhost:5173/*` (for development)
   - Add: `https://yourusername.github.io/*` (for production)
7. Click **Save**

## Step 6: Get Application ID (Project Number)

1. Go to the [Google Cloud Console Dashboard](https://console.cloud.google.com/)
2. Select your project
3. Look for **Project number** in the project info card
4. Copy this number - this is your `VITE_GOOGLE_APP_ID`

## Step 7: Configure Local Environment

1. Create a `.env` file in the `frontend/` directory:

```bash
cd frontend
cp .env.template .env
```

2. Edit `.env` with your credentials:

```env
# OAuth 2.0 Client ID (from Step 4)
VITE_GOOGLE_CLIENT_ID=123456789012-abcdefghijklmnopqrstuvwxyz123456.apps.googleusercontent.com

# API Key (from Step 5)
VITE_GOOGLE_API_KEY=AIzaSyAaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQq

# Application ID / Project Number (from Step 6)
VITE_GOOGLE_APP_ID=123456789012
```

3. Restart the development server:

```bash
npm run dev
```

## Step 8: Test the Integration

1. Open the app in your browser: `http://localhost:5173`
2. You should see the "Sign in with Google" dialog
3. Click **Sign in with Google**
4. Authorize the app to access your Google Drive
5. Try creating a new project - it should save to your Google Drive in a "diedrico" folder

## Troubleshooting

### Error: "popup_closed_by_user"
- User cancelled the sign-in popup
- Click sign-in again

### Error: "access_denied"
- User denied permission to access Google Drive
- Review and accept the required permissions

### Error: "idpiframe_initialization_failed"
- Check that your Client ID is correct
- Verify the authorized JavaScript origin matches your current URL
- Clear browser cookies and try again

### Error: "401 Unauthorized"
- Session expired - sign in again
- Check that the API is enabled in Google Cloud Console

### Files not appearing
- Check the Google Drive "diedrico" folder manually
- Verify the API key restrictions allow your domain
- Check browser console for detailed error messages

## Security Notes

### Are these credentials safe to expose publicly?

**YES** - but only with proper restrictions:

1. **OAuth Client ID** ✅ **Safe to expose publicly**
   - Designed for client-side applications
   - Cannot be used without user authorization
   - Only works from authorized JavaScript origins

2. **API Key** ✅ **Safe to expose IF RESTRICTED**
   - Must be restricted to your domains in Google Cloud Console
   - Without restrictions, anyone could use your quota
   - **Critical**: Set HTTP referrer restrictions (Step 5)

3. **Client Secret** ❌ **Never used in browser apps**
   - We don't use a client secret (not needed for browser OAuth)
   - Only server-side apps need client secrets

### Why this is secure:

- **Domain restrictions**: API key only works from your specified domains
- **OAuth flow**: Users must explicitly grant permission
- **Limited scope**: `drive.file` only accesses files the app creates
- **No backend**: No server means no secret keys to leak
- **User control**: Users can revoke access anytime

### What happens if someone copies your credentials?

If someone copies your Client ID and API Key from your built JavaScript:
- ❌ **They cannot use them** from a different domain (blocked by restrictions)
- ❌ **They cannot access user data** without OAuth authorization
- ✅ **They could only** consume your API quota (if key unrestricted)

### Best practices:

1. **Always restrict API keys** to specific domains in production
2. **Never commit `.env` files** to version control (use `.gitignore`)
3. **Use OAuth consent screen** review before going live
4. **Monitor API usage** in Google Cloud Console
5. The `drive.file` scope is least-privileged - app only accesses its own files
6. Users can revoke access anytime from [Google Account Settings](https://myaccount.google.com/permissions)

## Production Deployment Notes

When deploying to production (e.g., GitHub Pages):

1. Add your production URL to **Authorized JavaScript origins** in Google Cloud Console
2. Update API key restrictions to include your production domain
3. Build the app with environment variables:
   ```bash
   # Set environment variables before building
   npm run build
   ```
4. The `.env` file is only used during build - credentials are embedded in the built JavaScript
5. Consider using GitHub Secrets or Netlify/Vercel environment variables for CI/CD

## Cost

- Google Drive API is **free** for typical usage
- Free tier: 1 billion queries/day
- Storage: 15 GB free per Google account
- See [Google Drive API Pricing](https://developers.google.com/drive/api/guides/limits) for details
