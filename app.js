/* =====================================================
   Cardiothoracic Theatre Viewer
   app.js
   Version 1.0.1

   Handles:
   - Current week loading
   - Archive navigation
   - Previous / Next controls
   ===================================================== */

document.addEventListener("DOMContentLoaded", async () => {

    const loading = document.getElementById("loading");
    const error = document.getElementById("error");

    
    const previousBtn = document.getElementById("prevWeek");
    const nextBtn = document.getElementById("nextWeek");
    const weekSelect = document.getElementById("weekSelect");

    let publishedWeeks = [];
    let currentIndex = 0;

    async function showLatest() {

        loading.classList.remove("hidden");
        error.classList.add("hidden");

        try {

        const rota = await RotaAPI.loadRota();

rota.week = String(rota.week).substring(0,10);

const idx = publishedWeeks.findIndex(
    w => w.week === rota.week
);

if (idx >= 0) {
    currentIndex = idx;
    if (weekSelect) {
        weekSelect.selectedIndex = idx;
    }
}

console.log("ROTA:", rota);
Viewer.render(rota);       } catch (err) {

            console.error(err);
            error.classList.remove("hidden");

        } finally {

            loading.classList.add("hidden");

        }

    }

   async function showWeek(week) {

    week = String(week).substring(0,10);

    loading.classList.remove("hidden");
    error.classList.add("hidden");

    try {

        const rota = await RotaAPI.loadWeek(week);

rota.week = String(rota.week).substring(0,10);

console.log("ROTA:", rota);
Viewer.render(rota);        } catch (err) {

            console.error(err);
            error.classList.remove("hidden");

        } finally {

            loading.classList.add("hidden");

        }

    }

    async function loadArchive() {

        try {

            publishedWeeks = await RotaAPI.loadPublishedWeeks();
publishedWeeks = [...new Map(

    publishedWeeks.map(item => [
        String(item.week).substring(0,10),
        {
            ...item,
            week: String(item.week).substring(0,10)
        }
    ])

).values()]

.sort((a,b)=>a.week.localeCompare(b.week));           if (!weekSelect) return;

            weekSelect.innerHTML = "";

            publishedWeeks.forEach((item) => {

    const option = document.createElement("option");

    const week = String(item.week).substring(0, 10);

    option.value = week;

  option.textContent = `W/C ${ViewerUtils.formatWeek(week)}`;
    weekSelect.appendChild(option);

});
            if (publishedWeeks.length > 0) {

                currentIndex = publishedWeeks.length - 1;

                weekSelect.selectedIndex = currentIndex;

            }

        } catch (err) {

            console.error(err);

        }

    }

  

    



  previousBtn.onclick = () => {

    if (currentIndex > 0) {

        const container = document.getElementById("rotaContainer");

        container.classList.add("slide-right");

        setTimeout(async () => {

            currentIndex--;

            weekSelect.selectedIndex = currentIndex;
           window.selectedDay = "Monday";

            await showWeek(
                String(publishedWeeks[currentIndex].week).substring(0,10)
            );

            container.classList.remove("slide-right");

        },200);

    }

};

   nextBtn.onclick = () => {

    if (currentIndex < publishedWeeks.length - 1) {

        const container = document.getElementById("rotaContainer");

        container.classList.add("slide-left");

      setTimeout(async () => {

    currentIndex++;

    weekSelect.selectedIndex = currentIndex;

    window.selectedDay = "Monday";

    await showWeek(
        String(publishedWeeks[currentIndex].week).substring(0,10)
    );

    container.classList.remove("slide-left");

},200);

    }

};
    if (weekSelect) {

       weekSelect.onchange = () => {

    currentIndex = weekSelect.selectedIndex;

    window.selectedDay = "Monday";

    showWeek(
        String(publishedWeeks[currentIndex].week).substring(0,10)
    );

};    }

    await loadArchive();


const savedWeek = sessionStorage.getItem("viewerWeek");
const savedDay = sessionStorage.getItem("viewerDay");

if (savedWeek) {

    const idx = publishedWeeks.findIndex(
        w => w.week === savedWeek
    );

    if (idx >= 0) {

        currentIndex = idx;

        weekSelect.selectedIndex = idx;

        window.selectedDay = savedDay || "Monday";

        sessionStorage.removeItem("viewerWeek");
        sessionStorage.removeItem("viewerDay");

        await showWeek(savedWeek);

        return;

    }

}


    // Work out the Monday of the current week
const today = new Date();

const currentMonday = new Date(today);

const day = currentMonday.getDay();

const diff = day === 0 ? -6 : 1 - day;

currentMonday.setDate(currentMonday.getDate() + diff);

const weekString = currentMonday.toISOString().substring(0,10);

// Look for a published rota for this week
const idx = publishedWeeks.findIndex(w => w.week === weekString);

if (idx >= 0) {

    currentIndex = idx;

    weekSelect.selectedIndex = idx;

    // Automatically open today's day
const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday"
];

window.selectedDay = dayNames[new Date().getDay()];   await showWeek(weekString);

} else {

    await showLatest();

}
});
/* ==========================================
   Hide Splash Screen
========================================== */

window.addEventListener("load", () => {

    const splash = document.getElementById("splash-screen");

    if (!splash) return;

    setTimeout(() => {

        splash.classList.add("hidden");

        document.body.classList.remove("loading");

    }, 1800);

});

/* ==========================================
   Smart Update System
========================================== */

const UpdateUI = {

    banner: null,

    create() {

        if (this.banner) return;

        this.banner = document.createElement("div");
        this.banner.id = "updateBanner";

        this.banner.innerHTML = `
            <div class="update-card">
                <div class="update-title">
                    🚀 Update Available
                </div>

                <div class="update-text">
                    A newer version of Cardiac Theatre Dashboard is ready.
                </div>

                <button id="refreshApp">
                    Refresh Now
                </button>
            </div>
        `;

        this.banner.style.display = "none";

        document.body.appendChild(this.banner);

       const refreshButton = document.getElementById("refreshApp");

refreshButton.addEventListener("click", async () => {

    const registration =
        await navigator.serviceWorker.getRegistration();

    if (registration && registration.waiting) {

        let refreshing = false;

        navigator.serviceWorker.addEventListener("controllerchange", () => {

            if (refreshing) return;

            refreshing = true;

            window.location.reload();

        });

        registration.waiting.postMessage({
            type: "SKIP_WAITING"
        });

    } else {

        window.location.reload();

    }

});

    },

    show() {

        if (!this.banner) return;

        this.banner.style.display = "block";

    },

    hide() {

        if (!this.banner) return;

        this.banner.style.display = "none";

    }

};

document.addEventListener("DOMContentLoaded", () => {

    UpdateUI.create();

});

document.addEventListener("DOMContentLoaded", () => {

    UpdateUI.create();

    const refreshBtn = document.getElementById("refreshAppBtn");

    if (!refreshBtn) return;

    refreshBtn.addEventListener("click", async () => {

        refreshBtn.style.transform = "rotate(360deg)";

        try {

            const registration =
                await navigator.serviceWorker.getRegistration();

            if (registration) {
                await registration.update();
            }

        } catch (err) {

            console.error("Refresh check failed:", err);

        }

        setTimeout(() => {

            refreshBtn.style.transform = "";

            window.location.reload();

        }, 500);

    });

});
