# Google Drive browser setup

Diedrico is a static frontend. With no OAuth client ID it runs in explicit local mode; Sign in is disabled. It never requests consent on startup, including when an old session marker exists. Use the Sign in button to authorize or reauthorize after expiry. Local sign-out disconnects the token and stops saving without deleting the drawing/history; it **does not confirm grant revocation**. Revoke the grant independently through Google account permissions if required.

## Operator configuration (not supplied by the repository)

1. Select/create the owning Google Cloud project and enable **Google Drive API**.
2. Configure Google Auth Platform consent/branding, audience and requested data access. Choose External or the applicable organization-only Internal audience. For an External app in Testing, add the intended test users; production audience/verification restrictions must be handled by the project owner.
3. Create an OAuth **Web application** client. Authorized JavaScript origins:
   - `http://localhost:5173` for development;
   - **`https://salva.github.io`** for current Pages hosting. Do **not** include `/diedrico/`: origins contain no path.
4. This GIS browser token flow uses callback functions, not a backend redirect/code exchange. Never put a frontend client secret in Vite, repository variables, browser storage or artifacts.
5. Set repository Actions variable **`VITE_GOOGLE_CLIENT_ID`** to that public client ID. `.github/workflows/docs.yml` maps it into the Vite build. Vite variables are compiled into the public bundle; changing a variable alone does not change an already deployed artifact. Deployment remains an independently authorized operator operation.

Scopes remain `drive.file`, `userinfo.profile` and `userinfo.email`. `drive.file` is app-created/explicitly app-authorized file access, not access to arbitrary pre-existing Drive folders. Listing never creates a folder; first explicit project creation may create the app folder. No scope expansion is needed to fix pagination.

## Optional API key, unused app ID

OAuth-authorized Drive calls do not require a new API key for this implementation. Leave `VITE_GOOGLE_API_KEY` empty unless the owner's actual Google API/quota configuration requires one. If used, restrict it to Drive API and applicable HTTP referrers (`http://localhost:5173/*`, `https://salva.github.io/*`); it is public in the bundle, not a secret. The Pages workflow maps the optional public variable. `VITE_GOOGLE_APP_ID` is unused by this implementation and is not required. Do not invent credentials to pass validation.

For local development supply the public ID through the environment or task-owned noncommitted local environment configuration. See the deployment guide for ordinary build commands. A credential-free mock build validates compilation/UI contracts, **not** public OAuth provisioning.

## Availability and troubleshooting

- Local/unconfigured: drawing remains usable without Google scripts or credentials.
- Loading: wait for bounded gapi/GIS readiness. Blocked scripts, gapi load errors and initialization timeout fail visibly; retry via Sign in.
- Popup blocked/closed/unknown: GIS `error_callback` is separate from OAuth `access_denied`; allow popups or retry from a user gesture. No automatic replay.
- Network failure: preserve local work; inspect connectivity and retry deliberately. A remote write may have unknown effects, so don't assume rollback or automatic replay.
- Expired/401: local auth clears; Sign in again. Optional profile network failure does not mean invalid Drive authentication.
- Sign-out: drawing and undo/redo history stay local. Existing remote files/grants are not deleted.

## Validation and external handoff

Author tests mock the documented GIS contract, including FUNCTION `callback`, separate popup `error_callback`, callback/void revoke signature, shared initialization/retry, bounded scripts, malformed responses and paginated read-only listing. Reference: [GIS JavaScript reference](https://developers.google.com/identity/oauth2/web/reference/js-reference?hl=en).

Only the owner can provide the exact public OAuth client ID and confirm enabled API, audience/test-user eligibility, origin and any key restrictions. A real authenticated disposable-file create/load/update/list/rename/delete test and a deployed-artifact test require separate external authorization and an intended account. No such test, deploy or grant revocation is implied by mock/unit/Chromium success.
