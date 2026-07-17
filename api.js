/* =====================================================
   Cardiothoracic Theatre Viewer
   api.js
   Version 1.0.1
   ===================================================== */






class RotaAPI {

    static async loadRota() {

        const r = await fetch(CONFIG.API_URL + "?action=viewer");

        if (!r.ok)
            throw new Error("HTTP " + r.status);

        return await r.json();

    }

    static async loadPublishedWeeks() {

        const r = await fetch(CONFIG.API_URL + "?action=archive");

        if (!r.ok)
            throw new Error("HTTP " + r.status);

        return await r.json();

    }

    static async loadWeek(week) {

        const r = await fetch(
            CONFIG.API_URL +
            "?action=publishedWeek&week=" +
            encodeURIComponent(week)
        );

        if (!r.ok)
            throw new Error("HTTP " + r.status);

        return await r.json();

    }

}
