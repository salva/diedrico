# Deployment Guide

This guide explains how to deploy the Diedrico application to various hosting platforms.

## Overview

Diedrico is a static Single Page Application (SPA) built with Vue 3 and Vite. It can be deployed to any static hosting service:

- **GitHub Pages** (free, easy)
- **Netlify** (free, automatic deploys)
- **Vercel** (free, optimized for SPAs)
- **Cloudflare Pages** (free, fast CDN)
- Any web server (Apache, Nginx, etc.)

## Prerequisites

Before deploying:

1. ✅ Set up Google Drive API credentials (see [GOOGLE_DRIVE_SETUP.md](./GOOGLE_DRIVE_SETUP.md))
2. ✅ Add your production URL to Google Cloud Console authorized origins
3. ✅ All tests passing: `npm test` (currently 614 tests passing)
4. ✅ Frontend builds successfully: `npm run build`

---

## Option 1: GitHub Pages (Recommended for Open Source)

### Advantages
- **Free hosting** for public repositories
- HTTPS enabled automatically
- Easy setup with GitHub Actions
- Custom domain support

### Steps

#### 1. Update Vite Configuration

Edit `frontend/vite.config.ts` to set the base path:

```typescript
export default defineConfig({
  base: '/diedrico/', // Replace with your repository name
  plugins: [vue()],
  // ... rest of config
});
```

#### 2. Configure Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Edit your OAuth 2.0 Client ID
4. Add to **Authorized JavaScript origins**:
   ```
   https://yourusername.github.io
   ```
5. Edit your API Key restrictions
6. Add to **Website restrictions**:
   ```
   https://yourusername.github.io/diedrico/*
   ```

#### 3. Set Up GitHub Secrets

1. Go to your GitHub repository
2. Settings → Secrets and variables → Actions
3. Add three **Repository secrets**:
   - `VITE_GOOGLE_CLIENT_ID`: Your OAuth Client ID
   - `VITE_GOOGLE_API_KEY`: Your API Key
   - `VITE_GOOGLE_APP_ID`: Your Project Number

#### 4. Create GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]  # or master, depending on your default branch
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: '**/package-lock.json'
      
      - name: Install dependencies
        run: |
          cd frontend
          npm ci
      
      - name: Build with environment variables
        env:
          VITE_GOOGLE_CLIENT_ID: ${{ secrets.VITE_GOOGLE_CLIENT_ID }}
          VITE_GOOGLE_API_KEY: ${{ secrets.VITE_GOOGLE_API_KEY }}
          VITE_GOOGLE_APP_ID: ${{ secrets.VITE_GOOGLE_APP_ID }}
        run: |
          cd frontend
          npm run build
      
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './frontend/dist'

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

#### 5. Enable GitHub Pages

1. Go to your repository **Settings** → **Pages**
2. Source: **GitHub Actions**
3. Save

#### 6. Deploy

Push to main branch:
```bash
git add .
git commit -m "Deploy to GitHub Pages"
git push origin main
```

Your app will be live at: `https://yourusername.github.io/diedrico/`

---

## Option 2: Netlify

### Advantages
- **Automatic deploys** on git push
- Free SSL
- Form handling, serverless functions
- Easy custom domains

### Steps

#### 1. Create `netlify.toml`

Create `netlify.toml` in the project root:

```toml
[build]
  base = "frontend"
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

#### 2. Deploy

**Option A: Netlify Web UI**
1. Go to [netlify.com](https://netlify.com)
2. Click **Add new site** → **Import an existing project**
3. Connect to your Git repository
4. Configure:
   - Build command: `npm run build`
   - Publish directory: `frontend/dist`
5. Add environment variables in **Site settings** → **Environment variables**:
   - `VITE_GOOGLE_CLIENT_ID`
   - `VITE_GOOGLE_API_KEY`
   - `VITE_GOOGLE_APP_ID`
6. Click **Deploy site**

**Option B: Netlify CLI**
```bash
npm install -g netlify-cli
cd frontend
netlify deploy --prod
```

#### 3. Update Google Cloud Console

Add your Netlify URL to authorized origins:
```
https://your-site-name.netlify.app
```

---

## Option 3: Vercel

### Advantages
- **Optimized for SPAs**
- Fast edge network
- Automatic preview deployments
- Free SSL

### Steps

#### 1. Install Vercel CLI

```bash
npm install -g vercel
```

#### 2. Deploy

```bash
cd frontend
vercel
```

Follow the prompts to link your project.

#### 3. Set Environment Variables

```bash
vercel env add VITE_GOOGLE_CLIENT_ID production
vercel env add VITE_GOOGLE_API_KEY production
vercel env add VITE_GOOGLE_APP_ID production
```

Or add them in the Vercel dashboard: **Settings** → **Environment Variables**

#### 4. Update Google Cloud Console

Add your Vercel URL to authorized origins:
```
https://your-project.vercel.app
```

---

## Option 4: Self-Hosted (Nginx/Apache)

### For Nginx

Create `/etc/nginx/sites-available/diedrico`:

```nginx
server {
    listen 80;
    server_name diedrico.yourdomain.com;
    root /var/www/diedrico;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /assets {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Deploy:
```bash
cd frontend
npm run build
sudo cp -r dist/* /var/www/diedrico/
sudo systemctl reload nginx
```

### For Apache

Create `.htaccess` in the web root:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

---

## Environment Variables at Build Time

**Important**: With static hosting, environment variables are embedded during build:

```bash
# Set variables before building
export VITE_GOOGLE_CLIENT_ID="your-client-id"
export VITE_GOOGLE_API_KEY="your-api-key"
export VITE_GOOGLE_APP_ID="your-app-id"

# Build
npm run build

# Variables are now embedded in dist/assets/*.js
```

The `.env` file is **not deployed** - only the built JavaScript files.

### Is it safe to expose credentials in built JavaScript?

**YES** - this is the standard approach for browser-based OAuth apps:

- ✅ **OAuth Client ID**: Designed to be public
- ✅ **API Key**: Safe when restricted to your domain in Google Cloud Console
- ✅ **No secrets**: We don't use client secrets (browser apps don't need them)

**Critical**: Always restrict your API key to your production domain (see [GOOGLE_DRIVE_SETUP.md](./GOOGLE_DRIVE_SETUP.md#step-5-create-api-key)). This prevents others from using your credentials even if they copy them from your JavaScript.

Popular apps using this approach: Google Drive Picker, Google Maps, Firebase, Auth0 client apps.

---

## Custom Domain Setup

### GitHub Pages
1. Add a `CNAME` file to `frontend/public/` with your domain
2. Configure DNS:
   ```
   A    @    185.199.108.153
   A    @    185.199.109.153
   A    @    185.199.110.153
   A    @    185.199.111.153
   ```

### Netlify/Vercel
1. Go to site settings → Domain management
2. Add your custom domain
3. Update DNS as instructed

---

## Security Checklist

Before deploying to production:

- [ ] API keys restricted to production domain in Google Cloud Console
- [ ] HTTPS enabled (automatic with GitHub Pages/Netlify/Vercel)
- [ ] `.env` file not committed to repository
- [ ] OAuth consent screen reviewed (if publishing publicly)
- [ ] Test sign-in flow on production URL
- [ ] Verify auto-save works in production
- [ ] Check browser console for errors

---

## Monitoring and Analytics

Consider adding:
- **Google Analytics** for usage tracking
- **Sentry** for error monitoring
- **LogRocket** for session replay

---

## Continuous Deployment

All platforms support automatic deployment:
- **GitHub Pages**: Via GitHub Actions (see workflow above)
- **Netlify**: Automatic on git push
- **Vercel**: Automatic on git push

Every push to main branch triggers a new deployment automatically.

---

## Troubleshooting

### Build fails with "Module not found"
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Google sign-in fails in production
- Check authorized JavaScript origins in Google Cloud Console
- Verify environment variables are set correctly
- Check browser console for specific error messages

### App shows blank page
- Check browser console for errors
- Verify base path in `vite.config.ts` matches deployment URL
- Ensure all assets are accessible (check network tab)

### Auto-save not working
- Test in browser console: `navigator.onLine` should be `true`
- Check Network tab for failed API requests
- Verify API key restrictions allow your domain

---

## Rollback Strategy

### GitHub Pages
```bash
# Revert to previous commit
git revert HEAD
git push origin main
```

### Netlify/Vercel
Use the web dashboard to rollback to a previous deployment with one click.

---

## Performance Tips

1. **Enable compression** (Gzip/Brotli) - automatic on most platforms
2. **Use CDN** - GitHub Pages, Netlify, Vercel all use CDNs
3. **Optimize images** - already using SVG for most UI
4. **Lazy load components** - already implemented where appropriate
5. **Monitor bundle size**: `npm run build -- --mode=production`

---

## Cost Breakdown

| Platform | Free Tier | Paid Plans |
|----------|-----------|------------|
| GitHub Pages | Unlimited (public repos) | N/A |
| Netlify | 100 GB/month bandwidth | $19/month (Pro) |
| Vercel | 100 GB/month bandwidth | $20/month (Pro) |
| Google Drive API | Free (1B queries/day) | N/A for typical use |

For most users, **all costs are $0** 🎉

---

## Next Steps

1. Choose a deployment platform
2. Follow the setup guide for that platform
3. Test thoroughly in production
4. Set up monitoring (optional)
5. Share your app with users!

For questions or issues, check:
- [Google Drive API Documentation](https://developers.google.com/drive/api)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
- Project repository issues
