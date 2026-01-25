# GitHub Pages Deployment Guide

This document explains how to deploy the Diedrico webapp to GitHub Pages.

## Prerequisites

- Node.js 18+ and npm 9+ installed
- Git repository pushed to GitHub
- gh-pages package installed (already configured)

## Configuration Done

The following changes have been made to enable GitHub Pages deployment:

1. **vite.config.ts**: Added `base: '/diedrico/'` for GitHub Pages URL structure
2. **package.json**: Added `deploy` script that builds and deploys
3. **gh-pages**: Installed as dev dependency for automated deployment
4. **.nojekyll**: Added to prevent Jekyll from ignoring files starting with underscore

## Deployment Methods

### Method 1: Automated Deployment (Recommended)

Deploy with a single command from the frontend directory:

```bash
cd frontend
npm run deploy
```

This will:
1. Build the production app (`npm run build`)
2. Push the `dist` folder to the `gh-pages` branch
3. Make it available at https://salva.github.io/diedrico/

### Method 2: Manual Deployment

If you prefer manual control:

```bash
# 1. Build the application
cd frontend
npm run build

# 2. Deploy to gh-pages branch
npx gh-pages -d dist
```

### Method 3: GitHub Actions (Future Enhancement)

For automated deployment on every push, create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
      
      - name: Install dependencies
        run: npm ci
        working-directory: frontend
      
      - name: Build
        run: npm run build
        working-directory: frontend
      
      - name: Setup Pages
        uses: actions/configure-pages@v4
      
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: frontend/dist
      
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

## GitHub Repository Settings

After first deployment, configure GitHub Pages:

1. Go to your repository on GitHub
2. Navigate to **Settings** > **Pages**
3. Under "Source", select:
   - **Source**: Deploy from a branch
   - **Branch**: `gh-pages`
   - **Folder**: `/ (root)`
4. Click **Save**

The site will be available at: **https://salva.github.io/diedrico/**

## Deployment Checklist

Before deploying:

- [ ] All changes committed to git
- [ ] Tests passing (`npm test`)
- [ ] Build successful locally (`npm run build`)
- [ ] No TypeScript errors (`vue-tsc`)
- [ ] API endpoints don't rely on backend (frontend-only app)

## Troubleshooting

### Issue: Blank page or 404 errors

**Solution**: Verify the `base` path in `vite.config.ts` matches your GitHub repository name:
```typescript
base: '/diedrico/' // Must match repo name
```

### Issue: Assets not loading

**Solution**: Check that `.nojekyll` file exists in `frontend/public/`

### Issue: Router not working on refresh

**Solution**: GitHub Pages doesn't support HTML5 history mode for SPAs directly. Options:
1. Use hash-based routing (`createWebHashHistory`)
2. Add a custom 404.html that redirects to index.html
3. Use a service like Netlify or Vercel instead

### Issue: Deployment fails with permission error

**Solution**: Ensure you have push access to the repository and gh-pages branch exists

## Production Build Analysis

Check build size and performance:

```bash
cd frontend
npm run build
```

The `dist` folder contains the production build. Key files:
- `index.html` - Entry point
- `assets/*.js` - JavaScript bundles
- `assets/*.css` - Stylesheets

## Local Preview of Production Build

Test the production build locally before deploying:

```bash
cd frontend
npm run build
npm run preview
```

Visit http://localhost:4173/diedrico/ (note the base path)

## Continuous Deployment

To enable automatic deployment on every push to main:

1. Set up GitHub Actions (see Method 3 above)
2. Push changes to the `main` branch
3. GitHub Actions will automatically build and deploy

## Rollback

To rollback to a previous version:

```bash
# Check deployment history
cd frontend
git log origin/gh-pages

# Rollback to specific commit
git push origin <commit-hash>:gh-pages --force
```

## Environment Variables

GitHub Pages is a static hosting service. All environment variables must be set at build time:

1. Create `.env.production` in `frontend/`:
```bash
VITE_APP_TITLE=Diedrico
VITE_API_URL=https://your-api-if-needed.com
```

2. Reference in code with `import.meta.env.VITE_*`

## Performance Optimization

For better performance on GitHub Pages:

1. **Code Splitting**: Already enabled in Vite
2. **Asset Compression**: GitHub Pages serves gzipped assets automatically
3. **Caching**: Configure in `vite.config.ts`:
```typescript
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'three': ['three'],
        'vue': ['vue', 'pinia']
      }
    }
  }
}
```

## Custom Domain (Optional)

To use a custom domain:

1. Add `CNAME` file to `frontend/public/`:
```
your-domain.com
```

2. Configure DNS records with your domain provider:
   - Type: A
   - Host: @
   - Points to: GitHub Pages IPs (see GitHub docs)

3. Enable HTTPS in repository settings

## Security Considerations

- GitHub Pages sites are always public
- Don't commit secrets or API keys
- All data in frontend is visible to users
- Use environment variables for configuration
- Backend APIs should implement proper CORS and authentication

## Resources

- [Vite Static Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [gh-pages Package](https://github.com/tschaub/gh-pages)
