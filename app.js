/* =====================================================
   Cardiothoracic Theatre Viewer
   app.js
   -----------------------------------------------------
   Page controller for the daily dashboard (index.html):
   - loads the latest published rota on startup
   - archive navigation (dropdown + prev/next arrows)
   - splash screen (hides when the data has loaded)
   - update banner + footer refresh button

   Rendering itself lives in viewer.js; fetching lives
   in api.js.
   ===================================================== */

/* ==========================================
   Startup and navigation
========================================== */

document.addEventListener("DOMContentLoaded", async () => {

    const loading = document.getElementById("loading");
    const error = document.getElementById("error");
    const previousBtn = document.getElementById("prevWeek");
    const nextBtn = document.getElementById("nextWeek");
    const weekSelect = document.getElementById("weekSelect");

    let publishedWeeks = [];
    let currentIndex = 0;

    // Hides the splash screen. Called once the first load finishes
    // (success OR failure), so the splash reflects reality instead
    // of a fixed timer.
    function hideSplash() {
        const splash = document.getElementById("splash-screen");
        if (splash) splash.classList.add("hidden");
        document.body.classList.remove("loading");
    }

    // If the loaded week is the CURRENT week, open on today's tab -
    // that's what someone glancing at the board wants. For any other
    // (past/future) week, Monday is the sensible start.
    function defaultDayFor(week) {
        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday",
                          "Thursday", "Friday", "Satur
