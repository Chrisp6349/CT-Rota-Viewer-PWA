/* =====================================================
   Cardiothoracic Theatre Viewer
   config.js
   -----------------------------------------------------
   The one file to edit when things change:
   - the backend URL
   - the bank holiday dates (update each year)
   ===================================================== */

const CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbwibS_YU3P7Gf0dnbZJH7gE1_FjjfCIt_jsJ05HcZ8QzQVJjb2fhQOIb8VIoaS2GgTa/exec"
};

// Bank holidays - on these dates the weekday on-call runs like a
// weekend shift: 06:30 -> 06:30 next morning instead of from 19:00.
// Update this each year (same dates as the rota manager's config).
const BANK_HOLIDAYS = [
    "2026-01-01", "2026-04-03", "2026-04-06", "2026-05-04",
    "2026-05-25", "2026-08-31", "2026-12-25", "2026-12-28"
];

function isBankHoliday(iso) {
    return BANK_HOLIDAYS.includes(iso);
}
// Full names for anaesthetists' initials, used only in Insights fun
// facts where there's room to spell things out (everywhere else in
// the app stays compact with initials, e.g. theatre cards).
const ANAES_NAMES = {
    "SE": "Sean",
    "PJ": "Patrycja",
    "CD": "Craig D",
    "CH": "Craig H",
    "TG": "Tharanga",
    "JH": "Jenny",
    "NM": "Nilofer",
    "PMR": "Pete",
    "VR": "Vlad",
    "ZB": "Zuzana",
    "JA": "Jonathan",
    "TB": "Theresa",
    "MC": "Michelle",
    "SB": "Steve B",
    "AMINU": "Aminu",
    "JC": "James",
    "LC": "Leena"
};

// Returns the full name for an anaesthetist's initials, or the
// initials themselves if not found in the list above
function anaesName(initials) {
    const key = String(initials).trim();
    return ANAES_NAMES[key] || key;
}


// Kept as a no-op so every existing `${anaesEmoji(x)} ${x}` call site
// still works untouched - initials alone (PMR, CD, SE...) already read
// as clearly distinct from full ODP names without a doctor icon.
function anaesEmoji() {
    return "";
}
// Master list of all ODPs
const ODP_NAMES = [
    "Amelia",
    "Becky",
    "Chris",
    "Darren",
    "Dave",
    "Greg",
    "Kristian",
    "Larry",
    "Mihaela",
    "Pierre",
    "Steve"
];
