/* =====================================================
   Cardiothoracic Theatre Viewer
   api.js
   -----------------------------------------------------
   Reads the published ODP/anaesthetist rota straight from
   Cadence (Firestore), via the shared read-only "viewer"
   account in cadence-config.js.

   Cadence stores each week as flat keys
   ("Monday_<theatreId>_odp1", "Saturday_oncall_odp1" etc -
   the same shape the old Google Sheets backend used, per
   Cadence's own rota.js). buildViewerShape() below turns
   that into the {week, days:{...}} structure every other
   file in this app already expects (viewer.js, oncall-
   now.js, myweek.js, week.js, calendar.js, staff.js,
   insights.js, tv.js) - none of them needed to change.
   ===================================================== */

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

// Turns Cadence's flat rota keys + the department's own theatre list
// (CADENCE_THEATRES from config.js: [{id, name}, ...]) into the same
// nested viewer shape the old Google Sheets backend used to publish.
function buildViewerShape(week, flatData, theatres) {
    const data = flatData || {};
    const out = { week, days: {} };

    DAYS.forEach(day => {
        if (day === "Saturday" || day === "Sunday") {
            out.days[day] = {
                weekend: true,
                onCall: {
                    odp1: data[`${day}_oncall_odp1`] || "",
                    session1: data[`${day}_oncall_session1`] || "",
                    odp2: data[`${day}_oncall_odp2`] || "",
                    session2: data[`${day}_oncall_session2`] || "",
                    anaesthetist: data[`${day}_oncall_anaes`] || ""
                },
                waitingList: {
                    odp: data[`${day}_wl_odp`] || "",
                    anaesthetist: data[`${day}_wl_anaes`] || ""
                }
            };
        } else {
            out.days[day] = {
                theatres: theatres.map(t => ({
                    theatre: t.name,
                    odp1: data[`${day}_${t.id}_odp1`] || "",
                    odp2: data[`${day}_${t.id}_odp2`] || "",
                    anaesthetist: data[`${day}_${t.id}_anaes`] || "",
                    list: data[`${day}_${t.id}_list`] || ""
                })),
                support: {
                    odp1: data[`${day}_support1`] || "",
                    odp2: data[`${day}_support2`] || "",
                    odp3: data[`${day}_support3`] || "",
                    list: data[`${day}_support_list`] || ""
                },
                onCall: {
                    odp: data[`${day}_oncall_odp`] || "",
                    extra: data[`${day}_oncall_extra`] || "",
                    anaesthetist: data[`${day}_oncall_anaes`] || "",
                    // Cadence renamed this field from the old
                    // "<day>_fromhome" to "<day>_oncall_home".
                    fromHome: !!data[`${day}_oncall_home`]
                }
            };
        }
    });

    return out;
}

class RotaAPI {

    static normalizeWeek(week) {
        return String(week).substring(0, 10);
    }

    // Short-lived cross-page cache (sessionStorage). Every page here is
    // a separate document, so without this, going Dashboard -> Full
    // Week View -> back (or -> On Call Calendar -> back) re-fetched
    // data that had just loaded seconds earlier. Kept short since this
    // is the live rota, not analytics - a genuine change is still
    // visible within a minute regardless of which page you're on.
    static CACHE_KEY = "rota_api_cache_v1";
    static CACHE_TTL_MS = 60 * 1000;

    static getCached(key) {
        try {
            const store = JSON.parse(sessionStorage.getItem(RotaAPI.CACHE_KEY) || "{}");
            const entry = store[key];
            if (entry && (Date.now() - entry.fetchedAt) < RotaAPI.CACHE_TTL_MS) return entry.data;
        } catch (e) { /* corrupt or inaccessible cache - just refetch */ }
        return null;
    }

    static setCached(key, data) {
        try {
            const store = JSON.parse(sessionStorage.getItem(RotaAPI.CACHE_KEY) || "{}");
            store[key] = { fetchedAt: Date.now(), data };
            sessionStorage.setItem(RotaAPI.CACHE_KEY, JSON.stringify(store));
        } catch (e) { /* storage full or unavailable (e.g. private browsing) - fine to skip */ }
    }

    // Every published week, oldest -> newest. Cadence's week documents
    // are keyed by the week's own Monday ("2026-07-27"), so the doc ID
    // is already the date - no separate "week" field to read.
    static async loadPublishedWeeks() {
        const cached = RotaAPI.getCached("archive");
        if (cached) return cached;

        const weeks = await CadenceFirestore.listCollection(
            `departments/${CADENCE.DEPARTMENT_ID}/weeks`
        );

        const result = weeks
            .filter(w => w.published)
            .map(w => ({ week: RotaAPI.normalizeWeek(w.id) }))
            .sort((a, b) => a.week.localeCompare(b.week));

        RotaAPI.setCached("archive", result);
        return result;
    }

    // The most recently published week (what the dashboard shows by default)
    static async loadRota() {
        const cached = RotaAPI.getCached("viewer");
        if (cached) return cached;

        const weeks = await RotaAPI.loadPublishedWeeks();
        if (!weeks.length) throw new Error("No published weeks yet");

        const rota = await RotaAPI.loadWeek(weeks[weeks.length - 1].week);
        RotaAPI.setCached("viewer", rota);
        return rota;
    }

    // One specific published week
    static async loadWeek(week) {
        const normalized = RotaAPI.normalizeWeek(week);
        const cacheKey = "week:" + normalized;
        const cached = RotaAPI.getCached(cacheKey);
        if (cached) return cached;

        await CadenceData.ready; // needed for CADENCE_THEATRES
        const doc = await CadenceFirestore.getDoc(
            `departments/${CADENCE.DEPARTMENT_ID}/weeks/${normalized}`
        );
        const rota = buildViewerShape(normalized, doc && doc.data, CADENCE_THEATRES);

        RotaAPI.setCached(cacheKey, rota);
        return rota;
    }
}
