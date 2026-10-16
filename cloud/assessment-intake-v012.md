# V0.12 — Assessment intake test

## Intended process
1. Parent uploads Lille's completed PDF in ChatGPT.
2. ChatGPT analyzes the work, including answer accuracy, whether work was independent or guided, observations, and potential mastery recommendations.
3. When the Google Drive connector is available for upload, ChatGPT archives the original PDF in the private Scans folder (not GitHub), and returns its actual Drive URL. If a document cannot be uploaded, stop here: do not invent a URL.
4. ChatGPT produces `lille-assessment-v1` JSON as a downloadable file (or structured content). Parent opens the protected V0.12 preview and clicks **Import assessment JSON**. This is an explicit handoff, **not automatic ChatGPT-to-Cloudflare delivery**.
5. The application validates the payload, checks duplicates, appends evidence to the Academic Record and the assessment inbox, and syncs it to D1 using the existing Access-authenticated, revision-checked `/api/sync` endpoint. No mastery ratings are changed.
6. The Parent Dashboard shows each recommended mastery change with the existing rating, proposed rating, rationale, and original Drive link. Only the parent clicking **Approve** updates that rating. **Reject** preserves the original rating and logs the decision. Both actions sync through the existing revision protection.

## Assessment JSON format
```json
{
  "schema": "lille-assessment-v1",
  "id": "2026-10-16-example-unique",
  "date": "2026-10-16",
  "title": "Completed factor pairs practice",
  "summary": "Evidence summary, accuracy and assistance conditions",
  "source_url": "https://drive.google.com/file/d/ACTUAL_DRIVE_ID/view",
  "source_title": "2026-10-16_factor-pairs_completed.pdf",
  "observations": ["Specific evidence from the answers", "Misconception or next step"],
  "proposals": [{"skill_id":"factors","suggested_status":"developing","rationale":"Reason tied to assessed independent performance"}]
}
```
The `id` should be unique per original assessment and remain stable across retries. Proposals may be an empty array. Refer to `data.skills[].id` for valid skill identifiers; do not invent a skill ID. Use only real Drive links. JSON must not contain the PDF bytes.

## Security/implementation boundaries
- **No ChatGPT-to-Cloudflare write integration exists yet.** This version provides parent-mediated import with the same private Cloudflare Access credentials as the existing browser session. To remove the manual JSON import, a dedicated authenticated machine-to-machine integration or an approved connector action must be supplied; never expose a write token in public frontend code, GitHub, or a chat transcript.
- The Google Drive connector upload is available when a compatible file reference is supplied; the app itself does not have Drive credentials and does not upload PDFs to Google Drive.
- Existing cloud JSON schema remains `lille-hub-v1`. New optional array `assessment_inbox` is added. Existing records and backups are retained.
- The app refuses intake while cloud status isn't ready. Revision 409 conflicts halt overwrites; retain a separate JSON backup in all conflict scenarios.
- D1 history snapshots already exist via `hub_backups` but successful server-side rollback has **not** yet been tested. Verify Access protection on every preview hostname before entering student data.
- The browser checks the Drive URL's HTTPS host, not that the file exists or that Drive permissions are correct. Confirm private Drive permissions independently.
- Automated educational grading must be checked against the actual uploaded pages. If unclear, explicitly mark as unassessed, not a confident score.

## Test checklist
- Load existing synced V0.11 data in V0.12 preview; verify identical mastery/history first.
- Create a small test assessment JSON with a **real privately archived PDF URL**, valid skill ID and unique ID.
- Import once: Academic Record evidence appears, mastery stays unchanged, cloud revision advances.
- Open second device: assessment evidence appears, still without mastery change.
- Duplicate import is rejected.
- Click Reject on one proposal: proposal disappears from pending, mastery remains unchanged.
- Import a new assessment; click Approve on a proposal: rating changes, decision persists across devices and D1 revision increases.
- Verify concurrent edits produce 409 rather than data loss.

## Future hands-free step
A separate protected ingestion service can validate a signed assessment event, verify the Google Drive file ID, and transactionally append to D1. That service needs a credential the ChatGPT environment can use without revealing it to the web client. It must also define a reliable retry/idempotency mechanism and an explicit parent approval barrier. This feature branch does **not** pretend to offer that service.
