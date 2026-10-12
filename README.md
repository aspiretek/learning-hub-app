# Lille's Learning Hub — Local V0.1

A static one-file website. No accounts, database, or cloud storage for learning records.

## Publish using GitHub Pages
1. Create a **new public repository** for the generic app code (for example `learning-hub-app`). Do **not** commit Lille's personal progress updates or backups.
2. Upload `index.html` to the repository root.
3. Go to **Settings → Pages → Build and deployment**, select **Deploy from a branch**, branch `main`, root `/`, then Save.
4. Open the Pages URL GitHub provides. Test navigation and local saving in Safari.
5. On Lille's iPad, open the URL in Safari and choose **Share → Add to Home Screen**.
6. Use only Lille's iPad for permanent records. Import updates there; do not assume data on your phone will be shared.

## Testing before real use
- In **My Week**, check an activity and confirm the count changes.
- Reload Safari, confirm it is still checked.
- In **Parent View**, change a skill status and confirm it persists after reloading.
- Select **Export backup** and save the JSON to Files, ideally an offline or iCloud Drive backup outside the browser.
- Test **Import backup** to restore a previous snapshot.

## Important privacy and reliability notes
- The deployed code is publicly viewable on GitHub Pages. It contains only generic demonstration starter records. Do not embed actual student assessments or personal records into HTML or a public repository.
- Learning information is stored only using browser `localStorage` on that device, for that exact website origin. Clearing website data or uninstalling a Home Screen web app may erase it.
- Browser storage is **not** a reliable permanent archive. Export backups after meaningful updates and save them outside Safari.
- Browsers and iOS can isolate Home Screen storage from Safari storage. After installation, perform imports and updates inside the Home Screen app consistently.
- The app is *not password protected*. Anyone with access to the unlocked designated iPad may view its contents.
- Do not install service workers or add analytics for this first release.

## ChatGPT update import schema
After reviewing printed work in ChatGPT, request a `lille-hub-update-v1` JSON file. It uses **known skill IDs** from the dashboard, so records cannot silently assign changes to an unrelated skill.

Example:
```json
{
  "schema":"lille-hub-update-v1",
  "skill_updates":[
    {"id":"equiv","status":"proficient","note":"Independent checkup 8/10 on Oct 18; verify across another checkup."}
  ],
  "history_additions":[
    {"date":"2026-10-18","title":"Equivalent fractions review","result":"8/10 independent"}
  ]
}
```
Always review the generated file before importing. The app requests confirmation before applying it. Imported changes remain only on the iPad.

## Next iteration
- Add editable curriculum weeks and task descriptions
- Keep dated evidence entries separate from skill status
- Make progress view more visually polished and customizable
- Upgrade from localStorage to IndexedDB if storage needs grow
