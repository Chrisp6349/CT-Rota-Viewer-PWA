/* =====================================================
   Cardiothoracic Theatre Viewer
   cadence-config.js
   -----------------------------------------------------
   The ONE file to edit for connecting this viewer to
   Cadence:
     - which Cadence department this viewer shows
     - the shared, read-only "viewer" account this app
       signs into automatically in the background, so
       ODPs never see a login screen - the same pattern
       Cadence's own corridor board uses for its shared
       "board" login.

   PROJECT_ID and API_KEY are Cadence's public Firebase web
   config (same values as its own firebase-config.js) - not
   secrets. Firebase's security model is enforced by
   Firestore's rules and the account's role, not by hiding
   this. VIEWER_EMAIL/VIEWER_PASSWORD are real Firestore
   credentials though, and belong to whoever can already
   open the live viewer URL today - no worse than that.
   ===================================================== */

const CADENCE = {
    PROJECT_ID: "cadence-theatre-rota",
    API_KEY: "AIzaSyCihd7OTCEwVFE941xaIn5bOmOOy9xLezw",
    DEPARTMENT_ID: "cardiac",

    VIEWER_EMAIL: "cardiactheatre@nhs.net",
    VIEWER_PASSWORD: "cardiac1234"
};
