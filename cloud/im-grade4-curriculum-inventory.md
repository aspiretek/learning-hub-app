# IM Grade 4 official proficiency alignment — verified 2026-10-19

## Organized Google Drive library

- Original grade 4 Math folder: https://drive.google.com/drive/folders/1fcilFl4R0oeOJbVa_B66L2kOhbvPhNwd
- Organized original (same Drive file IDs, moved/renamed, not copies): https://drive.google.com/drive/folders/1ndGxTUBsi1xWu03XG8Kxjf1zCnmeh8Dc
- Nine folders: Unit 01 through Unit 09.
- Verified inventory: 44 PDF files: 9 Monitoring Sheets, 9 Teacher Guides, 9 Unit at a Glance, 9 Family Support Materials, 8 Center Overviews (Units 1–8).
- These are the 44 **unzipped PDFs the parent uploaded**; the distinct large downloadable lesson-materials ZIP was **not** part of this set.
- Folder move preserved each PDF's existing Google Drive ID; the files are not republished in GitHub. Original ZIP archives untouched.
- File titles standardized per unit as `IM Grade 4 - Unit N - <Document Type>.pdf`.

## Proficiency model

The authoritative rows are the actual goals in each Grade 4 *Unit Monitoring Sheet*: 47 monitoring goals across 28 sections and nine units. Unit/section and goal text is in `im-monitoring-catalog.js`. Every goal stores a source URL pointing to its original Drive monitoring sheet. Teacher guides and lesson documents are **reference/evidence sources**, not individual proficiency rows.

The Parent Dashboard exposes these monitoring-sheet links at unit headings, uses compact inline editing and search, and shows status per goal.

## Migration safety

- Cloud data is **not modified by deploying this branch**.
- Parent must explicitly click **Convert skills to official IM goals**, after validating a JSON backup exists, while status is Synced.
- Existing `data.skills` are preserved verbatim in `data.legacy_skills` within cloud-synced JSON; historical assessment records, document links, tasks, and original values are retained.
- Mapped old custom statuses conservatively transfer to official monitoring objectives. When multiple old statuses map to one goal, the weakest assessed status is used and source notes retained.
- Unmatched assessed custom skill rows are flagged for manual review, not guessed.
- Past pending assessment proposals with recognized old skill IDs map to official goal IDs; unrecognized proposals remain in history and require review.
- Cloud revision protection and D1 backup mechanism stay in place. The migration has not been committed on user's live cloud by this change.
- Never auto-promote a monitoring goal to Mastered solely from a guided practice or one test.
