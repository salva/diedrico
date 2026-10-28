# Deployment guide

Diedrico is a static Vue 3 + Vite single-page application. Deploy the contents of `frontend/dist` to a static host; there is no backend workspace to deploy.

## Build prerequisites

- Node.js >=20.19.0 and npm >=10.0.0, matching root `package.json`.
- Run installation and validation from the repository root, which owns `package-lock.json`:

```bash
npm ci
npm test
npm run build
```

The root build delegates to `frontend` and runs `vue-tsc` followed by `vite build`. Test counts and historical passing logs are not a deployment gate: inspect the results on the revision being deployed. See [testing](./contributing/testing.md) for architecture, lint and browser checks.

For Google Drive integration, configure the browser application's build-time variables described in [Google Drive setup](./GOOGLE_DRIVE_SETUP.md). Use `frontend/.env` locally or the hosting provider's build environment. Never put a client secret in a browser build. `VITE_` values are embedded in public JavaScript; restrict browser API keys and authorized OAuth origins for the target deployment. Do not commit local environment files.

## Base path and output

`frontend/vite.config.ts` currently selects `/diedrico/` when `GITHUB_ACTIONS` is set, and `/` otherwise. Adjust that base for a different repository name, custom domain or hosting subpath before building. Deploy `frontend/dist`, not the source tree. Ensure assets load under the chosen base path.

## Existing GitHub Pages workflow

Despite its name, `.github/workflows/docs.yml` deploys the **frontend application**, not VitePress docs. It:

- Runs on pushes to `master` and `develop`, or manual dispatch.
- Sets up Node 20 (the resolved version must satisfy the package engine), runs root `npm ci`, and builds using `cd frontend && npx vite build`.
- Uploads `frontend/dist` and deploys it using GitHub Pages Actions.

That workflow's direct Vite invocation does **not** perform the `vue-tsc` check in `npm run build`, or run tests. Run the validation above separately; do not infer full validation from a Pages build. It explicitly maps repository Actions variables `VITE_GOOGLE_CLIENT_ID` and optional `VITE_GOOGLE_API_KEY` at build time. Missing public client ID deliberately produces local mode, not usable Drive authentication. The operator must supply the actual ID and authorize a new deployment; no credentials are invented by the workflow. See [Google Drive setup](./GOOGLE_DRIVE_SETUP.md) for the exact `https://salva.github.io` origin (no `/diedrico/` path), audience/test users and restrictions.

Enable GitHub Actions as the repository's Pages source and adapt this existing workflow rather than creating a competing Pages workflow. Deployment occurs only for configured events/branches; a push to `main` is not currently a trigger. Review changes and the intended branch before committing or pushing; no deployment is performed by this guide itself.

## Other static hosts

For Netlify, Vercel or Cloudflare Pages, use the repository root as the project/build root so the npm workspace and root lockfile are available:

- Install command: `npm ci`.
- Build command: `npm run build`.
- Output directory: `frontend/dist`.
- Select a supported Node/npm version (for example Node 22 with npm >=10).
- Configure build-time browser integration variables if needed.
- Configure fallback to `index.html` if the hosting setup needs SPA route fallback.

For example, a root `netlify.toml` can contain:

```toml
[build]
  command = "npm run build"
  publish = "frontend/dist"

[build.environment]
  NODE_VERSION = "22"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

Provider dashboard steps, plans and quotas can change; consult the provider's current documentation rather than relying on fixed historical prices or limits.

For a self-hosted Nginx/Apache server, build at the repository root and copy `frontend/dist/` into the intended document root using your deployment process. Enable HTTPS, serve assets under the configured Vite base, and configure an `index.html` fallback as needed. Retain a known-good artifact/revision for rollback; do not delete source lockfiles or rewrite repository history to recover a deployment.

## Verification and troubleshooting

- A module/build failure: check the actual error, supported Node/npm versions and root installation. Run `npm ci` at the root; preserve the committed lockfile rather than deleting it as a generic repair.
- Blank page or missing assets: check the browser console/network and Vite base against the hosting URL.
- Drive sign-in/save failure: check build-time configuration, authorized JavaScript origin, API restrictions, connectivity and user authorization. Never paste credentials or tokens into logs or issue reports.
- Before publishing: verify HTTPS, asset loading, intended save flows and browser errors on the target URL. A local documentation build is not proof of a working hosted application.
- Rollback: use the hosting provider's retained deployment/artifact mechanism, or a reviewed revert and redeployment through the repository workflow.

## References

- [Development setup](./contributing/development-setup.md)
- [Google Drive setup](./GOOGLE_DRIVE_SETUP.md)
- [Vite static deployment](https://vite.dev/guide/static-deploy)
