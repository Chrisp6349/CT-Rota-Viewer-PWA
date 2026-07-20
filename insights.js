class TheatreIntelligence {

    constructor() {
        this.index = 0;
        this.insights = [];
    }

    generateInsights() {

        const rota = window.currentRota;

        if (!rota || !rota.days) {
            return [{
                icon: "⚠️",
                title: "No Data",
                text: "No rota has been loaded yet."
            }];
        }

        let totalLists = 0;
        let busiestDay = "";
        let busiestCount = 0;

        for (const [day, value] of Object.entries(rota.days)) {

            const count = (value.theatres || []).filter(t =>
                t.odp1 || t.odp2 || t.anaesthetist || t.list
            ).length;

            totalLists += count;

            if (count > busiestCount) {
                busiestCount = count;
                busiestDay = day;
            }
        }

        return [
            {
                icon: "📅",
                title: "Weekly Summary",
                text: `There are ${totalLists} allocated theatre sessions this week.`
            },
            {
                icon: "⭐",
                title: "Busiest Day",
                text: `${busiestDay} has the busiest schedule with ${busiestCount} allocated theatres.`
            }
        ];
    }

    showCurrent() {

        this.insights = this.generateInsights();

        if (this.index >= this.insights.length) {
            this.index = 0;
        }

        const insight = this.insights[this.index];

        document.querySelector(".insight-icon").textContent = insight.icon;
        document.getElementById("insightTitle").textContent = insight.title;
        document.getElementById("insightText").textContent = insight.text;
    }

    next() {

        this.index++;

        if (this.index >= this.insights.length) {
            this.index = 0;
        }

        this.showCurrent();
    }

}

const theatreIntelligence = new TheatreIntelligence();

window.addEventListener("DOMContentLoaded", () => {

    const panel = document.getElementById("insightsPanel");
    const overlay = document.getElementById("insightsOverlay");

    document.getElementById("insightsBtn").addEventListener("click", () => {

        panel.classList.remove("hidden");
        overlay.classList.remove("hidden");

        requestAnimationFrame(() => {

            panel.classList.add("show");
            overlay.classList.add("show");

        });

        theatreIntelligence.showCurrent();

    });

    function closePanel() {

        panel.classList.remove("show");
        overlay.classList.remove("show");

        setTimeout(() => {

            panel.classList.add("hidden");
            overlay.classList.add("hidden");

        }, 300);

    }

    overlay.addEventListener("click", closePanel);

    document
        .getElementById("nextInsightBtn")
        .addEventListener("click", () => {

            theatreIntelligence.next();

        });

});
