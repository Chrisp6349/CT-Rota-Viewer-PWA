class WeekView {

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

        return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    }

    static async init() {
const params = new URLSearchParams(window.location.search);
const selectedWeek = params.get("week");
      const data = selectedWeek
    ? await RotaAPI.loadWeek(selectedWeek)
    : await RotaAPI.loadRota();

        document.getElementById("weekTitle").textContent =
            "Week Commencing " + WeekView.formatWeek(data.week);

        const container =
            document.getElementById("weekContainer");

        let html = "";

        Object.entries(data.days).forEach(([day, value]) => {
if (value.weekend) {

    html += `
    <section class="week-card">

        <div class="week-card-header">
            ${day}
        </div>

        <div class="week-card-body">

            <div class="rota-row">
                <span class="location">🚨 On Call</span>
                <span class="staff">
                    ${value.onCall?.odp1 || "-"} ${value.onCall?.session1 || ""}
                </span>
            </div>

            <div class="rota-row">
                <span class="location"></span>
                <span class="staff">
                    ${value.onCall?.odp2 || "-"} ${value.onCall?.session2 || ""}
                </span>
            </div>

            <div class="rota-row">
                <span class="location">👨‍⚕️ Anaesthetist</span>
                <span class="staff">${value.onCall?.anaesthetist || "-"}</span>
            </div>

            <div class="rota-row">
                <span class="location">📋 Waiting List</span>
                <span class="staff">${value.waitingList?.odp || "-"}</span>
            </div>

        </div>

    </section>
    `;

    return;
}
            html += `
                <section class="week-card">

                    <div class="week-card-header">
                        ${day}
                    </div>

                    <div class="week-card-body">
            `;

            (value.theatres || []).forEach(theatre => {

               let name =
    theatre.odp1 ||
    theatre.odp2 ||
    "No allocation";

html += `
    <div class="rota-row">

        <span class="location">
            ${theatre.theatre}
        </span>

        <span class="staff">
            ${name}
            ${
                theatre.anaesthetist
                ? `<br><span style="font-size:0.9em;color:#666;">
                    👨‍⚕️ ${theatre.anaesthetist}
                   </span>`
                : ""
            }
        </span>

    </div>
`;            });

            html += `

                <div class="rota-divider"></div>

                <div class="rota-row oncall">

                    <span class="location">
                        🚨 On Call
                    </span>

                    <span class="staff">
                        ${value.onCall?.odp || "-"}
                    </span>

                </div>
                <div class="rota-row oncall">

    <span class="location">
        👨‍⚕️ Anaesthetist
    </span>

    <span class="staff">
        ${value.onCall?.anaesthetist || "-"}
    </span>

</div>

                <div class="rota-row support">

                    <span class="location">
                        👥 Support
                    </span>

                    <span class="staff">
                        ${value.support?.odp || "-"}
                    </span>

                </div>

                </div>

                </section>
            `;
        });

        container.innerHTML = html;

    }

}

WeekView.init();
