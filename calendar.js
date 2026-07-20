/* =====================================================
   Cardiothoracic Theatre Viewer
   calendar.js
   -----------------------------------------------------
   Month-at-a-glance calendar of ON-CALL cover. Each day
   shows who is on call (ODP + anaesthetist), pulled from
   published weeks. Tap any day to open that week's full
   view. Only published weeks have data; other days show
   blank. Navigate months with the arrows.
   ===================================================== */

class Calendar {

    static publishedWeeks = [];   // [{week}], sorted oldest->newest
    static weekCache = {};        // week (Mon ISO) -> loaded rota
    static viewYear = 0;
    static viewMonth = 0;         // 0-11

    static iso(d) { return d.toISOString().split("T")[0]; }

    static mondayOf(d) {
        const m = new Date(d);
        m.setDate(d.getDate() - ((d.getDay() + 6) % 7));
        return Calendar.iso(m);
    }

    // Which day-of-week key ("Monday".."Sunday") a date falls on
    static dayName(d) {
        return ["Sunday","Monday","Tuesday","Wednesday",
                "Thursday","Friday","Saturday"][d.getDay()];
    }

    // The on-call summary for a single date, or null if that week
    // isn't published. Uses the same cover model as the dashboard:
    // before 06:30 a day belongs to the previous day's shift, so the
    // calendar shows each calendar day's OWN on-call entry (the person
    // who STARTS cover that day) - simplest and clearest for a month view.
    static coverFor(date) {
        const wk = Calendar.mondayOf(date);
        const rota = Calendar.weekCache[wk];
        if (!rota) return null;

        const day = Calendar.dayName(date);
        const value = rota.days[day];
        if (!value) return null;

        const oc = value.onCall || {};
        // Weekend entries use odp1/session1; weekdays use odp
        const odp = oc.odp || oc.odp1 || "";
        const anaes = oc.anaesthetist || "";
        return { odp, anaes, fromHome: !!oc.fromHome };
    }

    // Load every published week that overlaps the visible month, so the
    // grid (which includes trailing days of adjacent months) is complete.
    static async ensureWeeksLoaded() {
        const first = new Date(Calendar.viewYear, Calendar.viewMonth, 1);
        const last = new Date(Calendar.viewYear, Calendar.viewMonth + 1, 0);

        // Grid starts on the Monday on/before the 1st, ends Sunday on/after the last
        const gridStart = new Date(first);
        gridStart.setDate(first.getDate() - ((first.getDay() + 6) % 7));
        const gridEnd = new Date(last);
        gridEnd.setDate(last.getDate() + (7 - ((last.getDay() + 6) % 7) - 1));

        const needed = new Set();
        for (let d = new Date(gridStart); d <= gridEnd; d.setDate(d.getDate() + 7)) {
            needed.add(Calendar.mondayOf(d));
        }

        const publishedSet = new Set(Calendar.publishedWeeks.map(w => w.week));
        const toLoad = [...needed].filter(
            wk => publishedSet.has(wk) && !Calendar.weekCache[wk]);

        await Promise.all(toLoad.map(async wk => {
            try { Calendar.weekCache[wk] = await RotaAPI.loadWeek(wk); }
            catch (e) { console.error("week load failed", wk, e); }
        }));

        return { gridStart, gridEnd };
    }

    static async render() {
        const monthNames = ["January","February","March","April","May","June",
            "July","August","September","October","November","December"];
        document.getElementById("calMonthLabel").textContent =
            `${monthNames[Calendar.viewMonth]} ${Calendar.viewYear}`;

        const { gridStart, gridEnd } = await Calendar.ensureWeeksLoaded();

        const todayIso = Calendar.iso(new Date());
        const bh = (typeof isBankHoliday === "function");
        const emoji = (typeof anaesEmoji === "function")
            ? anaesEmoji : () => "👨‍⚕️";

        let cells = "";
        for (let d = new Date(gridStart); d <= gridEnd; d.setDate(d.getDate() + 1)) {
            const dIso = Calendar.iso(d);
            const inMonth = d.getMonth() === Calendar.viewMonth;
            const isToday = dIso === todayIso;
            const isWeekend = d.getDay() === 0 || d.getDay() === 6;
            const isBH = bh && isBankHoliday(dIso);
            const cover = Calendar.coverFor(new Date(d));
            const wk = Calendar.mondayOf(new Date(d));
            const published = Calendar.publishedWeeks.some(w => w.week === wk);

            let inner;
            if (!published) {
                inner = `<span class="cal-blank">—</span>`;
            } else if (cover && cover.odp) {
                inner = `
                    <span class="cal-odp">${cover.odp}${cover.fromHome ? " 🏠" : ""}</span>
                    ${cover.anaes ? `<span class="cal-anaes">${emoji(cover.anaes)} ${cover.anaes}</span>` : ""}`;
            } else {
                inner = `<span class="cal-blank">—</span>`;
            }

            const cls = [
                "cal-cell",
                inMonth ? "" : "cal-out",
                isToday ? "cal-today" : "",
                isWeekend ? "cal-weekend" : "",
                isBH ? "cal-bh" : "",
                published ? "cal-has" : "cal-none"
            ].filter(Boolean).join(" ");

            // Tapping a published day opens that week's full view
            const tap = published
                ? `onclick="location.href='week.html?week=${wk}'"`
                : "";

            cells += `
            <div class="${cls}" ${tap}>
                <span class="cal-date">${d.getDate()}</span>
                <div class="cal-body">${inner}</div>
            </div>`;
        }

        const dayHeads = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]
            .map(d => `<div class="cal-dayhead">${d}</div>`).join("");

        document.getElementById("calContainer").innerHTML =
            `<div class="cal-grid">${dayHeads}${cells}</div>`;

        document.getElementById("calNote").textContent =
            "Each day shows the on-call team. Tap a day to open that week. Blank days aren't published yet.";
    }

    static changeMonth(delta) {
        Calendar.viewMonth += delta;
        if (Calendar.viewMonth < 0) { Calendar.viewMonth = 11; Calendar.viewYear--; }
        if (Calendar.viewMonth > 11) { Calendar.viewMonth = 0; Calendar.viewYear++; }
        Calendar.render();
    }

    static async init() {
        const now = new Date();
        Calendar.viewYear = now.getFullYear();
        Calendar.viewMonth = now.getMonth();

        try {
            Calendar.publishedWeeks = await RotaAPI.loadPublishedWeeks();
        } catch (e) {
            console.error(e);
        }

        document.getElementById("calPrev").onclick = () => Calendar.changeMonth(-1);
        document.getElementById("calNext").onclick = () => Calendar.changeMonth(1);

        await Calendar.render();
    }
}

Calendar.init();
