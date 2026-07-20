/* =====================================================
   Cardiothoracic Theatre Viewer
   insights.js
   -----------------------------------------------------
   "Theatre Intelligence" - four random fun facts drawn
   from every published week up to and including today
   (never future weeks). A fresh random 4 are picked
   every time the panel is opened.

   Fact types:
   - Simple counts: on-calls, theatre sessions, busiest
     day/theatre, this week
   - All-time counts: on-calls, sessions, since records
     began
   - Pairings: how often an ODP has worked with a given
     anaesthetist, across all published history
   ===================================================== */

class TheatreIntelligence {

    constructor() {
        this.index = 0;
        this.facts = [];
        this.loaded = false;
    }

    // Every published week with a start date on or before today
    static async loadHistory() {
        const todayIso = new Date().toISOString().split("T")[0];
        const weeks = await RotaAPI.loadPublishedWeeks();
        const pastOrPresent = weeks.filter(w => w.week <= todayIso);

        const rotas = await Promise.all(
            pastOrPresent.map(w => RotaAPI.loadWeek(w.week).catch(() => null))
        );

        return rotas.filter(Boolean);
    }

    // Tallies used to build facts, computed once per panel-open across
    // every loaded week.
    static buildStats(rotas) {

        const onCallCounts = {};       // odp -> count
        const sessionCounts = {};      // odp -> theatre session count
        const theatreCounts = {};      // theatre name -> count
        const dayCounts = {};          // day name -> session count
        const pairings = {};           // "odp|anaes" -> count
        const supportCounts = {};      // odp -> support-role count
        const personTheatreCounts = {};// "odp|theatre" -> count, for favourite theatre
        const listCounts = {};         // list type -> count
        const waitingListCounts = {};  // odp -> weekend waiting-list count
        let totalSessions = 0;
        let totalOnCalls = 0;
        let staffingGaps = 0;

        rotas.forEach(rota => {
            Object.entries(rota.days || {}).forEach(([day, value]) => {

                (value.theatres || []).forEach(t => {
                    const hasAllocation = t.odp1 || t.odp2 || t.anaesthetist || t.list;
                    if (!hasAllocation) return;

                    totalSessions++;
                    dayCounts[day] = (dayCounts[day] || 0) + 1;

                    const label = t.theatre === "Cath Lab"
                        ? "Cath Lab" : t.theatre.replace("Theatre ", "CT");
                    theatreCounts[label] = (theatreCounts[label] || 0) + 1;

                    if (t.list) listCounts[t.list] = (listCounts[t.list] || 0) + 1;

                    [t.odp1, t.odp2].filter(Boolean).forEach(odp => {
                        sessionCounts[odp] = (sessionCounts[odp] || 0) + 1;
                        const ptKey = odp + "|" + label;
                        personTheatreCounts[ptKey] = (personTheatreCounts[ptKey] || 0) + 1;
                        if (t.anaesthetist) {
                            const key = odp + "|" + t.anaesthetist;
                            pairings[key] = (pairings[key] || 0) + 1;
                        }
                    });

                    if (!t.odp1 && !t.odp2) staffingGaps++;
                });

                // Support-role counts (weekday support panel)
                const s = value.support || {};
                [s.odp1, s.odp2, s.odp3].filter(Boolean).forEach(odp => {
                    supportCounts[odp] = (supportCounts[odp] || 0) + 1;
                });

                const oc = value.onCall || {};
                if (oc.odp) {
                    onCallCounts[oc.odp] = (onCallCounts[oc.odp] || 0) + 1;
                    totalOnCalls++;
                }
                // Weekend on-call entries
                [oc.odp1, oc.odp2].filter(Boolean).forEach(odp => {
                    onCallCounts[odp] = (onCallCounts[odp] || 0) + 1;
                    totalOnCalls++;
                });

                // Weekend waiting-list cover
                if (value.weekend && value.waitingList && value.waitingList.odp) {
                    const odp = value.waitingList.odp;
                    waitingListCounts[odp] = (waitingListCounts[odp] || 0) + 1;
                }
            });
        });

        return {
            weekCount: rotas.length,
            onCallCounts, sessionCounts, theatreCounts, dayCounts, pairings,
            supportCounts, personTheatreCounts, listCounts, waitingListCounts,
            totalSessions, totalOnCalls, staffingGaps
        };
    }

    // Every date (as YYYY-MM-DD) covered by a set of loaded rotas, mapped
    // to the set of people who worked that day in ANY role - theatre,
    // support, or on-call (weekday or weekend).
    static buildDailyWorkMap(rotas) {
        const dayOffsets = { Monday:0, Tuesday:1, Wednesday:2, Thursday:3,
                              Friday:4, Saturday:5, Sunday:6 };
        const workedOn = {};   // dateIso -> Set(names)

        rotas.forEach(rota => {
            const weekStart = new Date(rota.week);
            Object.entries(rota.days || {}).forEach(([day, value]) => {
                const offset = dayOffsets[day];
                if (offset === undefined) return;

                const d = new Date(weekStart);
                d.setDate(d.getDate() + offset);
                const iso = d.toISOString().split("T")[0];

                const people = new Set();
                (value.theatres || []).forEach(t => {
                    if (t.odp1) people.add(t.odp1);
                    if (t.odp2) people.add(t.odp2);
                });
                const s = value.support || {};
                [s.odp1, s.odp2, s.odp3].filter(Boolean).forEach(p => people.add(p));
                const oc = value.onCall || {};
                if (oc.odp) people.add(oc.odp);
                [oc.odp1, oc.odp2].filter(Boolean).forEach(p => people.add(p));

                workedOn[iso] = people;
            });
        });

        return workedOn;
    }

    // Walks every covered day in date order and finds, per person, their
    // longest-ever consecutive run and (if it reaches today) their current
    // active run. A run NEVER bridges a day that isn't covered by
    // published data - it simply ends there, since an unpublished day is
    // unknown, not "not worked".
    static buildStreaks(rotas) {
        const workedOn = TheatreIntelligence.buildDailyWorkMap(rotas);
        const todayIso = new Date().toISOString().split("T")[0];

        // A published week includes every day at once, including days
        // later in the week that haven't happened yet. Those are plans,
        // not completed shifts - exclude anything after today so streaks
        // only ever reflect days that have actually occurred.
        const dates = Object.keys(workedOn).filter(d => d <= todayIso).sort();
        if (!dates.length) return { longest: null, current: [] };

        const running = {};      // name -> { count, startDate }
        const longestByPerson = {}; // name -> { count, startDate, endDate }
        let prevDate = null;

        const oneDay = 24 * 60 * 60 * 1000;

        dates.forEach(dateIso => {
            const isContiguous = prevDate &&
                (new Date(dateIso) - new Date(prevDate)) === oneDay;

            if (!isContiguous) {
                // Gap (or first date): every running streak ends here
                Object.keys(running).forEach(name => {
                    TheatreIntelligence.recordIfLongest(longestByPerson, name, running[name]);
                });
                Object.keys(running).forEach(name => delete running[name]);
            }

            const today = workedOn[dateIso];

            // End streaks for anyone who worked the previous covered day
            // but not today
            Object.keys(running).forEach(name => {
                if (!today.has(name)) {
                    TheatreIntelligence.recordIfLongest(longestByPerson, name, running[name]);
                    delete running[name];
                }
            });

            // Extend or start streaks for anyone working today
            today.forEach(name => {
                if (running[name]) {
                    running[name].count++;
                    running[name].endDate = dateIso;
                } else {
                    running[name] = { count: 1, startDate: dateIso, endDate: dateIso };
                }
            });

            prevDate = dateIso;
        });

        // Flush whatever's still running at the very end
        Object.keys(running).forEach(name => {
            TheatreIntelligence.recordIfLongest(longestByPerson, name, running[name]);
        });

        // All-time longest, across everyone
        let longest = null;
        Object.entries(longestByPerson).forEach(([name, run]) => {
            if (!longest || run.count > longest.count) {
                longest = { name, ...run };
            }
        });

        // "Current" streaks: only meaningful if the most recent covered
        // date is actually today (i.e. this week has been published) -
        // otherwise we'd be describing a streak that already ended.
        const lastCovered = dates[dates.length - 1];
        const current = [];
        if (lastCovered === todayIso) {
            Object.entries(running).forEach(([name, run]) => {
                if (run.count >= 2) current.push({ name, ...run });
            });
        }

        return { longest, current };
    }

    static recordIfLongest(store, name, run) {
        if (!store[name] || run.count > store[name].count) {
            store[name] = { count: run.count, startDate: run.startDate, endDate: run.endDate };
        }
    }

    // "3rd June" style short date for streak facts
    static shortDate(iso) {
        const d = new Date(iso);
        const months = ["Jan","Feb","Mar","Apr","May","Jun",
                         "Jul","Aug","Sep","Oct","Nov","Dec"];
        return `${d.getDate()} ${months[d.getMonth()]}`;
    }

    // Picks the top name from a { name: count } object
    static top(counts) {
        let name = null, best = 0;
        Object.entries(counts).forEach(([n, c]) => {
            if (c > best) { name = n; best = c; }
        });
        return name ? { name, count: best } : null;
    }

    // Builds the full pool of possible facts, given the tallies above.
    // Only facts with real data behind them are included.
    static buildFactPool(stats, streaks) {
        const facts = [];
        const since = stats.weekCount === 1
            ? "this week" : `across the last ${stats.weekCount} published weeks`;

        // --- On-call facts, per person ---
        Object.entries(stats.onCallCounts).forEach(([name, count]) => {
            facts.push({
                icon: "🚨",
                text: `${name} has done ${count} on-call${count === 1 ? "" : "s"} ${since}.`
            });
        });

        // --- Theatre session facts, per person ---
        Object.entries(stats.sessionCounts).forEach(([name, count]) => {
            facts.push({
                icon: "🏥",
                text: `${name} has worked ${count} theatre session${count === 1 ? "" : "s"} ${since}.`
            });
        });

        // --- Pairing facts ---
        Object.entries(stats.pairings).forEach(([key, count]) => {
            if (count < 2) return;   // only surface pairings that have actually repeated
            const [odp, anaes] = key.split("|");
            const emoji = (typeof anaesEmoji === "function") ? anaesEmoji(anaes) : "👨‍⚕️";
            const anaesFullName = (typeof anaesName === "function") ? anaesName(anaes) : anaes;
            facts.push({
                icon: "🤝",
                text: `${odp} has worked with ${emoji} ${anaesFullName} ${count} times ${since}.`
            });
        });

        // --- Streak facts ---
        if (streaks.longest && streaks.longest.count >= 3) {
            facts.push({
                icon: "🔥",
                text: `${streaks.longest.name}'s longest streak on record is ${streaks.longest.count} days running, ${streaks.longest.startDate === streaks.longest.endDate ? "on " + TheatreIntelligence.shortDate(streaks.longest.startDate) : TheatreIntelligence.shortDate(streaks.longest.startDate) + " to " + TheatreIntelligence.shortDate(streaks.longest.endDate)}.`
            });
        }
        streaks.current.forEach(run => {
            facts.push({
                icon: "⚡",
                text: `${run.name} is currently on a streak of ${run.count} days working, since ${TheatreIntelligence.shortDate(run.startDate)}.`
            });
        });

        // --- Support-role facts, per person ---
        Object.entries(stats.supportCounts).forEach(([name, count]) => {
            facts.push({
                icon: "🧑‍🤝‍🧑",
                text: `${name} has supported theatres ${count} time${count === 1 ? "" : "s"} ${since}.`
            });
        });

        // --- Favourite theatre, per person (only where it's a clear lead) ---
        (() => {
            const byPerson = {};   // odp -> { theatre: count }
            Object.entries(stats.personTheatreCounts).forEach(([key, count]) => {
                const [odp, theatre] = key.split("|");
                byPerson[odp] = byPerson[odp] || {};
                byPerson[odp][theatre] = count;
            });
            Object.entries(byPerson).forEach(([odp, theatres]) => {
                const fav = TheatreIntelligence.top(theatres);
                if (fav && fav.count > 1) {
                    facts.push({
                        icon: "❤️",
                        text: `${odp}'s favourite theatre is ${fav.name}, worked ${fav.count} times ${since}.`
                    });
                }
            });
        })();

        // --- Most common list type ---
        const topList = TheatreIntelligence.top(stats.listCounts);
        if (topList && topList.count > 1) {
            facts.push({
                icon: "📋",
                text: `${topList.name} has been the most common list type ${since}, run ${topList.count} times.`
            });
        }

        // --- Quietest theatre (only among theatres that HAVE run at least once) ---
        (() => {
            const entries = Object.entries(stats.theatreCounts);
            if (entries.length > 1) {
                let name = null, least = Infinity;
                entries.forEach(([n, c]) => { if (c < least) { least = c; name = n; } });
                facts.push({
                    icon: "🤫",
                    text: `${name} has been the quietest theatre ${since}, used just ${least} time${least === 1 ? "" : "s"}.`
                });
            }
        })();

        // --- Quietest day (only among days that HAVE had sessions) ---
        (() => {
            const entries = Object.entries(stats.dayCounts);
            if (entries.length > 1) {
                let name = null, least = Infinity;
                entries.forEach(([n, c]) => { if (c < least) { least = c; name = n; } });
                facts.push({
                    icon: "😴",
                    text: `${name} has been the quietest operating day ${since}.`
                });
            }
        })();

        // --- Top overall pairing (the single most frequent ODP+anaesthetist combo) ---
        const topPairing = TheatreIntelligence.top(stats.pairings);
        if (topPairing && topPairing.count > 1) {
            const [odp, anaes] = topPairing.name.split("|");
            const emoji = (typeof anaesEmoji === "function") ? anaesEmoji(anaes) : "👨";
            const anaesFullName = (typeof anaesName === "function") ? anaesName(anaes) : anaes;
            facts.push({
                icon: "🏅",
                text: `${odp} and ${emoji} ${anaesFullName} are the most frequent pairing ${since}, working together ${topPairing.count} times.`
            });
        }

        // --- Weekend waiting-list facts, per person ---
        Object.entries(stats.waitingListCounts).forEach(([name, count]) => {
            facts.push({
                icon: "📝",
                text: `${name} has covered the weekend waiting list ${count} time${count === 1 ? "" : "s"} ${since}.`
            });
        });

        // --- Busiest theatre overall ---
        const busiestTheatre = TheatreIntelligence.top(stats.theatreCounts);
        if (busiestTheatre) {
            facts.push({
                icon: "🏆",
                text: `${busiestTheatre.name} has been the busiest theatre ${since}, used ${busiestTheatre.count} times.`
            });
        }

        // --- Busiest day overall ---
        const busiestDay = TheatreIntelligence.top(stats.dayCounts);
        if (busiestDay) {
            facts.push({
                icon: "📅",
                text: `${busiestDay.name} has been the busiest day ${since}.`
            });
        }

        // --- Top on-call person ---
        const topOnCall = TheatreIntelligence.top(stats.onCallCounts);
        if (topOnCall && topOnCall.count > 1) {
            facts.push({
                icon: "👑",
                text: `${topOnCall.name} has done the most on-calls ${since}, with ${topOnCall.count}.`
            });
        }

        // --- Top workload person ---
        const topWorkload = TheatreIntelligence.top(stats.sessionCounts);
        if (topWorkload && topWorkload.count > 1) {
            facts.push({
                icon: "💪",
                text: `${topWorkload.name} has the busiest workload ${since}, with ${topWorkload.count} sessions.`
            });
        }

        // --- Overall totals ---
        facts.push({
            icon: "📊",
            text: `${stats.totalSessions} theatre session${stats.totalSessions === 1 ? "" : "s"} recorded ${since}.`
        });

        if (stats.totalOnCalls > 0) {
            facts.push({
                icon: "🌙",
                text: `${stats.totalOnCalls} on-call shift${stats.totalOnCalls === 1 ? "" : "s"} covered ${since}.`
            });
        }

        // --- Staffing ---
        facts.push(stats.staffingGaps > 0
            ? { icon: "⚠️", text: `${stats.staffingGaps} theatre session${stats.staffingGaps === 1 ? "" : "s"} ${since} had no ODP allocated.` }
            : { icon: "✅", text: `Every theatre session ${since} has been fully staffed. Nice work.` }
        );

        return facts;
    }

    // Time-of-day greeting, e.g. "Good morning"
    static timeGreeting() {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning";
        if (hour < 18) return "Good afternoon";
        return "Good evening";
    }

    // A little rotating line under the greeting - one picked at random
    // each time the panel opens, independent of the facts themselves.
    static randomTagline() {
        const lines = [
            "here's what stood out recently.",
            "let's see what the data says.",
            "a peek behind the rota.",
            "here's something you might not know.",
            "the numbers have a few things to share.",
            "here's today's theatre trivia.",
            "let's find out who's been busy."
        ];
        return lines[Math.floor(Math.random() * lines.length)];
    }

    // Sets the greeting line, e.g. "Good afternoon — a peek behind the rota."
    static updateGreeting() {
        const el = document.getElementById("insightsGreeting");
        if (!el) return;
        el.textContent =
            `${TheatreIntelligence.timeGreeting()} — ${TheatreIntelligence.randomTagline()}`;
    }

    // Fisher-Yates shuffle, then take the first n
    static randomPick(arr, n) {
        const copy = [...arr];
        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy.slice(0, n);
    }

    // Loads history, builds the fact pool, and picks 4 at random.
    // Called fresh every time the panel is opened.
    async refresh() {
        this.index = 0;
        this.facts = [{ icon: "🫀", text: "Loading theatre intelligence…" }];
        this.render();

        try {
            const rotas = await TheatreIntelligence.loadHistory();

            if (!rotas.length) {
                this.facts = [{ icon: "🫀", text: "No published rota data yet." }];
                this.render();
                return;
            }

            const stats = TheatreIntelligence.buildStats(rotas);
            const streaks = TheatreIntelligence.buildStreaks(rotas);
            const pool = TheatreIntelligence.buildFactPool(stats, streaks);
            this.facts = TheatreIntelligence.randomPick(pool, Math.min(4, pool.length));
            this.loaded = true;
        } catch (err) {
            console.error(err);
            this.facts = [{ icon: "⚠️", text: "Unable to load theatre intelligence right now." }];
        }

        this.render();
    }

    render() {
        const fact = this.facts[this.index];
        if (!fact) return;

        document.querySelector(".insight-icon").textContent = fact.icon;
        document.getElementById("insightTitle").textContent = "Did you know?";
        document.getElementById("insightText").textContent = fact.text;

        document.querySelectorAll(".dot").forEach((dot, i) => {
            dot.classList.toggle("active", i === this.index);
            dot.classList.toggle("hidden", i >= this.facts.length);
        });
    }

    next() {
        if (!this.facts.length) return;
        this.index = (this.index + 1) % this.facts.length;
        this.render();
    }

    previous() {
        if (!this.facts.length) return;
        this.index = (this.index - 1 + this.facts.length) % this.facts.length;
        this.render();
    }
}

const theatreIntelligence = new TheatreIntelligence();

window.addEventListener("DOMContentLoaded", () => {

    const panel = document.getElementById("insightsPanel");
    const overlay = document.getElementById("insightsOverlay");

    // This file is also loaded on tv.html for the wall-board ticker,
    // which has no panel/button - only the TheatreIntelligence class
    // itself is needed there. Skip wiring up the panel UI if it's absent.
    if (!panel || !overlay || !document.getElementById("insightsBtn")) return;

    function closePanel() {
        panel.classList.remove("show");
        overlay.classList.remove("show");
        setTimeout(() => {
            panel.classList.add("hidden");
            overlay.classList.add("hidden");
        }, 300);
    }

    document.getElementById("insightsBtn").addEventListener("click", () => {
        panel.classList.remove("hidden");
        overlay.classList.remove("hidden");

        requestAnimationFrame(() => {
            panel.classList.add("show");
            overlay.classList.add("show");
        });

        // Fresh greeting + random facts every time the panel opens
        TheatreIntelligence.updateGreeting();
        theatreIntelligence.refresh();
    });

    overlay.addEventListener("click", closePanel);

    document.getElementById("nextInsightBtn").addEventListener("click", () => {
        theatreIntelligence.next();
    });

    document.getElementById("prevInsightBtn").addEventListener("click", () => {
        theatreIntelligence.previous();
    });
});
