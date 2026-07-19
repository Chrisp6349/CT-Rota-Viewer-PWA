/* =====================================================
   Cardiothoracic Theatre Viewer
   oncall-now.js
   -----------------------------------------------------
   The "ON CALL NOW" hero card.

   Department on-call hours (every handover at 06:30):
     - Mon-Fri:      19:00 -> 06:30 next morning (incl. Fri night)
     - Bank holiday: 06:30 -> 06:30 next morning (like a weekend)
     - Saturday:     06:30 Sat -> 06:30 Sun
     - Sunday:       06:30 Sun -> 06:30 Mon
     - Weekend AM/PM split: AM 06:30-18:30, PM 18:30-06:30

   Outside those hours (weekday daytime) the card shows
   TONIGHT'S cover as upcoming instead. The card only
   appears when the loaded rota is the current real-world
   week - it hides itself on archived weeks.
   ===================================================== */

class OnCallNow {

    // Monday (YYYY-MM-DD) of the week containing `d`
    static mondayOf(d) {
        const m = new Date(d);
        m.setDate(d.getDate() - ((d.getDay() + 6) % 7));
        return m.toISOString().split("T")[0];
    }

    // The week whose rota holds the cover that applies right now.
    // Before the 06:30 handover we're still on YESTERDAY's cover -
    // which in the early hours of Monday means LAST week's Sunday.
    static coverWeek(now) {
        const a = new Date(now);
        if (a.getHours() * 60 + a.getMinutes() < 6 * 60 + 30) {
            a.setDate(a.getDate() - 1);
        }
        return OnCallNow.mondayOf(a);
    }

    static status(now) {
        const day = now.getDay();              // 0=Sun ... 6=Sat
        const mins = now.getHours() * 60 + now.getMinutes();
        const names = ["Sunday","Monday","Tuesday","Wednesday",
                       "Thursday","Friday","Saturday"];

        const NIGHT_START = 19 * 60;           // weekday on-call starts 19:00
        const HANDOVER    = 6 * 60 + 30;       // every handover is at 06:30
        const SEG_SWITCH  = 18 * 60 + 30;      // weekend AM->PM switch 18:30

        // Weekend AM/PM segment for the current moment:
        // AM = 06:30-18:30, PM = 18:30-06:30 next morning
        const segment = (mins >= HANDOVER && mins < SEG_SWITCH) ? "AM" : "PM";

        // ISO dates of today and yesterday, for bank holiday checks
        const iso = (d) => d.toISOString().split("T")[0];
        const todayIso = iso(now);
        const yd = new Date(now); yd.setDate(yd.getDate() - 1);
        const yesterdayIso = iso(yd);
        const bh = (typeof isBankHoliday === "function");

        // Before 06:30: still on the PREVIOUS day's cover
        if (mins < HANDOVER) {
            if (day === 1)   // early Monday -> Sunday's weekend cover (PM segment)
                return { active: true, label: "ON CALL NOW", dayKey: "Sunday", weekend: true, segment: "PM" };
            if (day === 0)   // early Sunday -> Saturday's weekend cover (PM segment)
                return { active: true, label: "ON CALL NOW", dayKey: "Saturday", weekend: true, segment: "PM" };
            if (day === 6)   // early Saturday -> Friday's weekday on-call
                return { active: true, label: "ON CALL NOW", dayKey: "Friday", weekend: false };
            // early Tue-Fri -> previous weekday's on-call
            return { active: true, label: "ON CALL NOW", dayKey: names[day - 1], weekend: false };
        }

        // From 06:30 at the weekend: that day's cover is live, in segments
        if (day === 6)
            return { active: true, label: "ON CALL NOW", dayKey: "Saturday", weekend: true, segment };
        if (day === 0)
            return { active: true, label: "ON CALL NOW", dayKey: "Sunday", weekend: true, segment };

        // Bank holiday weekday: cover runs 06:30 -> 06:30 like a weekend,
        // using that weekday's on-call entry - so it's live all day
        if (bh && isBankHoliday(todayIso))
            return { active: true, label: "ON CALL NOW", dayKey: names[day], weekend: false };

        // Weekday evening: tonight's cover is live
        if (mins >= NIGHT_START)
            return { active: true, label: "ON CALL NOW", dayKey: names[day], weekend: false };

        // Weekday daytime: show tonight's cover as upcoming
        return { active: false, label: "TONIGHT'S ON CALL", dayKey: names[day], weekend: false };
    }

    // For a weekend on-call entry, returns only the people whose
    // session covers the given segment ("AM"/"PM"). "ALL DAY" or a
    // blank session covers both segments.
    static weekendOnDuty(oc, segment) {
        const entries = [
            { name: oc.odp1 || oc.odp, session: String(oc.session1 || "").toUpperCase() },
            { name: oc.odp2, session: String(oc.session2 || "").toUpperCase() }
        ].filter(e => e.name);

        const onDuty = entries.filter(e =>
            e.session === segment || e.session === "ALL DAY" || e.session === "");

        // If nothing matches the segment (odd data), fall back to all
        return onDuty.length ? onDuty : entries;
    }

    // Renders (or hides) the hero card for the given rota
    static update(rota) {
        const mount = document.getElementById("onCallNowMount");
        if (!mount) return;

        const now = new Date();

        // Only when the loaded rota holds the cover period that
        // applies right now (early Monday belongs to LAST week)
        if (rota.week !== OnCallNow.coverWeek(now)) {
            mount.innerHTML = "";
            return;
        }

        const s = OnCallNow.status(now);
        const value = rota.days[s.dayKey];
        if (!value) { mount.innerHTML = ""; return; }

        let people = "";

        if (s.weekend) {
            const oc = value.onCall || {};
            const onDuty = OnCallNow.weekendOnDuty(oc, s.segment);
            if (onDuty.length) {
                onDuty.forEach(e => {
                    people += `<div class="now-person">👤 ${e.name}${e.session && e.session !== "ALL DAY" ? ` <span class="now-session">${e.session}</span>` : ""}</div>`;
                });
            } else {
                people += `<div class="now-person">👤 -</div>`;
            }
            people += `<div class="now-anaes">${oc.anaesthetist ? anaesEmoji(oc.anaesthetist) : "👨‍⚕️"} ${oc.anaesthetist || "-"}</div>`;
        } else {
            const oc = value.onCall || {};
            people += `<div class="now-person">👤 ${oc.odp || "-"}</div>`;
            if (oc.extra) people += `<div class="now-extra">🟡 ${oc.extra}</div>`;
            if (oc.fromHome) people += `<div class="now-fromhome">🏠 FROM HOME</div>`;
            people += `<div class="now-anaes">${oc.anaesthetist ? anaesEmoji(oc.anaesthetist) : "👨‍⚕️"} ${oc.anaesthetist || "-"}</div>`;
        }

        mount.innerHTML = `
            <div class="oncall-now ${s.active ? "now-active" : "now-upcoming"}">
                <div class="now-badge">
                    ${s.active ? `<span class="now-pulse"></span>` : ""}
                    ${s.label}
                </div>
                <div class="now-people">${people}</div>
            </div>
        `;
    }
}
