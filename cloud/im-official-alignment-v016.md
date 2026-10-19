# Grade 4 IM curriculum parity — V0.16 preview

**Source:** User's official IM Grade 4 Unit Monitoring Sheets, nine unit PDFs, contained in `Grade4-Course-monitoring_sheet-Unit-pdf.zip` in the private Drive Curriculum Library. Section names, goal statements and unit sequence are derived from these official files. The monitoring sheets are the authoritative proficiency criteria; lesson titles remain reference material, **not separately graded skills**.

## Coverage

- 9 official units, 28 sections, **47 monitoring goals**.
- A single selectable proficiency rating (not assessed / needs support / developing / proficient / mastered) per official monitoring goal.
- Student assessments, PDF sources, comments, and history stay in `data.history` and `data.assessment_inbox` as evidence, not additional pseudo-skills.
- Historical user-defined rows and prior official lesson placeholders are preserved in `data.legacy_skills` rather than destroyed.

## Migration

1. Deploy preview `feature/im-official-monitoring-v016` and verify existing cloud revision is fully synchronized. Do NOT apply while other devices have pending edits.
2. Export a separate JSON backup before changing anything.
3. Click **Convert skills to official IM goals**. The browser offers another JSON backup download and explicit confirmation before changing the cloud record. It then archives every old skill row and replaces the active Math skill list with the official 47 goals.
4. Prior skill ratings with direct semantic matches are transferred to a source-aligned goal; each goal's note retains the original skill IDs, names, statuses and notes. When more than one legacy rating maps to one broad IM goal, the **lower** rating wins until the parent reviews supporting evidence.
5. Custom ratings with no defensible mapping, such as **Equal-group word problems** under Unit 1, or rated lesson-specific placeholders, are retained in the legacy archive and flagged for manual review. The system does not invent matches.
6. Mastery suggestions in previously imported assessments are pointed at their mapped official goals where a unique mapping exists. The intake endpoint likewise accepts the mapped historical IDs; new ChatGPT assessments should use official `im-uN-section-index` IDs.
7. New devices load the official catalog and stored ratings from the same existing D1 record. Schema remains `lille-hub-v1` with optional `curriculum_alignment` and `legacy_skills`, so no destructive D1 migration is required.
8. Rolling back requires a deliberate restore of the exported pre-migration JSON or an existing D1 backup. **Do not overwrite the cloud automatically** or merge without verifying all prior records.

## Legacy crosswalk

| Prior custom ID | Official IM goal |
|---|---|
| prime | U1 §A goal 1: determine prime or composite |
| factors / multiples | U1 §B goal 1: find factor pairs and multiples; lower of both ratings if they disagree |
| equiv | U2 §B goal 1: generate equivalent fractions |
| compare | U2 §C goal 1: compare fractions |
| numberline | U2 §A goal 2: locate fractions on number line |
| fractionmodels | U2 §A goal 1: interpret fractions in physical models |
| add / subtract | U3 §B goal 3: add and subtract fractions with like denominators |
| groups and unmatched custom/lesson records | Archived for manual review; no guessed proficiency transfer |

An assessment showing independent success is evidence for possible future parent proficiency edits, not an automatic mastery change.

## Drive extraction status

**Five of six ZIPs** were downloaded into a temporary processing container for inspection and safely decompressed. They include 35 unit reference PDFs and nine teacher-guide PDFs. The source ZIPs are unchanged.

Direct Drive upload of extracted PDFs failed with `container_session_expired`; one Unit 1 monitoring sheet was successfully uploaded through a supported file-reference workaround. **The Drive extraction is NOT complete.**

The sixth ZIP `Grade4-downloadable_materials-pdf.zip` is approximately **1.08 GB**, larger than the connected service's 256 MB download limit. A streaming organizer notebook is included at `tools/IM_Grade4_Drive_Organizer.ipynb`. Run that once in Google Colab with the parent account; it mounts the user's Drive, copies ZIP archives to Colab disk, safely extracts to `IM Grade 4 - Extracted / Unit NN / [document type]`, groups lesson items into section/lesson folders based on file names where available, and leaves original archives unchanged. The notebook avoids Drive/GitHub storage of private learner assessment data.

The app does **not** assume the unzipping succeeded until the parent runs and verifies the notebook.

## Test checklist

- Preview loads current cloud master; old rated skills and history remain visible before conversion.
- Make a manual JSON backup and migrate.
- Exactly 47 official goal rows appear. No custom row or lesson placeholder remains in the active skill table.
- Unit 1 factors/multiples merges conservatively; archived raw statuses remain inspectable.
- Unit 2 and Unit 3 mapped notes and ratings are correct; ambiguous older statuses remain preserved.
- An unchanged Academic Record PDF link still works.
- Edit one new goal; cloud revision advances and another device receives it.
- Verify automation can append an assessment without changing proficiency; any proposed rating requires explicit parent approval.
- Check any stale/unconverted devices do not overwrite the new cloud revision; existing 409 protection should block mismatched revisions.

For lesson-level curriculum metadata, use the official `Unit At A Glance` and teacher guides instead of inventing per-lesson mastery ratings.
