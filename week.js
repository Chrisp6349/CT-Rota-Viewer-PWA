/* =====================================================
   Cardiothoracic Theatre Viewer
   week.js
   -----------------------------------------------------
   "Week at a glance" board: five weekday columns of
   colour-coded theatre rows, with support and on-call
   at the foot of each day, and the weekend cover as a
   full-width strip below. Today's column is highlighted
   when viewing the current week.

   Shows EVERYTHING the publisher sends: both ODPs per
   theatre, list types, all three support ODPs, EXTRA
   O/C, FROM HOME, weekend sessions, and both waiting
   list roles.
   ===================================================== */

class WeekView {

    static formatWeek(dateString) {
        const parts = dateString.split("-");
        const date = new Date(
            Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        const months = [
            "January","February","March","April","May","June",
            "July","August","September","October","November","December"];
        return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    }

    // The colour class and short label for each theatre
    static theatreMeta(name) {
        switch (name) {
            case "Theatre 1": return { cls: "wk-t1",   label: "CT1" };
            case "Theatre 2": return { cls: "wk-t2",   label: "CT2" };
            case "Theatre 4": return { cls: "wk-t4",   label: "CT4" };
            case "Theatre 5": return { cls: "wk-t5",   label: "CT5" };
            case "Cath Lab":  return { cls: "wk-cath", label: "CATH" };
            default:          return { cls: "wk-t1",   label: name };
        }
    }

    // "Mon 13" style short date for a column header
    static shortDate(weekStart, offset) {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + offset);
        return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    }

    // ISO date of the day `offset` days after the week start
    static isoDate(weekStart, offset) {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + offset);
        return d.toISOString().split("T")[0];
    }

    // One weekday column
    static dayColumn(day, value, weekStart, offset) {
        const todayIso = new Date().toISOString().split("T")[0];
        const isToday = WeekView.isoDate(weekStart, offset) === todayIso;

        let rows = "";

        (value.theatres || []).forEach(t => {
            const meta = WeekView.theatreMeta(t.theatre);
            const empty = !t.odp1 && !t.odp2 && !t.anaesthetist && !t.list;

            rows += `
            <div class="wk-row ${meta.cls}">
                <span class="wk-tag">${meta.label}</span>
                <span class="wk-cell">
                    ${empty ? `<span class="wk-empty">—</span>` : `
                        ${t.odp1 ? `<span class="wk-odp">${t.odp1}</span>` : ""}
                        ${t.odp2 ? `<span class="wk-odp">${t.odp2}</span>` : ""}
                        ${t.anaesthetist ? `<span class="wk-anaes">👨‍⚕️ ${t.anaesthetist}</span>` : ""}
                        ${t.list ? `<span class="wk-list">${t.list}</span>` : ""}
                    `}
                </span>
            </div>`;
        });

        // Support: all three ODPs plus the list type
        const s = value.support || {};
        const supportPeople = [s.odp1, s.odp2, s.odp3].filter(Boolean);
        rows += `
            <div class="wk-row wk-support">
                <span class="wk-tag">SUPPORT</span>
                <span class="wk-cell">
                    ${supportPeople.length
                        ? supportPeople.map(n => `<span class="wk-odp">${n}</span>`).join("")
                        : `<span class="wk-empty">—</span>`}
                    ${s.list ? `<span class="wk-list">${s.list}</span>` : ""}
                </span>
            </div>`;

        // On call: ODP, extra, from-home, anaesthetist
        const oc = value.onCall || {};
        rows += `
            <div class="wk-row wk-oncall">
                <span class="wk-tag">ON CALL</span>
                <span class="wk-cell">
                    ${oc.odp ? `<span class="wk-odp">${oc.odp}</span>` : `<span class="wk-empty">—</span>`}
                    ${oc.extra ? `<span class="wk-flag">${oc.extra}</span>` : ""}
                    ${oc.fromHome ? `<span class="wk-flag">🏠 FROM HOME</span>` : ""}
                    ${oc.anaesthetist ? `<span class="wk-anaes">👨‍⚕️ ${oc.anaesthetist}</span>` : ""}
                </span>
            </div>`;

        return `
        <section class="wk-day ${isToday ? "wk-today" : ""}">
            <div class="wk-day-head">
                <span class="wk-day-name">${day}</span>
                <span class="wk-day-date">${WeekView.shortDate(weekStart, offset)}${isToday ? " · TODAY" : ""}</span>
            </div>
            <div class="wk-day-body">${rows}</div>
        </section>`;
    }

    // One half of the weekend strip
    static weekendHalf(day, value, weekStart, offset) {
        const todayIso = new Date().toISOString().split("T")[0];
        const isToday = WeekView.isoDate(weekStart, offset) === todayIso;

        const oc = value.onCall || {};
        const wl = value.waitingList || {};

        return `
        <div class="wk-wend-half ${isToday ? "wk-today" : ""}">
            <div class="wk-wend-day">${day}${isToday ? " · TODAY" : ""}</div>

            <div class="wk-row wk-oncall">
                <span class="wk-tag">ON CALL</span>
                <span class="wk-cell">
                    ${oc.odp1 || oc.odp
                        ? `<span class="wk-odp">${oc.odp1 || oc.odp}${oc.session1 ? ` <em>${oc.session1}</em>` : ""}</span>`
                        : `<span class="wk-empty">—</span>`}
                    ${oc.odp2 ? `<span class="wk-odp">${oc.odp2}${oc.session2 ? ` <em>${oc.session2}</em>` : ""}</span>` : ""}
                    ${oc.anaesthetist ? `<span class="wk-anaes">👨‍⚕️ ${oc.anaesthetist}</span>` : ""}
                </span>
            </div>

            <div class="wk-row wk-wlist">
                <span class="wk-tag">W/LIST</span>
                <span class="wk-cell">
                    ${wl.odp ? `<span class="wk-odp">${wl.odp}</span>` : `<span class="wk-empty">—</span>`}
                    ${wl.anaesthetist ? `<span class="wk-anaes">👨‍⚕️ ${wl.anaesthetist}</span>` : ""}
                </span>
            </div>
        </div>`;
    }

    static async init() {
        const params = new URLSearchParams(window.location.search);
        const selectedWeek = params.get("week");

        try {
            const data = selectedWeek
                ? await RotaAPI.loadWeek(selectedWeek)
                : await RotaAPI.loadRota();

            document.getElementById("weekTitle").textContent =
                "Week Commencing " + WeekView.formatWeek(data.week);

            const order = ["Monday","Tuesday","Wednesday","Thursday","Friday"];

            const columns = order
                .map((day, i) => WeekView.dayColumn(day, data.days[day] || {}, data.week, i))
                .join("");

            const weekend = `
                <section class="wk-weekend">
                    <div class="wk-wend-head">🛡️ WEEKEND COVER</div>
                    <div class="wk-wend-body">
                        ${WeekView.weekendHalf("Saturday", data.days["Saturday"] || {}, data.week, 5)}
                        ${WeekView.weekendHalf("Sunday",   data.days["Sunday"]   || {}, data.week, 6)}
                    </div>
                </section>`;

            document.getElementById("weekContainer").innerHTML =
                `<div class="wk-grid">${columns}</div>` + weekend;

        } catch (err) {
            console.error(err);
            document.getElementById("weekContainer").innerHTML =
                `<p class="wk-error">Unable to load the rota. Please try again.</p>`;
        }
    }
}

WeekView.init();
