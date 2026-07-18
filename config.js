/* =====================================================
   Cardiothoracic Theatre Viewer
   config.js
   -----------------------------------------------------
   The one file to edit when things change:
   - the backend URL
   - which anaesthetists show the female doctor emoji

   Anyone NOT in FEMALE_ANAES gets the male emoji, so a
   new female anaesthetist should be added to this list
   (as well as to the rota manager's dropdown).
   ===================================================== */

const CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbwibS_YU3P7Gf0dnbZJH7gE1_FjjfCIt_jsJ05HcZ8QzQVJjb2fhQOIb8VIoaS2GgTa/exec"
};

// Anaesthetists shown with the female doctor emoji
const FEMALE_ANAES = ["ZB", "NM", "LC", "PJ", "JH", "TB", "MC"];

// Returns the right doctor emoji for an anaesthetist's initials
function anaesEmoji(initials) {
    return FEMALE_ANAES.includes(String(initials).trim())
        ? "👩‍⚕️" : "👨‍⚕️";
}
