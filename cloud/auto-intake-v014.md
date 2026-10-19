# V0.14: Automatic ChatGPT → private Google Drive inbox → Cloudflare D1

Status: **Implemented as an unconfigured preview**. NOT live or automatically delivering assessments until the parent completes the security setup. Previous V0.13 manual import remains available. Keep the existing V0.13 preview for safety.

## Data flow
1. Parent scans Lille's worksheet as a PDF and uploads it to ChatGPT.
2. ChatGPT reviews answers, distinguishes guided vs independent work, and uploads the **original PDF** to private `/Google Drive/LillesLearningJourney/Scans/` folder.
3. ChatGPT generates `lille-assessment-v1` JSON with unique assessment ID, actual Drive PDF URL, score/evidence and pending proposed ratings, and uploads the JSON to private `/Google Drive/LillesLearningJourney/Scans/AssessmentInbox/`.
4. Google Apps Script polls the inbox every 5 min. Its script properties contain Access service-token credentials and an independent ingestion shared secret. The script POSTs each pending file to the exact protected branch preview's `/api/intake` endpoint.
5. Cloudflare Access at the edge authenticates the service token. Pages Function additionally validates `INGEST_SHARED_SECRET`, then checks record/schema and skill IDs, skips duplicates, writes history/inbox evidence to the existing D1 state in a revision-conditional update and stores a backup. **No change to `skills[].status` is made by intake.**
6. Only after a successful response does Apps Script move the JSON from AssessmentInbox to AssessmentProcessed. Failed delivery stays in inbox for retry.
7. V0.14 browser refreshes clean cloud state every minute when open or upon tab focus. Parent approves/rejects suggested rating changes via existing dashboard buttons. That decision syncs using existing optimistic conflict protection.

## Drive folders already created
- Inbox `/Google Drive/LillesLearningJourney/Scans/AssessmentInbox`, ID `1u030Hgi8r3KmNQvnoi56algbL-ifySvo`
- Processed `/Google Drive/LillesLearningJourney/Scans/AssessmentProcessed`, ID `10EMb0QCzGfz3LhVSb9dfbyWzX5Mnk1MH`
- PDF originals stay in the existing Scans folder, not in the assessment JSON inbox.

## One-time parent setup: don't paste secrets into chat

A. **Preview deploy:** Cloudflare Pages previews feature branch `feature/drive-inbox-auto-ingest-v014`; verify `/api/sync` still loads existing progress. Verify Access protects the *actual* preview host for both HTML and `/api/intake`; branch previews and aliases can have separate hostnames.

B. **Cloudflare Access service token:** in Zero Trust → Access → Service Auth → Service Tokens create a dedicated token for this assessment bridge. Copy Client ID and Client Secret into a private password manager (secret shown once). Add to the matching Access application's policy a **Service Auth** policy that includes *this specific service token*; retain existing parent email Allow policy. Do not use a Bypass policy. Test that an unauthenticated visitor cannot access the endpoint. Without the service-token policy, Apps Script POST will be blocked at Access.

C. **Independent ingest secret:** generate a high-entropy random secret with at least 32 characters, store it in Cloudflare Pages → Settings → Variables and Secrets → **Preview** as **Secret** named `INGEST_SHARED_SECRET`. Do not set it as plain text frontend build variable, put it in GitHub, or share it in chat. Redeploy V0.14 preview after changing vars.

D. **Google Apps Script:** Visit [script.google.com](https://script.google.com/), create private Apps Script project, paste the source of [`cloud/drive-inbox-poller.gs`](./drive-inbox-poller.gs) into `Code.gs`. Go to Project Settings → Script properties and add:
   - `INBOX_FOLDER_ID`: `1u030Hgi8r3KmNQvnoi56algbL-ifySvo`
   - `PROCESSED_FOLDER_ID`: `10EMb0QCzGfz3LhVSb9dfbyWzX5Mnk1MH`
   - `INTAKE_URL`: `https://ACTUAL-PREVIEW-HOST.pages.dev/api/intake` (replace with exact verified host)
   - `ACCESS_CLIENT_ID`: from Access Service Token
   - `ACCESS_CLIENT_SECRET`: from Access Service Token, secret
   - `INGEST_SHARED_SECRET`: exact same independent secret as Cloudflare Preview.
   Save, then run `installTrigger` and complete Google authorization using the parent Google account allowed to access the Scans folder. Confirm trigger runs every five minutes.

E. **First smoke test:** upload a non-sensitive test JSON with valid source URL and unique ID to the inbox. Wait five minutes and confirm it moves to Processed; verify the Academic Record appears in V0.14, with no automatic mastery rating change. Test a pending recommendation from a separate test assessment and its Approve/Reject UI. Test duplicate delivery with same ID, verify no duplicate, test missing secret gets 401 and that 409 conflict protection stays intact. Ensure other devices auto-refresh. Archive/clean up test items via supported UI or backed-up state; don't manually edit D1 until backups verified.

## Security and caveats
- This repository is **public**. Never commit PDFs, assessment JSON, tokens, passwords or live learning data.
- Server endpoint contains only implementation logic. Cloudflare env Secret and private Apps Script properties hold credentials.
- The Pages Function checks a second ingestion secret even when Access's service-token policy is configured. Both checks are required. Do not weaken either.
- The endpoint validates Drive *URL syntax*, not the file's existence, ownership or sharing permissions. ChatGPT must verify an actual Drive upload result; no invented URLs.
- This poller requires a Google Apps Script time trigger and Google authorizations. **Simply deploying the GitHub branch does not activate automatic delivery.**
- Delivery latency typically up to several minutes. JSON that fails validation remains in inbox; investigate Apps Script Executions without exposing secrets. Duplicate deliveries are acknowledged without creating duplicate records.
- Existing app's `lille-hub-v1` JSON format is maintained, with optional `assessment_inbox`. Mastery proposals stay `pending` until the parent approves or rejects.
- Do not submit more real data while testing Access boundaries. Apps Script services and Cloudflare Free quotas may limit operation.
