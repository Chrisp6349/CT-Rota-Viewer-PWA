/* =====================================================
   Cardiothoracic Theatre Viewer
   viewer.js
   Dashboard V2
   -----------------------------------------------------
   Renders one day of the published rota into the page:
   theatre cards, on-call panel, support panel, and the
   combined weekend cover view. Called by app.js with
   the data fetched via api.js.
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

   static render(data) {

   

    const container = document.getElementById("rotaContainer");
        container.innerHTML = "";

      const weekTitle = document.getElementById("weekTitle");

if (weekTitle) {
    weekTitle.textContent = Viewer.formatWeek(data.week);
}

       let selectedDay = window.selectedDay || "Monday";
const day = selectedDay;
const value = data.days[day];

if (!value) return;

// Weekend view: Saturday and Sunday render together as one cover page
const isWeekend = day === "Saturday" || day === "Sunday";

// Bank holiday view: no operating lists run, so instead of the normal
// theatre grid, show a weekend-style cover page with just the on-call
// team. (Bank holiday dates live in config.js.)
if (!isWeekend && typeof isBankHoliday === "function") {

    const bhDate = new Date(data.week);
    const bhOffsets = { Monday:0, Tuesday:1, Wednesday:2, Thursday:3, Friday:4 };
    bhDate.setDate(bhDate.getDate() + (bhOffsets[day] || 0));
    const bhIso = bhDate.toISOString().split("T")[0];

    if (isBankHoliday(bhIso)) {

        const bhDisplay = bhDate.toLocaleDateString("en-GB",
            { weekday: "long", day: "numeric", month: "long", year: "numeric" });
        const oc = value.onCall || {};

        container.innerHTML = `
    <section class="daySection dashboard-layout">

        <div class="day-header">
            <h2 class="day-heading">🎉 BANK HOLIDAY COVER</h2>
            <div class="day-date">${bhDisplay}</div>
        </div>

        <div class="dashboard-row">

            <div class="card dashboard-panel">
                <div class="card-header oncall-header">🚨 ON CALL</div>
                <div class="card-body oncall-body">
                    <div class="oncall-person">👤 ${oc.odp || "No allocation"}</div>
                    ${oc.extra ? `<div class="info">🟡 ${oc.extra}</div>` : ``}
                    ${oc.fromHome ? `<div class="from-home">🏠 FROM HOME</div>` : ``}
                    <div class="oncall-anaesthetist">
                        ${oc.anaesthetist ? anaesEmoji(oc.anaesthetist) + " " + oc.anaesthetist : "👨‍⚕️ -"}
                    </div>
                </div>
            </div>

            <div class="card dashboard-panel">
                <div class="card-header support-header">📋 LISTS</div>
                <div class="card-body">
                    <div class="info">No operating lists today — Bank Holiday</div>
                </div>
            </div>

        </div>

    </section>
`;

        Viewer.updateDayTabs(data);
        return;
    }
}

if (isWeekend) {


    const saturday = data.days["Saturday"] || {};
    const sunday = data.days["Sunday"] || {};

  container.innerHTML = `
    <section class="daySection dashboard-layout">

        <div class="day-header">
            <h2 class="day-heading">🛡️ WEEKEND COVER</h2>
            <div class="day-date">Saturday & Sunday</div>
        </div>

        ${Viewer.renderWeekendDay("Saturday", saturday)}
        ${Viewer.renderWeekendDay("Sunday", sunday)}

    </section>
`;

Viewer.updateDayTabs(data);

return;

}
        const weekDate = new Date(data.week);

        const offsets = {
            Monday:0,
            Tuesday:1,
            Wednesday:2,
            Thursday:3,
            Friday:4,
            Saturday:5,
            Sunday:6
        };

        weekDate.setDate(
            weekDate.getDate() + (offsets[day] || 0)
        );

        const displayDate =
            weekDate.toLocaleDateString(
                "en-GB",
                {
                    day:"numeric",
                    month:"long",
                    year:"numeric"
                }
            );

        let html = `

<section class="daySection dashboard-layout">

    <div class="day-header">
        <h2 class="day-heading">${day}</h2>
        <div class="day-date">${displayDate}</div>
    </div>

    <div class="cards-grid theatre-grid">
`;

        (value.theatres || []).forEach(theatre => {

            // Skip hidden theatres before doing anything else.
            // (Note: the current publisher never sends `hidden` -
            // this is future-proofing, kept from the original.)
            if (theatre.hidden) return;

            // Map each theatre to its card colour and short label.
            // IMPORTANT: computed locally, never written back into the
            // data - other features (My Week, the TV board) read the
            // same object and rely on the original names.
            let colour = "theatre1";
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

               <div class="card-header ${colour}">
    ${label}
</div>

                <div class="card-body compact-card">
            `;

            if (
                !theatre.odp1 &&
                !theatre.odp2 &&
                !theatre.anaesthetist &&
                !theatre.list
            ) {

                html += `
                    <div class="info">
                        No allocation
                    </div>
                `;

            } else {

                if (theatre.odp1)
                    html += `<div class="person">👤 ${theatre.odp1}</div>`;

                if (theatre.odp2)
                    html += `<div class="person">👤 ${theatre.odp2}</div>`;

                if (theatre.anaesthetist)
                    html += `<div class="info">${anaesEmoji(theatre.anaesthetist)} ${theatre.anaesthetist}</div>`;

                if (theatre.list)
                    html += `<div class="info">📋 ${theatre.list}</div>`;
            }

            html += `
                </div>
            </div>
            `;
        });

             html += `

    </div>

    <div class="dashboard-row">

        <div class="card dashboard-panel">

            <div class="card-header oncall-header">
                🚨 ON CALL
            </div>

            <div class="card-body oncall-body">

                <div class="oncall-person">
                    👤 ${value.onCall?.odp || "No allocation"}
                </div>
                ${
    value.onCall?.extra
    ? `<div class="info">🟡 ${value.onCall.extra}</div>`
    : ``
}
                ${
                    value.onCall?.fromHome
                    ? `<div class="from-home">🏠 FROM HOME</div>`
                    : ``
                }

                <div class="oncall-anaesthetist">
                    ${value.onCall?.anaesthetist ? anaesEmoji(value.onCall.anaesthetist) + " " + value.onCall.anaesthetist : "👨‍⚕️ -"}
                </div>

            </div>

        </div>

        <div class="card dashboard-panel">

            <div class="card-header support-header">
                👥 SUPPORT
            </div>

            <div class="card-body">

              ${
    value.support?.odp1
        ? `<div class="person">👤 ${value.support.odp1}</div>`
        : ``
}

${
    value.support?.odp2
        ? `<div class="person">👤 ${value.support.odp2}</div>`
        : ``
}

${
    value.support?.odp3
        ? `<div class="person">👤 ${value.support.odp3}</div>`
        : ``
}

${
    !value.support?.odp1 &&
    !value.support?.odp2 &&
    !value.support?.odp3
        ? `<div class="info">No allocation</div>`
        : ``
}
                ${
                    value.support?.list
                    ? `<div class="info">📋 ${value.support.list}</div>`
                    : ``
                }

            </div>

        </div>

    </div>

<button id="fullWeekButton" class="full-week-view">

    <h3>📄 Full Week View</h3>

    <p>View complete weekly rota</p>

</button>

</section>
`;

        container.innerHTML = html;

const fullWeekButton = document.getElementById("fullWeekButton");

if (fullWeekButton) {

  fullWeekButton.addEventListener("click", function () {

    sessionStorage.setItem("viewerWeek", data.week);
    sessionStorage.setItem("viewerDay", window.selectedDay);

    window.location.assign(
        `week.html?week=${encodeURIComponent(data.week)}`
    );

});
}  Viewer.updateDayTabs(data);
    }
static renderWeekendDay(day, value){

    return `

<div class="weekend-card">

    <div class="weekend-title">
        ${day}
    </div>

    <div class="dashboard-row">

        <div class="card dashboard-panel">

            <div class="card-header oncall-header">
                🚨 ON CALL
            </div>

            <div class="card-body">

               <div class="person">
    ${value.onCall?.session1 ? value.onCall.session1 + " " : ""}👤
    ${value.onCall?.odp1 || value.onCall?.odp || "-"}
</div>

${
    value.onCall?.odp2
    ? `<div class="person">
        ${value.onCall?.session2 ? value.onCall.session2 + " " : ""}👤
        ${value.onCall.odp2}
      </div>`
    : ""
}

                <div class="info">
                    ${value.onCall?.anaesthetist ? anaesEmoji(value.onCall.anaesthetist) + " " + value.onCall.anaesthetist : "👨‍⚕️ -"}
                </div>

            </div>

        </div>

        <div class="card dashboard-panel">

            <div class="card-header support-header">
                📋 WAITING LIST
            </div>

            <div class="card-body">

                <div class="person">
                    👤 ${value.waitingList?.odp || "-"}
                </div>

                <div class="info">
                    ${value.waitingList?.anaesthetist ? anaesEmoji(value.waitingList.anaesthetist) + " " + value.waitingList.anaesthetist : "👨‍⚕️ -"}
                </div>

            </div>

        </div>

    </div>

</div>



`;


}

static updateDayTabs(data) {

    document.querySelectorAll(".day-tab").forEach(btn => {

        btn.classList.toggle(
            "active",
            (btn.dataset.day === "Saturday" &&
                (window.selectedDay === "Saturday" ||
                 window.selectedDay === "Sunday")) ||
            btn.dataset.day === window.selectedDay
        );

       btn.onclick = () => {

    const container = document.getElementById("rotaContainer");

    container.classList.add("fade-out");

    setTimeout(() => {

        window.selectedDay = btn.dataset.day;

        Viewer.render(data);

        container.classList.remove("fade-out");
        container.classList.add("fade-in");

        setTimeout(() => {
            container.classList.remove("fade-in");
        }, 200);

    }, 200);

};

    });



}
}
