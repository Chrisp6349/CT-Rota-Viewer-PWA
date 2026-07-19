# Cardiac Theatre Dashboard

The live rota viewer for Cardiothoracic Theatres, Derriford Hospital.
Shows the published weekly allocations, who is on call right now, a
full-week board, a TV wall-board mode, and per-person "My Week" views.

**Live app:** https://chrisp6349.github.io/CT-Rota-Viewer-PWA/

Data comes from the Rota Manager app (separate repository), which
publishes to a shared Google Sheet. This app is **read-only** — it
never edits rota data.

---

## ⚠️ The golden rule

**Every time any file in this repository changes, bump the version
number in `version.js`** (e.g. `"3.4.1"` → `"3.4.2"`).

The version number controls the offline cache. Without a bump,
phones and installed apps will keep showing the OLD version forever.
Nothing else makes updates reach people's devices.

---

## Routine maintenance

All routine changes happen in **`config.js`** (then bump `version.js`):

| When | What to edit |
|---|---|
| New female anaesthetist joins | Add initials to `FEMALE_ANAES` |
| New year's bank holidays announced | Update the `BANK_HOLIDAYS` date list |
| Backend/Apps Script URL changes | Update `CONFIG.API_URL` |

New staff **names** are added in the Rota Manager's config, not here —
this app picks up names automatically from published data.

Bank holidays must also be updated in the Rota Manager's config
(it has its own list for the red day labels).

## On-call rules encoded in the app

All handovers happen at **06:30**. (Logic lives in `oncall-now.js`.)

- **Mon–Fri:** 19:00 → 06:30 next morning (including Friday night)
- **Saturday:** 06:30 Sat → 06:30 Sun
- **Sunday:** 06:30 Sun → 06:30 Mon
- **Weekend AM/PM split:** AM = 06:30–18:30, PM = 18:30–06:30
- **Bank holidays:** 06:30 → 06:30 next morning (weekend-style),
  using that weekday's on-call entry; the dashboard shows a
  "Bank Holiday Cover" page instead of the theatre grid

## How to make changes safely

Never edit this live repository directly for anything experimental.

1. Create a copy repository (e.g. `CT-Rota-Viewer-PWA-Dev`) with the
   same files and enable GitHub Pages on it
2. Build and test changes there
3. When happy, copy the changed files here and bump `version.js`

`CT-Rota-Viewer-PWA-Old` contains the pre-redesign version as a backup.

## File map

| File | Purpose |
|---|---|
| `config.js` | **Edit this one.** API URL, female anaesthetists, bank holidays |
| `version.js` | **Bump this on every change.** Single version number |
| `index.html` / `app.js` / `viewer.js` | Daily dashboard |
| `oncall-now.js` | ON CALL NOW card + all on-call hour rules |
| `myweek.js` | "My Week" personal rota |
| `week.html` / `week.js` / `week.css` | Full-week board |
| `tv.html` / `tv.js` | Wall-board mode |
| `features.css` | Styling for newer features + dark mode |
| `styles.css` / `clinical.css` | Original dashboard styling |
| `service-worker.js` | Offline support + update mechanism |
| `api.js` | All communication with the Google Sheet backend |

## Troubleshooting

- **Someone sees an old version:** tap the 🔄 button in the footer.
  Still stuck: Safari → Settings → Advanced → Website Data → delete
  this site's data, then reopen.
- **"Unable to load rota":** check the Rota Manager can still save —
  if both fail, the Google Apps Script backend is the problem.
- **Wrong person shown on call:** check the published rota is correct
  first; if the rota is right but the time logic is wrong, the rules
  are in `oncall-now.js`.
