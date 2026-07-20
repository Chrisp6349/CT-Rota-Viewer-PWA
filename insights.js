class TheatreIntelligence {

    constructor() {
        this.index = 0;

        this.insights = [
            {
                icon: "⭐",
                title: "Today's Highlight",
                text: "Welcome to Theatre Intelligence."
            },
            {
                icon: "💡",
                title: "Interesting Fact",
                text: "This panel will automatically analyse the current rota."
            },
            {
                icon: "🤝",
                title: "Team Insight",
                text: "Future versions will recognise staff pairings and trends."
            },
            {
                icon: "📈",
                title: "Workload",
                text: "You'll soon be able to see who's covering the most lists."
            }
        ];
    }

    showCurrent() {

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

        },300);

    }

    overlay.addEventListener("click", closePanel);

    document
        .getElementById("nextInsightBtn")
        .addEventListener("click", () => {

            theatreIntelligence.next();

        });

});
