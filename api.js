/* =====================================================
   Cardiothoracic Theatre Viewer
   api.js
   -----------------------------------------------------
   The only file that talks to the Google Sheets backend.
   All three endpoints return PUBLISHED data - this app
   never reads the rota manager's raw saved weeks.

   Week strings from the backend sometimes arrive as full
   timestamps ("2026-07-27T00:00:00.000Z"). normalizeWeek()
   trims them to plain dates ("2026-07-27") in this one
   place, so no other file needs to worry about it.
   ===================================================== */

class RotaAPI {

    // "2026-07-27T00:00:00.000Z" -> "2026-07-27"
    static normalizeWeek(week) {
        return String(week).substring(0, 10);
    }

    // Short-lived cross-page cache (sessionStorage) for the three GET
    // endpoints below. Every page is a separate document in this app,
    // so navigating Dashboard -> Full Week View -> back (or -> On Call
    // Calendar -> back) re-runs the whole page and, without this,
    // re-fetched data it had just loaded seconds earlier. Kept short -
    // this is live rota data, not analytics - so a genuine change on
    // the backend is still visible within a minute either way.
    static CACHE_KEY = "rota_api_cache_v1";
    static CACHE_TTL_MS = 60 * 1000;

    static getCached(key) {
        try {
            const store = JSON.parse(sessionStorage.getItem(RotaAPI.CACHE_KEY) || "{}");
            const entry = store[key];
            if (entry && (Date.now() - entry.fetchedAt) < RotaAPI.CACHE_TTL_MS) {
                return entry.data;
            }
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

    // The latest published rota (what the dashboard shows by default)
    static async loadRota() {
        const cached = RotaAPI.getCached("viewer");
        if (cached) return cached;

        const r = await fetch(CONFIG.API_URL + "?action=viewer");
        if (!r.ok) throw new Error("HTTP " + r.status);
        const rota = await r.json();
        rota.week = RotaAPI.normalizeWeek(rota.week);
        RotaAPI.setCached("viewer", rota);
        return rota;
    }

    // Every week that has ever been published (for the archive dropdown),
    // de-duplicated and sorted oldest -> newest
    static async loadPublishedWeeks() {
        const cached = RotaAPI.getCached("archive");
        if (cached) return cached;

        const r = await fetch(CONFIG.API_URL + "?action=archive");
        if (!r.ok) throw new Error("HTTP " + r.status);
        const weeks = await r.json();

        const result = [...new Map(
            weeks.map(item => [
                RotaAPI.normalizeWeek(item.week),
                { ...item, week: RotaAPI.normalizeWeek(item.week) }
            ])
        ).values()].sort((a, b) => a.week.localeCompare(b.week));

        RotaAPI.setCached("archive", result);
        return result;
    }

    // One specific published week from the archive
    static async loadWeek(week) {
        const normalized = RotaAPI.normalizeWeek(week);
        const cacheKey = "week:" + normalized;
        const cached = RotaAPI.getCached(cacheKey);
        if (cached) return cached;

        const r = await fetch(
            CONFIG.API_URL +
            "?action=publishedWeek&week=" +
            encodeURIComponent(normalized)
        );
        if (!r.ok) throw new Error("HTTP " + r.status);
        const rota = await r.json();
        rota.week = RotaAPI.normalizeWeek(rota.week);
        RotaAPI.setCached(cacheKey, rota);
        return rota;
    }
}
