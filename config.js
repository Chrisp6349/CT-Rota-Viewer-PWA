/* =====================================================
   Cardiothoracic Theatre Viewer
   config.js
   -----------------------------------------------------
   The one file to edit when things change:
   - the backend URL
   - which anaesthetists show the female doctor emoji
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

// Anaesthetists shown with the female doctor emoji
const FEMALE_ANAES = ["ZB", "NM", "LC", "PJ", "JH", "TB", "MC"];

// Returns the right doctor emoji for an anaesthetist's initials
function anaesEmoji(initials) {
    return FEMALE_ANAES.includes(String(initials).trim())
        ? "👩‍⚕️" : "👨‍⚕️";
}
