/* =====================================================
   Cardiothoracic Theatre Viewer
   viewer.js
   Dashboard V2
   -----------------------------------------------------
   Renders the WHOLE published week into the page at once:
   one section per weekday (theatre cards, on-call panel,
   support panel - or a bank-holiday cover card instead),
   then a combined weekend cover section for Saturday and
   Sunday. Called by app.js with the data fetched via
   api.js.
   ===================================================== */

class Viewer {

    static formatWeek(dateString) {

        const parts = dateString.split("-");

        const date = new Date(
            Number(parts[0]),
            Number(parts[1]) - 1,
            Number(parts[2])
        );

        const months = [
            "January","February","March","April","May","June",
            "July","August","September","October","November","December"
        ];

        const days = [
            "Sunday","Monday","Tuesday","Wednesday",
            "Thursday","Friday","Saturday"
        ];

        const d = date.getDate();

        let suffix = "th";

        if (d % 10 === 1 && d !== 11) suffix = "st";
        else if (d % 10 === 2 && d !== 12) suffix = "nd";
        else if (d % 10 === 3 && d !== 13) suffix = "rd";

        return `${days[date.getDay()]} ${d}${suffix} ${months[date.getMonth()]} ${date.getFullYear()}`;
    }

    // Local-date ISO (YYYY-MM-DD) - NOT toISOString(), which converts to
    // UTC and can shift "today" back a day in timezones ahead of UTC,
    // briefly highlighting the wrong day's section as "TODAY".
    static todayIso() {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
    }

    static isoDate(weekStart, offset) {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + offset);
        return d.toISOString().split("T")[0];
    }

    // Renders the entire week: five weekday sections (each either a
    // normal theatre-grid day or, on a bank holiday, a cover-only card)
    // followed by one combined weekend section. `scrollToToday` jumps
    // straight to today's section once rendered (if this week has one) -
    // used on first load, so opening the app doesn't leave someone on a
    // Thursday looking at Monday and having to scroll past everything
    // already gone by.
    static render(data, scrollToToday = false) {

        // Make the currently loaded rota available to the Insights engine
        window.currentRota = data;

        const container = document.getElementById("rotaContainer");

        const weekTitle = document.getElementById("weekTitle");
        if (weekTitle) weekTitle.textContent = Viewer.formatWeek(data.week);

        const offsets = { Monday:0, Tuesday:1, Wednesday:2, Thursday:3, Friday:4, Saturday:5, Sunday:6 };
        const order = ["Monday","Tuesday","Wednesday","Thursday","Friday"];
        const todayIso = Viewer.todayIso();

        const weekdaySections = order.map(day => {
            const value = data.days[day] || {};
            const isToday = Viewer.isoDate(data.week, offsets[day]) === todayIso;

            const weekDate = new Date(data.week);
            weekDate.setDate(weekDate.getDate() + offsets[day]);
            const displayDate = weekDate.toLocaleDateString("en-GB",
                { day: "numeric", month: "long", year: "numeric" });

            if (typeof isBankHoliday === "function" && isBankHoliday(Viewer.isoDate(data.week, offsets[day]))) {
                return Viewer.renderBankHolidayDay(day, displayDate, value, isToday);
            }
            return Viewer.renderTheatreDay(day, displayDate, value, isToday);
        }).join("");

        const weekendSection = `
    <section class="daySection weekend-section">
        <div class="day-header">
            <h2 class="day-heading">Weekend Cover</h2>
            <div class="day-date">Saturday &amp; Sunday</div>
        </div>
        ${Viewer.renderWeekendDay("Saturday", data.days["Saturday"] || {}, Viewer.isoDate(data.week, 5) === todayIso)}
        ${Viewer.renderWeekendDay("Sunday", data.days["Sunday"] || {}, Viewer.isoDate(data.week, 6) === todayIso)}
    </section>`;

        container.innerHTML = weekdaySections + weekendSection;

        if (scrollToToday) {
            const todayEl = container.querySelector(".day-today");
            if (todayEl) todayEl.scrollIntoView({ block: "start" });
        }
    }

    // One label/value row, the building block every box (theatres,
    // Support, On Call, Waiting List) now shares - label on the left,
    // value right-aligned, closer to how The Atrium's own rota reads.
    static rotaRow(label, valueHtml) {
        return `<div class="rota-row"><span class="rota-row-label">${label}</span><span class="rota-row-value">${valueHtml}</span></div>`;
    }

    // Builds the On Call box's rows, in the fixed order SODP,
    // Anaesthetist, Cardiac Surgeon, Thoracic Surgeon, CICU Anaesthetist
    // - always all five (four at the weekend), each with its own
    // placeholder when empty, rather than only appearing when filled.
    // Shared by the weekday, bank-holiday, and weekend On Call boxes.
    static renderOnCallRoles(value, weekend) {
        const oc = value.onCall || {};
        let rows = "";

        if (weekend) {
            const shifts = [];
            if (oc.odp1 || oc.odp) shifts.push(`${oc.session1 ? oc.session1 + " " : ""}${oc.odp1 || oc.odp}`);
            if (oc.odp2) shifts.push(`${oc.session2 ? oc.session2 + " " : ""}${oc.odp2}`);
            rows += Viewer.rotaRow("SODP", shifts.length
                ? shifts.map(s => `<span class="rota-row-line">${s}</span>`).join("")
                : "-");
        } else {
            let sodpValue = `<span class="rota-row-line">${oc.odp || "No allocation"}</span>`;
            if (oc.extra) sodpValue += `<span class="rota-row-extra">${oc.extra}</span>`;
            if (oc.fromHome) sodpValue += `<span class="rota-row-extra">From Home</span>`;
            rows += Viewer.rotaRow("SODP", sodpValue);
        }

        rows += Viewer.rotaRow("Anaesthetist", oc.anaesthetist || "-");
        rows += Viewer.rotaRow("Cardiac Surgeon", oc.surgeonCardiac || "-");
        rows += Viewer.rotaRow("Thoracic Surgeon", oc.surgeonThoracic || "-");

        // Weekends don't get a separate CICU row - the same anaesthetist
        // shown above covers CICU too all weekend, so a row for it would
        // just repeat what's already on screen (or worse, read as "no
        // CICU cover" when really there's just no separate role here).
        if (!weekend) {
            rows += Viewer.rotaRow("CICU Anaesthetist", value.cicu || "-");
        }

        return `<div class="rota-card-body">${rows}</div>`;
    }

    // Bank holiday: no operating lists run, so instead of the normal
    // theatre grid, show a weekend-style cover card with just the
    // on-call team. (Bank holiday dates live in config.js.)
    static renderBankHolidayDay(day, displayDate, value, isToday) {

        return `
    <section class="daySection dashboard-layout ${isToday ? "day-today" : ""}">

        <div class="day-header">
            <h2 class="day-heading">${day} <span class="day-bh-tag">Bank Holiday</span>${isToday ? ` <span class="day-today-tag">TODAY</span>` : ""}</h2>
            <div class="day-date">${displayDate}</div>
        </div>

        <div class="card oncall-wide">
            <div class="card-header oncall-header">On Call</div>
            ${Viewer.renderOnCallRoles(value, false)}
        </div>

        <div class="dashboard-row">
            <div class="card dashboard-panel">
                <div class="card-header support-header">Lists</div>
                <div class="card-body">
                    <div class="info">No operating lists today — Bank Holiday</div>
                </div>
            </div>
        </div>

    </section>
`;
    }

    // One normal weekday: the theatre grid, then on-call and support.
    static renderTheatreDay(day, displayDate, value, isToday) {

        let html = `

    <section class="daySection dashboard-layout ${isToday ? "day-today" : ""}">

        <div class="day-header">
            <h2 class="day-heading">${day}${isToday ? ` <span class="day-today-tag">TODAY</span>` : ""}</h2>
            <div class="day-date">${displayDate}</div>
        </div>

        <div class="cards-grid theatre-grid">
    `;

        (value.theatres || []).forEach((theatre, theatreIndex) => {

            // Skip hidden theatres before doing anything else.
            // (Note: the current publisher never sends `hidden` -
            // this is future-proofing, kept from the original.)
            if (theatre.hidden) return;

            // Map each theatre to its card colour and short label.
            // IMPORTANT: computed locally, never written back into the
            // data - other features (My Week, the TV board) read the
            // same object and rely on the original names.
            //
            // The original 5 theatre names get their familiar short
            // label and fixed colour. Anything else - Cadence lets each
            // department name and reorder its own theatres, so this
            // list isn't necessarily those same 5 any more - falls back
            // to its full configured name and a colour cycled by
            // position, so a differently-set-up department still reads
            // as clearly colour-coded rather than defaulting to one
            // flat colour for everything.
            const ACCENT_COLOURS = ["theatre1", "theatre2", "theatre4", "theatre5", "cathlab"];
            let colour = ACCENT_COLOURS[theatreIndex % ACCENT_COLOURS.length];
            let label = theatre.theatre;

            switch (theatre.theatre) {

                case "Theatre 1":
                    colour = "theatre1";
                    label = "CT1";
                    break;

                case "Theatre 2":
                    colour = "theatre2";
                    label = "CT2";
                    break;

                case "Theatre 4":
                    colour = "theatre4";
                    label = "CT4";
                    break;

                case "Theatre 5":
                    colour = "theatre5";
                    label = "CT5";
                    break;

                case "Cath Lab":
                    colour = "cathlab";
                    label = "CATH LAB";
                    break;
            }

            html += `
            <div class="card theatre-card">

               <div class="card-header ${colour} card-header-split">
    <span>${label}</span>${theatre.list ? `<span class="theatre-list-badge">${theatre.list}</span>` : ``}
</div>

                <div class="rota-card-body">
            `;

            html += Viewer.rotaRow("SODP", [theatre.odp1, theatre.odp2].filter(Boolean).length
                ? [theatre.odp1, theatre.odp2].filter(Boolean).map(n => `<span class="rota-row-line">${n}</span>`).join("")
                : "—");
            html += Viewer.rotaRow("Anaesthetist", theatre.anaesthetist || "—");
            html += Viewer.rotaRow("Surgeon", theatre.surgeon || "—");

            html += `
                </div>
            </div>
            `;
        });

        // Support joins the same grid as another uniformly-sized card,
        // same styling as every theatre card, instead of sitting in its
        // own separate (differently-sized) row.
        const supportNames = [value.support?.odp1, value.support?.odp2, value.support?.odp3].filter(Boolean);
        html += `
            <div class="card theatre-card">

               <div class="card-header support-header">
    Support
</div>

                <div class="rota-card-body">
            `;

        html += Viewer.rotaRow("SODP", supportNames.length
            ? supportNames.map(n => `<span class="rota-row-line">${n}</span>`).join("")
            : "—");
        if (value.support?.list) html += Viewer.rotaRow("List", value.support.list);

        html += `
                </div>
            </div>

    </div>

    <div class="card oncall-wide">
        <div class="card-header oncall-header">On Call</div>
        ${Viewer.renderOnCallRoles(value, false)}
    </div>

</section>
`;

        return html;
    }

    static renderWeekendDay(day, value, isToday) {

        return `

<div class="weekend-card ${isToday ? "day-today" : ""}">

    <div class="weekend-title">
        ${day}${isToday ? ` <span class="day-today-tag">TODAY</span>` : ""}
    </div>

    <div class="dashboard-row">

        <div class="card dashboard-panel">

            <div class="card-header oncall-header">
                On Call
            </div>

            ${Viewer.renderOnCallRoles(value, true)}

        </div>

        <div class="card dashboard-panel">

            <div class="card-header support-header">
                Waiting List
            </div>

            ${value.waitingList?.odp || value.waitingList?.anaesthetist || value.waitingList?.surgeon ? `
            <div class="rota-card-body">
                ${Viewer.rotaRow("SODP", value.waitingList?.odp || "-")}
                ${Viewer.rotaRow("Anaesthetist", value.waitingList?.anaesthetist || "-")}
                ${Viewer.rotaRow("Surgeon", value.waitingList?.surgeon || "-")}
            </div>
            ` : `
            <div class="card-body">
                <div class="info">NO LIST</div>
            </div>
            `}

        </div>

    </div>

</div>



`;


    }
}
