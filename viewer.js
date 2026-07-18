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

            // Map each
