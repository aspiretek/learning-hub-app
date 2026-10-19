# Lille's Learning Hub — V0.9 private cloud-sync setup

**Status:** Code is ready for a private preview, but cloud sync does NOT work until you complete the Cloudflare setup below. Never use real student records on an unprotected public preview.

## Architecture

- UI: existing Cloudflare Pages site, `index.html`.
- API: same-origin `/api/sync` Pages Function; no external API URL in the browser.
- Authentication: Cloudflare Access JWT, cryptographically verified again in the API using the team's published signing certificates, expected issuer and application audience. A 4–6 digit Parent PIN **is not** cloud authentication.
- Master data: private Cloudflare D1 table `hub_state`, exactly one JSON document, with monotonically increasing integer revision.
- Backups: prior versions appended to `hub_backups` on every successful edit.
- Browser: existing localStorage still maintained as offline copy; import/export still works.
- Conflict: atomic compare-and-swap revision check; a mismatch returns HTTP 409. The browser keeps its local changes and asks for manual resolution, never silently overwrites.

## One-time Cloudflare configuration (requires account access)

1. **Protect the entire Pages deployment with Cloudflare Access**, including the relevant preview URL(s), BEFORE importing Lille's real learning data. Limit access to approved parent email account(s) and verify the public can't open the site anonymously. Cloudflare Access may require a custom domain/Zero Trust application depending on your Pages setup. If you cannot protect the preview, do not import private data.
2. In Cloudflare Zero Trust, get your **Access team domain**, e.g. `https://example.cloudflareaccess.com`, and the Access application's **AUD** tag. The Access application must cover the same hostname as the Pages app, so the browser's same-origin API requests carry the Access authentication session. Add two environment variables to the **Preview** Pages environment:
   - `ACCESS_TEAM_DOMAIN` = `https://YOUR-TEAM.cloudflareaccess.com`
   - `ACCESS_AUD` = the Access application audience tag (not the application name).
   These are verification parameters, not user passwords or secrets.
3. In Cloudflare D1 create a separate **preview-only database**, e.g. `lille-learning-hub-preview`. Apply `cloud/migration.sql` using the D1 SQL console. This creates the singleton master record and history table.
4. On Cloudflare Pages project `learning-hub-app-test`, go to Settings → Bindings. Under **Preview**, add D1 binding with variable name **`HUB_DB`** pointing to the preview database. Configure a different production database/binding later, if production is approved. Redeploy the feature branch after changes.
5. Ensure Git-integrated Pages deployment includes the top-level `functions/api/sync.js` directory (functions deploy with Pages). If your project uses a build command or output directory, confirm that Functions are detected. Never put the D1 data file in the repository or public static assets.
6. Visit the branch preview, sign in via Access, and open Parent → Cloud sync. It should show **First sync** (empty database). **Export a JSON backup first**; verify the local progress is current and isn't demo data. Click **Save iPad data to cloud**.
7. Reload, verify the revision and ratings. Check that another authorized device downloads the cloud record. Test one update; it should increment the revision.
8. For a conflict test, load the same revision on two authorized devices, modify both, and confirm the later saver sees **Conflict** instead of overwriting. Export JSON from the conflicting iPad before resolving.
9. For recovery, use the `hub_backups` table or prior manual JSON exports. The app deliberately does not offer destructive server-side restore.

## Access / database security notes

- Never store a Cloudflare API token, D1 credential, or authentication key in `index.html`, GitHub, or a browser localStorage variable.
- The API rejects missing/invalid Access assertions and fails closed when `HUB_DB`, `ACCESS_AUD`, or `ACCESS_TEAM_DOMAIN` is missing.
- Access must protect static HTML too: API auth alone does not restrict the public app shell, and an unlocked client containing local data is visible to whoever can use that device.
- All client cloud requests use `same-origin` cookies; no CORS exceptions needed. Keep Pages preview hostnames and production hostnames isolated unless you explicitly want to share the same cloud database.
- Default Pages previews may be publicly accessible. Do **not** upload private student records until Access and login restrictions are tested.
- All originals stay in the private Google Drive archive and are referenced by URL in the JSON. Cloud D1 does not contain original PDFs.
- This is one learner / one household design, not a multi-account platform. If more families are added, add per-user authorization and data isolation.

## Data formats

- Existing `lille-hub-v1` JSON is unchanged.
- Browser local keys: `lille-learning-hub-v01`, `lille-cloud-revision-v1`, and `lille-cloud-shadow-v1` for a last-successful-sync copy.
- GET `/api/sync`: `{ revision, data, updated_at }`. `data: null` means empty cloud record.
- PUT `/api/sync`: `{ expected_revision, data }`. Returns `{ revision, updated_at }` on success, `409` if revision differs. Server allows only valid hub JSON, with 750KB maximum request.

### Useful security/runtime references

- [Pages D1 binding](https://developers.cloudflare.com/pages/functions/bindings/)
- [Pages Functions](https://developers.cloudflare.com/pages/functions/get-started/)
- [Cloudflare Access Pages plugin documentation](https://developers.cloudflare.com/pages/functions/plugins/cloudflare-access/)
