/* =====================================================
   Cardiothoracic Theatre Viewer
   staff.js
   -----------------------------------------------------
   Searchable staff profiles - one page for both ODPs and
   anaesthetists. Type a name, pick from the list, see a
   full breakdown built from every published week: session
   counts, theatre experience, who they work with most,
   work pattern, on-call frequency, and a few achievement
   badges.

   Reuses TheatreIntelligence.loadHistory() from insights.js
   rather than re-fetching the archive itself.
   ===================================================== */

class StaffProfiles {

    static rotas = null;   // cached once per page load

    // Every searchable person: ODPs from config's ODP_NAMES, plus every
    // anaesthetist in ANAES_NAMES (displayed by full name, matched in
    // the data by initials).
    static allPeople() {
        const odps = (typeof ODP_NAMES !== "undefined" ? ODP_NAMES : [])
            .map(name => ({ role: "odp", key: name, label: name }));

        const anaes = Object.entries(typeof ANAES_NAMES !== "undefined" ? ANAES_NAMES : {})
            .map(([initials, name]) => ({ role: "anaes", key: initials, label: name }));

        return [...odps, ...anaes].sort((a, b) => a.label.localeCompare(b.label));
    }

    static async ensureHistory() {
        if (!StaffProfiles.rotas) {
            StaffProfiles.rotas = await TheatreIntelligence.loadHistory();
        }
        return StaffProfiles.rotas;
    }

    // ---- ODP stats ----
       static buildOdpStats(rotas, name) {
        const todayIso = new Date().toISOString().split("T")[0];
        const theatreCounts = {};

        const anaesCounts = {};        // initials -> count, for "worked with most"
        const dayCounts = { Monday:0, Tuesday:0, Wednesday:0, Thursday:0, Friday:0 };
        let sessions = 0, weekdayOnCalls = 0, weekendOnCalls = 0, supportShifts = 0;
        let firstWeek = null;
        let lastOnCallDate = null;

        const dayOffsets = { Monday:0, Tuesday:1, Wednesday:2, Thursday:3,
                              Friday:4, Saturday:5, Sunday:6 };

        rotas.forEach(rota => {
            let appearedThisWeek = false;

            Object.entries(rota.days || {}).forEach(([day, value]) => {
                (value.theatres || []).forEach(t => {
                    if (t.odp1 === name || t.odp2 === name) {
                        sessions++;
                        appearedThisWeek = true;
                        const label = t.theatre === "Cath Lab"
                            ? "Cath Lab" : t.theatre.replace("Theatre ", "CT");
                        theatreCounts[label] = (theatreCounts[label] || 0) + 1;
                        if (dayCounts[day] !== undefined) dayCounts[day]++;
                        if (t.anaesthetist) {
                            anaesCounts[t.anaesthetist] = (anaesCounts[t.anaesthetist] || 0) + 1;
                        }
                    }
                });

                const s = value.support || {};
                if ([s.odp1, s.odp2, s.odp3].includes(name)) {
                    supportShifts++;
                    appearedThisWeek = true;
                }

                               const oc = value.onCall || {};
                const onThisDay = oc.odp === name || oc.odp1 === name || oc.odp2 === name;
                if (onThisDay) {
                    appearedThisWeek = true;
                    if (value.weekend) weekendOnCalls++; else weekdayOnCalls++;

                    const offset = dayOffsets[day];
                    if (offset !== undefined) {
                        const d = new Date(rota.week);
                        d.setDate(d.getDate() + offset);
                        const iso = d.toISOString().split("T")[0];
                        // Only counts as "last on-call" if it's today or in
                        // the past - a future date within an already-
                        // published week hasn't happened yet.
                        if (iso <= todayIso && (!lastOnCallDate || iso > lastOnCallDate)) {
                            lastOnCallDate = iso;
                        }
                    }
                }

            });

            if (appearedThisWeek && !firstWeek) firstWeek = rota.week;
        });

        return {
            role: "odp", name, sessions, supportShifts,
            weekdayOnCalls, weekendOnCalls, totalOnCalls: weekdayOnCalls + weekendOnCalls,
            theatreCounts, anaesCounts, dayCounts, firstWeek, lastOnCallDate,
            distinctTheatres: Object.keys(theatreCounts).length,
            distinctAnaes: Object.keys(anaesCounts).length
        };
    }

    // ---- Anaesthetist stats ----
       static buildAnaesStats(rotas, initials) {
        const todayIso = new Date().toISOString().split("T")[0];
        const theatreCounts = {};

        const odpCounts = {};          // odp name -> count, for "worked with most"
        const dayCounts = { Monday:0, Tuesday:0, Wednesday:0, Thursday:0, Friday:0 };
        let sessions = 0, weekdayOnCalls = 0, weekendOnCalls = 0;
        let firstWeek = null;
        let lastOnCallDate = null;

        const dayOffsets = { Monday:0, Tuesday:1, Wednesday:2, Thursday:3,
                              Friday:4, Saturday:5, Sunday:6 };

        rotas.forEach(rota => {
            let appearedThisWeek = false;

            Object.entries(rota.days || {}).forEach(([day, value]) => {
                (value.theatres || []).forEach(t => {
                    if (t.anaesthetist === initials) {
                        sessions++;
                        appearedThisWeek = true;
                        const label = t.theatre === "Cath Lab"
                            ? "Cath Lab" : t.theatre.replace("Theatre ", "CT");
                        theatreCounts[label] = (theatreCounts[label] || 0) + 1;
                        if (dayCounts[day] !== undefined) dayCounts[day]++;
                        [t.odp1, t.odp2].filter(Boolean).forEach(odp => {
                            odpCounts[odp] = (odpCounts[odp] || 0) + 1;
                        });
                    }
                });

                const oc = value.onCall || {};
                if (oc.anaesthetist === initials) {
                    appearedThisWeek = true;
                    if (value.weekend) weekendOnCalls++; else weekdayOnCalls++;

                    const offset = dayOffsets[day];
                    if (offset !== undefined) {
                        const d = new Date(rota.week);
                        d.setDate(d.getDate() + offset);
                        const iso = d.toISOString().split("T")[0];
                        if (!lastOnCallDate || iso > lastOnCallDate) lastOnCallDate = iso;
                    }
                }
            });

            if (appearedThisWeek && !firstWeek) firstWeek = rota.week;
        });

        return {
            role: "anaes", name: initials, sessions,
            weekdayOnCalls, weekendOnCalls, totalOnCalls: weekdayOnCalls + weekendOnCalls,
            theatreCounts, odpCounts: odpCounts, dayCounts, firstWeek, lastOnCallDate,
            distinctTheatres: Object.keys(theatreCounts).length,
            distinctOdps: Object.keys(odpCounts).length
        };
    }

    // Top N entries from a {name: count} object, as [[name,count],...]
    static topN(counts, n) {
        return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, n);
    }

    static totalOf(counts) {
        return Object.values(counts).reduce((a, b) => a + b, 0);
    }

    // How long ago a date was, in a friendly form
    static timeAgo(iso) {
        if (!iso) return "Never recorded";
        const days = Math.round((new Date() - new Date(iso)) / 86400000);
        if (days <= 0) return "Today";
        if (days === 1) return "Yesterday";
        if (days < 14) return `${days} days ago`;
        const weeks = Math.round(days / 7);
        if (weeks < 8) return `${weeks} weeks ago`;
        const months = Math.round(days / 30);
        return `${months} month${months === 1 ? "" : "s"} ago`;
    }

    // Achievement badges, computed from the same stats - thresholds are
    // deliberately modest early on and will trigger more as more weeks
    // are published.
    static buildBadges(stats, theatreUniverseSize) {
        const badges = [];
        const totalSessions = stats.sessions;

        const partnerCounts = stats.role === "odp" ? stats.anaesCounts : stats.odpCounts;
        const distinctPartners = Object.keys(partnerCounts).length;

        // Theatre specialist: one theatre clearly dominant (40%+ share, min 5 sessions)
        const topTheatre = StaffProfiles.topN(stats.theatreCounts, 1)[0];
        if (topTheatre && totalSessions >= 5 && (topTheatre[1] / totalSessions) >= 0.4) {
            badges.push({ icon: "🏆", label: `${topTheatre[0]} Specialist` });
        }

        // All-rounder: worked in every known theatre type
        if (stats.distinctTheatres >= theatreUniverseSize) {
            badges.push({ icon: "🔄", label: "All-Rounder" });
        }

        // On-call veteran
        if (stats.totalOnCalls >= 15) {
            badges.push({ icon: "🚨", label: "On-Call Veteran" });
        }

        // Team player: wide range of people worked with
        if (distinctPartners >= 8) {
            badges.push({ icon: "🤝", label: "Team Player" });
        }

        // Session milestones
        const milestones = [200, 100, 50, 25];
        const reached = milestones.find(m => totalSessions >= m);
        if (reached) {
            badges.push({ icon: "🌟", label: `${reached} Theatre Sessions` });
        }

        return badges;
    }

    // ---- Rendering ----

    static renderSearchResults(matches) {
        const box = document.getElementById("staffResults");
        if (!matches.length) { box.innerHTML = ""; box.classList.add("hidden"); return; }

        box.innerHTML = matches.slice(0, 8).map(p => `
            <button class="staff-result" data-role="${p.role}" data-key="${p.key}">
                ${p.role === "odp" ? "👤" : (anaesEmoji ? anaesEmoji(p.key) : "👨‍⚕️")}
                <span>${p.label}</span>
            </button>
        `).join("");
        box.classList.remove("hidden");

        box.querySelectorAll(".staff-result").forEach(btn => {
            btn.onclick = () => StaffProfiles.loadProfile(btn.dataset.role, btn.dataset.key, btn.querySelector("span").textContent);
        });
    }

    static async loadProfile(role, key, label) {
        document.getElementById("staffSearchInput").value = label;
        document.getElementById("staffResults").classList.add("hidden");
        document.getElementById("staffProfile").innerHTML = `<p class="staff-loading">🫀 Loading profile…</p>`;

        const rotas = await StaffProfiles.ensureHistory();
        const stats = role === "odp"
            ? StaffProfiles.buildOdpStats(rotas, key)
            : StaffProfiles.buildAnaesStats(rotas, key);

        StaffProfiles.render(stats, label);
    }

    static render(stats, displayName) {
        const el = document.getElementById("staffProfile");

        if (stats.sessions === 0 && stats.totalOnCalls === 0 &&
            (stats.role === "odp" ? stats.supportShifts === 0 : true)) {
            el.innerHTML = `
                <div class="staff-card">
                    <h2>${displayName}</h2>
                    <p class="staff-empty">No published rota data found for ${displayName} yet.</p>
                </div>`;
            return;
        }

        const theatreUniverse = 5; // CT1, CT2, CT4, CT5, Cath Lab
        const badges = StaffProfiles.buildBadges(stats, theatreUniverse);

        const theatreRows = StaffProfiles.topN(stats.theatreCounts, 10).map(([name, count]) => {
            const pct = Math.round((count / stats.sessions) * 100);
            return `<div class="staff-bar-row">
                <span class="staff-bar-label">${name}</span>
                <div class="staff-bar-track"><div class="staff-bar-fill" style="width:${pct}%"></div></div>
                <span class="staff-bar-value">${count} (${pct}%)</span>
            </div>`;
        }).join("") || `<p class="staff-empty">No theatre sessions recorded yet.</p>`;

        const partnerCounts = stats.role === "odp" ? stats.anaesCounts : stats.odpCounts;
        const partnerLabel = stats.role === "odp" ? "Anaesthetists worked with most" : "ODPs worked with most";
        const partnerRows = StaffProfiles.topN(partnerCounts, 5).map(([key, count], i) => {
            const label = stats.role === "odp"
                ? (typeof anaesName === "function" ? anaesName(key) : key)
                : key;
            const emoji = stats.role === "odp" && typeof anaesEmoji === "function" ? anaesEmoji(key) + " " : "👤 ";
            return `<div class="staff-list-row"><span>${i + 1}. ${emoji}${label}</span><span>${count}</span></div>`;
        }).join("") || `<p class="staff-empty">No pairings recorded yet.</p>`;

        const dayRows = Object.entries(stats.dayCounts).map(([day, count]) =>
            `<div class="staff-list-row"><span>${day}</span><span>${count}</span></div>`
        ).join("");

        const badgeRow = badges.length
            ? badges.map(b => `<span class="staff-badge">${b.icon} ${b.label}</span>`).join("")
            : `<p class="staff-empty">No badges earned yet - keep publishing weeks!</p>`;

        el.innerHTML = `
            <div class="staff-card">
                <h2>${stats.role === "odp" ? "👤" : "👨‍⚕️"} ${displayName}</h2>

                <div class="staff-section">
                    <h3>📈 Overview</h3>
                    <div class="staff-list-row"><span>Total theatre sessions</span><span>${stats.sessions}</span></div>
                    ${stats.role === "odp" ? `<div class="staff-list-row"><span>Support shifts</span><span>${stats.supportShifts}</span></div>` : ""}
                    <div class="staff-list-row"><span>On-call shifts</span><span>${stats.totalOnCalls}</span></div>
                    <div class="staff-list-row"><span>Different theatres worked</span><span>${stats.distinctTheatres}</span></div>
                    <div class="staff-list-row"><span>First recorded rota</span><span>${stats.firstWeek ? ViewerUtils.formatWeek(stats.firstWeek) : "-"}</span></div>
                </div>

                <div class="staff-section">
                    <h3>🏥 Theatre Experience</h3>
                    ${theatreRows}
                </div>

                <div class="staff-section">
                    <h3>${stats.role === "odp" ? "👨‍⚕️" : "🧑‍⚕️"} ${partnerLabel}</h3>
                    ${partnerRows}
                </div>

                <div class="staff-section">
                    <h3>📅 Work Pattern</h3>
                    ${dayRows}
                </div>

                <div class="staff-section">
                    <h3>🚨 On Call</h3>
                    <div class="staff-list-row"><span>Weekday on-calls</span><span>${stats.weekdayOnCalls}</span></div>
                    <div class="staff-list-row"><span>Weekend on-calls</span><span>${stats.weekendOnCalls}</span></div>
                    <div class="staff-list-row"><span>Last on-call</span><span>${StaffProfiles.timeAgo(stats.lastOnCallDate)}</span></div>
                </div>

                <div class="staff-section">
                    <h3>🏅 Achievements</h3>
                    <div class="staff-badges">${badgeRow}</div>
                </div>
            </div>
        `;
    }

    static init() {
        const input = document.getElementById("staffSearchInput");
        const people = StaffProfiles.allPeople();

        input.addEventListener("input", () => {
            const q = input.value.trim().toLowerCase();
            if (!q) { StaffProfiles.renderSearchResults([]); return; }
            const matches = people.filter(p => p.label.toLowerCase().includes(q));
            StaffProfiles.renderSearchResults(matches);
        });

        input.addEventListener("focus", () => {
            if (input.value.trim()) input.dispatchEvent(new Event("input"));
        });

        document.addEventListener("click", (e) => {
            if (!e.target.closest(".staff-search-wrap")) {
                document.getElementById("staffResults").classList.add("hidden");
            }
        });
    }
}

document.addEventListener("DOMContentLoaded", () => StaffProfiles.init());
