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

    // Local-date ISO (YYYY-MM-DD) - NOT toISOString(), which converts to
    // UTC and can shift "today" back a day in timezones ahead of UTC
    // (e.g. British Summer Time).
    static todayIso() {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
    }

    static DAY_OFFSETS = { Monday:0, Tuesday:1, Wednesday:2, Thursday:3,
                            Friday:4, Saturday:5, Sunday:6 };

    // ISO date of one named day within a given week. weekMonday is a
    // plain "YYYY-MM-DD" string, which Date parses as UTC midnight, and
    // toISOString() reads back out in UTC too - the arithmetic never
    // touches the browser's local timezone, so this is safe unlike the
    // toISOString() pattern flagged elsewhere in this app for "today".
    static dayIso(weekMonday, day) {
        const offset = StaffProfiles.DAY_OFFSETS[day];
        if (offset === undefined) return null;
        const d = new Date(weekMonday);
        d.setDate(d.getDate() + offset);
        return d.toISOString().split("T")[0];
    }

    static theatreLabel(name) {
        return name === "Cath Lab" ? "Cath Lab" : name.replace("Theatre ", "CT");
    }

    // Every searchable person: ODPs from config's ODP_NAMES, plus every
    // anaesthetist in ANAESTHETIST_NAMES. Cadence stores anaesthetists
    // under their real name directly (no separate initials/full-name
    // split), so key and label are the same value here.
    static allPeople() {
        const odps = (typeof ODP_NAMES !== "undefined" ? ODP_NAMES : [])
            .map(name => ({ role: "odp", key: name, label: name }));

        const anaes = (typeof ANAESTHETIST_NAMES !== "undefined" ? ANAESTHETIST_NAMES : [])
            .map(name => ({ role: "anaes", key: name, label: name }));

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
        const todayIso = StaffProfiles.todayIso();
        const theatreCounts = {};

        const anaesCounts = {};        // initials -> count, for "worked with most"
        const dayCounts = { Monday:0, Tuesday:0, Wednesday:0, Thursday:0, Friday:0 };
        let sessions = 0, weekdayOnCalls = 0, weekendOnCalls = 0, supportShifts = 0;
        let firstWeek = null;
        let lastOnCallDate = null;

        rotas.forEach(rota => {
            let appearedThisWeek = false;

            Object.entries(rota.days || {}).forEach(([day, value]) => {
                // A day only counts once it's actually happened - matches
                // Cadence's own Staff Leaderboard, which excludes days
                // later than today within the week currently in progress.
                const dayIso = StaffProfiles.dayIso(rota.week, day);
                if (dayIso && dayIso > todayIso) return;

                (value.theatres || []).forEach(t => {
                    if (t.odp1 === name || t.odp2 === name) {
                        sessions++;
                        appearedThisWeek = true;
                        const label = StaffProfiles.theatreLabel(t.theatre);
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

                // Weekend waiting list runs in Theatre 5 - Cadence counts
                // it as a real Theatre 5 session, so this has to as well.
                const wl = value.waitingList || {};
                if (wl.odp === name) {
                    sessions++;
                    appearedThisWeek = true;
                    theatreCounts["CT5"] = (theatreCounts["CT5"] || 0) + 1;
                    if (wl.anaesthetist) {
                        anaesCounts[wl.anaesthetist] = (anaesCounts[wl.anaesthetist] || 0) + 1;
                    }
                }

                const oc = value.onCall || {};
                const onThisDay = oc.odp === name || oc.odp1 === name || oc.odp2 === name;
                if (onThisDay) {
                    appearedThisWeek = true;
                    if (value.weekend) weekendOnCalls++; else weekdayOnCalls++;
                    if (dayIso && (!lastOnCallDate || dayIso > lastOnCallDate)) {
                        lastOnCallDate = dayIso;
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
        const todayIso = StaffProfiles.todayIso();
        const theatreCounts = {};

        const odpCounts = {};          // odp name -> count, for "worked with most"
        const dayCounts = { Monday:0, Tuesday:0, Wednesday:0, Thursday:0, Friday:0 };
        let sessions = 0, weekdayOnCalls = 0, weekendOnCalls = 0;
        let firstWeek = null;
        let lastOnCallDate = null;

        rotas.forEach(rota => {
            let appearedThisWeek = false;

            Object.entries(rota.days || {}).forEach(([day, value]) => {
                const dayIso = StaffProfiles.dayIso(rota.week, day);
                if (dayIso && dayIso > todayIso) return;

                (value.theatres || []).forEach(t => {
                    if (t.anaesthetist === initials) {
                        sessions++;
                        appearedThisWeek = true;
                        const label = StaffProfiles.theatreLabel(t.theatre);
                        theatreCounts[label] = (theatreCounts[label] || 0) + 1;
                        if (dayCounts[day] !== undefined) dayCounts[day]++;
                        [t.odp1, t.odp2].filter(Boolean).forEach(odp => {
                            odpCounts[odp] = (odpCounts[odp] || 0) + 1;
                        });
                    }
                });

                const wl = value.waitingList || {};
                if (wl.anaesthetist === initials) {
                    sessions++;
                    appearedThisWeek = true;
                    theatreCounts["CT5"] = (theatreCounts["CT5"] || 0) + 1;
                    if (wl.odp) odpCounts[wl.odp] = (odpCounts[wl.odp] || 0) + 1;
                }

                const oc = value.onCall || {};
                if (oc.anaesthetist === initials) {
                    appearedThisWeek = true;
                    if (value.weekend) weekendOnCalls++; else weekdayOnCalls++;
                    if (dayIso && (!lastOnCallDate || dayIso > lastOnCallDate)) {
                        lastOnCallDate = dayIso;
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

    // ---- Leaderboard: top 5 in each category, across everyone at once ----
    // Same tallying logic as buildOdpStats/buildAnaesStats, just run once
    // over every person instead of filtered to one name.
    static buildLeaderboard(rotas) {
        const todayIso = StaffProfiles.todayIso();
        const odpSessions = {}, odpOnCalls = {}, odpSupport = {};
        const anaesSessions = {}, anaesOnCalls = {};
        const partnerCounts = {};      // anaesthetist -> {odp: sessions together}

        rotas.forEach(rota => {
            Object.entries(rota.days || {}).forEach(([day, value]) => {
                const dayIso = StaffProfiles.dayIso(rota.week, day);
                if (dayIso && dayIso > todayIso) return;

                (value.theatres || []).forEach(t => {
                    [t.odp1, t.odp2].filter(Boolean).forEach(odp => {
                        odpSessions[odp] = (odpSessions[odp] || 0) + 1;
                        if (t.anaesthetist) {
                            partnerCounts[t.anaesthetist] = partnerCounts[t.anaesthetist] || {};
                            partnerCounts[t.anaesthetist][odp] = (partnerCounts[t.anaesthetist][odp] || 0) + 1;
                        }
                    });
                    if (t.anaesthetist) {
                        anaesSessions[t.anaesthetist] = (anaesSessions[t.anaesthetist] || 0) + 1;
                    }
                });

                const s = value.support || {};
                [s.odp1, s.odp2, s.odp3].filter(Boolean).forEach(odp => {
                    odpSupport[odp] = (odpSupport[odp] || 0) + 1;
                });

                // Weekend waiting list runs in Theatre 5 - counts as a real
                // theatre session, same as Cadence's own leaderboard.
                const wl = value.waitingList || {};
                if (wl.odp) odpSessions[wl.odp] = (odpSessions[wl.odp] || 0) + 1;
                if (wl.anaesthetist) anaesSessions[wl.anaesthetist] = (anaesSessions[wl.anaesthetist] || 0) + 1;
                if (wl.odp && wl.anaesthetist) {
                    partnerCounts[wl.anaesthetist] = partnerCounts[wl.anaesthetist] || {};
                    partnerCounts[wl.anaesthetist][wl.odp] = (partnerCounts[wl.anaesthetist][wl.odp] || 0) + 1;
                }

                const oc = value.onCall || {};
                if (oc.odp) odpOnCalls[oc.odp] = (odpOnCalls[oc.odp] || 0) + 1;
                [oc.odp1, oc.odp2].filter(Boolean).forEach(odp => {
                    odpOnCalls[odp] = (odpOnCalls[odp] || 0) + 1;
                });
                if (oc.anaesthetist) anaesOnCalls[oc.anaesthetist] = (anaesOnCalls[oc.anaesthetist] || 0) + 1;
            });
        });

        // One row per anaesthetist who's actually had a theatre session,
        // naming whichever ODP has worked with them the most.
        const partners = Object.entries(partnerCounts)
            .map(([anaes, counts]) => {
                const top = StaffProfiles.topN(counts, 1)[0];
                return top ? { anaes, topOdp: top[0], count: top[1] } : null;
            })
            .filter(Boolean)
            .sort((a, b) => a.anaes.localeCompare(b.anaes));

        return {
            weekCount: rotas.length,
            categories: [
                { title: "Most Theatre Sessions", role: "odp", counts: odpSessions },
                { title: "Most On-Call Shifts", role: "odp", counts: odpOnCalls },
                { title: "Most Support Shifts", role: "odp", counts: odpSupport },
                { title: "Busiest Anaesthetists", role: "anaes", counts: anaesSessions },
                { title: "Most On-Calls (Anaesthetists)", role: "anaes", counts: anaesOnCalls }
            ],
            partners
        };
    }

    // ---- Monthly awards: best SODP each month for sessions and on-call ----
    // Two separate mini-awards per month rather than one blended score, so
    // a busy theatre month and a heavy on-call month can each be
    // recognised on their own terms. Grouped by the day's own calendar
    // month (not the week's Monday), so a week straddling month-end
    // splits correctly between the two months it actually falls in.
    static monthLabel(monthKey) {
        const names = ["January","February","March","April","May","June",
                        "July","August","September","October","November","December"];
        const [y, m] = monthKey.split("-").map(Number);
        return `${names[m - 1]} ${y}`;
    }

    // Every name sharing the top count, as [[name,count],...] - a genuine
    // tie gets joint winners rather than an arbitrary pick.
    static topTied(counts) {
        const entries = Object.entries(counts);
        if (!entries.length) return [];
        const max = Math.max(...entries.map(([, c]) => c));
        return entries.filter(([, c]) => c === max).sort((a, b) => a[0].localeCompare(b[0]));
    }

    static buildMonthlyAwards(rotas) {
        const todayIso = StaffProfiles.todayIso();
        const sessionsByMonth = {};
        const onCallsByMonth = {};

        rotas.forEach(rota => {
            Object.entries(rota.days || {}).forEach(([day, value]) => {
                const dayIso = StaffProfiles.dayIso(rota.week, day);
                if (dayIso && dayIso > todayIso) return;
                const month = dayIso.slice(0, 7);

                sessionsByMonth[month] = sessionsByMonth[month] || {};
                onCallsByMonth[month] = onCallsByMonth[month] || {};

                (value.theatres || []).forEach(t => {
                    [t.odp1, t.odp2].filter(Boolean).forEach(odp => {
                        sessionsByMonth[month][odp] = (sessionsByMonth[month][odp] || 0) + 1;
                    });
                });

                // Weekend waiting list counts as a Theatre 5 session here too.
                const wl = value.waitingList || {};
                if (wl.odp) sessionsByMonth[month][wl.odp] = (sessionsByMonth[month][wl.odp] || 0) + 1;

                const oc = value.onCall || {};
                if (oc.odp) onCallsByMonth[month][oc.odp] = (onCallsByMonth[month][oc.odp] || 0) + 1;
                [oc.odp1, oc.odp2].filter(Boolean).forEach(odp => {
                    onCallsByMonth[month][odp] = (onCallsByMonth[month][odp] || 0) + 1;
                });
            });
        });

        const months = [...new Set([...Object.keys(sessionsByMonth), ...Object.keys(onCallsByMonth)])]
            .sort((a, b) => b.localeCompare(a))
            .slice(0, 6);

        return months
            .map(month => ({
                month,
                label: StaffProfiles.monthLabel(month),
                sessionWinners: StaffProfiles.topTied(sessionsByMonth[month] || {}),
                onCallWinners: StaffProfiles.topTied(onCallsByMonth[month] || {})
            }))
            .filter(m => m.sessionWinners.length || m.onCallWinners.length);
    }

    static renderLeaderboard(lb, monthly) {
        const el = document.getElementById("staffProfile");
        const since = lb.weekCount === 1 ? "this week" : `across the last ${lb.weekCount} published weeks`;

        const sections = lb.categories.map(cat => {
            const top = StaffProfiles.topN(cat.counts, 5);
            const rows = top.length
                ? top.map(([name, count], i) => `
                    <button class="staff-result" data-role="${cat.role}" data-key="${name}">
                        <span>${i + 1}. ${name}</span>
                        <span class="staff-count">${count}</span>
                    </button>`).join("")
                : `<p class="staff-empty">No data recorded yet.</p>`;

            return `
                <div class="staff-section">
                    <h3>${cat.title}</h3>
                    ${rows}
                </div>`;
        }).join("");

        const partnerRows = lb.partners.length
            ? lb.partners.map(p => `
                <button class="staff-result" data-role="anaes" data-key="${p.anaes}">
                    <span>${p.anaes}</span>
                    <span class="staff-count">${p.topOdp} (${p.count})</span>
                </button>`).join("")
            : `<p class="staff-empty">No pairings recorded yet.</p>`;

        const partnerSection = `
            <div class="staff-section">
                <h3>Anaesthetists' Top ODP Partner</h3>
                ${partnerRows}
            </div>`;

        const monthlyHtml = monthly.length
            ? monthly.map(m => {
                const sessionBadges = m.sessionWinners.length
                    ? m.sessionWinners.map(([name, count]) =>
                        `<button class="staff-badge staff-award-badge" data-role="odp" data-key="${name}">Most Sessions: ${name} · ${count}</button>`).join("")
                    : "";
                const onCallBadges = m.onCallWinners.length
                    ? m.onCallWinners.map(([name, count]) =>
                        `<button class="staff-badge staff-award-badge" data-role="odp" data-key="${name}">Most On-Call: ${name} · ${count}</button>`).join("")
                    : "";
                return `
                    <div class="staff-month">
                        <div class="staff-month-label">${m.label}</div>
                        <div class="staff-badges">${sessionBadges}${onCallBadges}</div>
                    </div>`;
            }).join("")
            : `<p class="staff-empty">Not enough data yet for a monthly award.</p>`;

        const monthlySection = `
            <div class="staff-section">
                <h3>Monthly Awards</h3>
                ${monthlyHtml}
            </div>`;

        el.innerHTML = `
            <div class="staff-card">
                <h2>Leaderboard</h2>
                <p class="staff-subtitle">Top 5 ${since}</p>
                ${sections}
                ${partnerSection}
                ${monthlySection}
            </div>`;

        el.querySelectorAll(".staff-result, .staff-award-badge").forEach(btn => {
            btn.onclick = () => StaffProfiles.loadProfile(btn.dataset.role, btn.dataset.key, btn.dataset.key);
        });
    }

    static async showLeaderboard() {
        document.getElementById("staffSearchInput").value = "";
        document.getElementById("staffResults").classList.add("hidden");
        document.getElementById("staffProfile").innerHTML = `<p class="staff-loading">Loading leaderboard…</p>`;

        const rotas = await StaffProfiles.ensureHistory();
        StaffProfiles.renderLeaderboard(
            StaffProfiles.buildLeaderboard(rotas),
            StaffProfiles.buildMonthlyAwards(rotas)
        );
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
            badges.push({ label: `${topTheatre[0]} Specialist` });
        }

        // All-rounder: worked in every known theatre type
        if (stats.distinctTheatres >= theatreUniverseSize) {
            badges.push({ label: "All-Rounder" });
        }

        // On-call veteran
        if (stats.totalOnCalls >= 15) {
            badges.push({ label: "On-Call Veteran" });
        }

        // Team player: wide range of people worked with
        if (distinctPartners >= 8) {
            badges.push({ label: "Team Player" });
        }

        // Session milestones
        const milestones = [200, 100, 50, 25];
        const reached = milestones.find(m => totalSessions >= m);
        if (reached) {
            badges.push({ label: `${reached} Theatre Sessions` });
        }

        return badges;
    }

    // ---- Rendering ----

    static renderSearchResults(matches) {
        const box = document.getElementById("staffResults");
        if (!matches.length) { box.innerHTML = ""; box.classList.add("hidden"); return; }

        box.innerHTML = matches.slice(0, 8).map(p => `
            <button class="staff-result" data-role="${p.role}" data-key="${p.key}">
                <span>${p.label}</span>
                <span class="staff-role-tag">${p.role === "odp" ? "ODP" : "Anaesthetist"}</span>
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
        document.getElementById("staffProfile").innerHTML = `<p class="staff-loading">Loading profile…</p>`;

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
                    <a href="#" class="staff-back staff-leaderboard-link">← Leaderboard</a>
                    <h2>${displayName}</h2>
                    <p class="staff-empty">No published rota data found for ${displayName} yet.</p>
                </div>`;
            StaffProfiles.wireLeaderboardLink();
            return;
        }

        // However many theatres this department has configured in
        // Cadence - not assumed to be the old fixed 5.
        const theatreUniverse = (typeof CADENCE_THEATRES !== "undefined" && CADENCE_THEATRES.length) || 5;
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
            return `<div class="staff-list-row"><span>${i + 1}. ${label}</span><span>${count}</span></div>`;
        }).join("") || `<p class="staff-empty">No pairings recorded yet.</p>`;

        const dayRows = Object.entries(stats.dayCounts).map(([day, count]) =>
            `<div class="staff-list-row"><span>${day}</span><span>${count}</span></div>`
        ).join("");

        const badgeRow = badges.length
            ? badges.map(b => `<span class="staff-badge">${b.label}</span>`).join("")
            : `<p class="staff-empty">No badges earned yet - keep publishing weeks!</p>`;

        el.innerHTML = `
            <div class="staff-card">
                <a href="#" class="staff-back staff-leaderboard-link">← Leaderboard</a>
                <h2>${displayName} <span class="staff-role-tag">${stats.role === "odp" ? "ODP" : "Anaesthetist"}</span></h2>

                <div class="staff-section">
                    <h3>Overview</h3>
                    <div class="staff-list-row"><span>Total theatre sessions</span><span>${stats.sessions}</span></div>
                    ${stats.role === "odp" ? `<div class="staff-list-row"><span>Support shifts</span><span>${stats.supportShifts}</span></div>` : ""}
                    <div class="staff-list-row"><span>On-call shifts</span><span>${stats.totalOnCalls}</span></div>
                    <div class="staff-list-row"><span>Different theatres worked</span><span>${stats.distinctTheatres}</span></div>
                    <div class="staff-list-row"><span>First recorded rota</span><span>${stats.firstWeek ? ViewerUtils.formatWeek(stats.firstWeek) : "-"}</span></div>
                </div>

                <div class="staff-section">
                    <h3>Theatre Experience</h3>
                    ${theatreRows}
                </div>

                <div class="staff-section">
                    <h3>${partnerLabel}</h3>
                    ${partnerRows}
                </div>

                <div class="staff-section">
                    <h3>Work Pattern</h3>
                    ${dayRows}
                </div>

                <div class="staff-section">
                    <h3>On Call</h3>
                    <div class="staff-list-row"><span>Weekday on-calls</span><span>${stats.weekdayOnCalls}</span></div>
                    <div class="staff-list-row"><span>Weekend on-calls</span><span>${stats.weekendOnCalls}</span></div>
                    <div class="staff-list-row"><span>Last on-call</span><span>${StaffProfiles.timeAgo(stats.lastOnCallDate)}</span></div>
                </div>

                <div class="staff-section">
                    <h3>Achievements</h3>
                    <div class="staff-badges">${badgeRow}</div>
                </div>
            </div>
        `;
        StaffProfiles.wireLeaderboardLink();
    }

    // Shared by both render() exit points (the "no data" card and the
    // full profile card) - both include a "← Leaderboard" link.
    static wireLeaderboardLink() {
        const link = document.querySelector(".staff-leaderboard-link");
        if (!link) return;
        link.onclick = (e) => { e.preventDefault(); StaffProfiles.showLeaderboard(); };
    }

    static init() {
        const input = document.getElementById("staffSearchInput");

        // Built fresh on every search rather than once at init - ODP_NAMES/
        // ANAESTHETIST_NAMES arrive asynchronously from Cadence, and this
        // page's search box (unlike everything else here) isn't gated
        // behind any await on that data, so a snapshot taken at init time
        // could easily still be empty.
        input.addEventListener("input", () => {
            const q = input.value.trim().toLowerCase();
            if (!q) { StaffProfiles.renderSearchResults([]); return; }
            const matches = StaffProfiles.allPeople().filter(p => p.label.toLowerCase().includes(q));
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

        StaffProfiles.showLeaderboard();
    }
}

document.addEventListener("DOMContentLoaded", () => StaffProfiles.init());
