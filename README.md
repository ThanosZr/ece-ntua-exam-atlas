# ΣΗΜΜΥ ΕΜΠ — Winter Exam Atlas 2024–2027

Static web app for comparing the official ECE NTUA winter examination schedules.

## What is included

- **Κανονική / Πτυχιακή (Επί πτυχίω) / Συνδυασμός**
- source-year filters: **2024 / 2025 / 2026 / 2027**; opens with **2026 + 2027**
- filters by **study year**, **semester**, **core / flow**, **specific flow**, and **exam time**
- full-text course search
- highlight and **true isolation** of a selected course
- custom SVG alluvial view with course names **outside** the flow field
- actual **date + time per year** on each node
- course inspector showing each selected year's date, time and normalized exam-day number
- calendar view
- full data table
- patterns view for calendar-day movement from each program's start and consistency of all time slots
- source / validation view
- CSV export of the currently filtered dataset
- no framework, no backend, no build step, no external JavaScript dependency

## Project structure

```text
index.html
styles.css
app.js
metadata.js
build-validation.js
data.csv
validation.json
validation-report.txt
data/
  regular-2024.js
  regular-2025.js
  regular-2026.js
  regular-2027.js
  degree-2024.js
  degree-2025.js
  degree-2026.js
```

The schedule data are deliberately split by **program + year**, so corrections are isolated. For example, a correction in the 2025 regular exam schedule only requires editing `data/regular-2025.js`.

## GitHub Pages — new branch

1. Create a new branch, e.g. `exam-atlas-v3`.
2. Upload **the contents of this folder**, not the ZIP itself, to the root of that branch.
3. Go to **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select branch `exam-atlas-v3` and folder `/(root)`.
6. Save and wait for the Pages deployment to finish.

If the repository is `AthanZour/ece-exam-pattern`, the URL will remain:

`https://athanzour.github.io/ece-exam-pattern/`

GitHub Pages serves whichever branch is selected as the Pages source.

## Validation

Run locally, if desired:

```bash
node build-validation.js
```

It regenerates:

- `data.csv`
- `validation.json`

The current dataset contains **654 schedule entries** and **206 unique canonical course names**, with no exact duplicate rows and no unmapped course metadata. The 2027 regular schedule contains **90 entries / 89 courses**, from **18 January to 12 February 2027**, using the official **20 November 2026** edition. No 2027 degree schedule is included; that year is disabled in the degree-only view.

Run the schedule regression checks with `node test-schedules.js`. See `WINTER_2027_CHANGES.md` for the comparison with 2026. The Patterns view measures elapsed calendar days from the start of each complete program, before filters, so an extra examination day does not shift every later course artificially. The inspector's exam-day number still counts dates with entries.

## Important source notes

- The official **February 2024 degree / επί πτυχίω** schedule was published in March 2024 and its actual examination dates are **1–18 April 2024**. The app uses those actual dates.
- The official 2026 degree schedule contains **Μεταγλωτιστές** on both **29/01/2026** and **03/02/2026**. The app deliberately preserves both published entries and flags the multi-date occurrence in Validation instead of silently guessing which one is intended.

See `SOURCE_CHECK.md` for source links and source-handling notes.
