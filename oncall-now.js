/* =====================================================
   Cardiothoracic Theatre Viewer
   oncall-now.js
   -----------------------------------------------------
   The "ON CALL NOW" hero card.

   Department on-call hours (every handover at 06:30):
     - Mon-Fri:  19:00 -> 06:30 next morning (incl. Fri night)
     - Saturday: 06:30 Sat -> 06:30 Sun
     - Sunday:   06:30 Sun -> 06:30 Mon

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

        // Department cover rules:
        //   Mon-Fri:   that day's on-call runs 19:00 -> 06:30 next morning
        //              (including Friday -> Saturday 06:30)
        //   Saturday:  weekend cover runs Sat 06:30 -> Sun 06:30
        //   Sunday:    weekend cover runs Sun 06:30 -> Mon 06:30

        // Before 06:30: still on the PREVIOUS day's cover
        if (mins < HANDOVER) {
            if (day === 1)   // early Monday -> Sunday's weekend cover
                return { active: true, label: "ON CALL NOW", dayKey: "Sunday", weekend: true };
            if (day === 0)   // early Sunday -> Saturday's weekend cover
                return { active: true, label: "ON CALL NOW", dayKey: "Saturday", weekend: true };
            if (day === 6)   // early Saturday -> Friday's weekday on-call
                return { active: true, label: "ON CALL NOW", dayKey: "Friday", weekend: false };
            // early Tue-Fri -> previous weekday's on-call
            return { active: true, label: "ON CALL NOW", dayKey: names[day - 1], weekend: false };
        }

        // From 06:30 at the weekend: that day's 24-hour cover is live
        if (day === 6)
            return { active: true, label: "ON CALL NOW", dayKey: "Saturday", weekend: true };
        if (day === 0)
            return { active: true, label: "ON CALL NOW", dayKey: "Sunday", weekend: true };

        // Weekday evening: tonight's cover is live
        if (mins >= NIGHT_START)
            return { active: true, label: "ON CALL NOW", dayKey: names[day], weekend: false };

        // Weekday daytime: show tonight's cover as upcoming
        return { active: false, label: "TONIGHT'S ON CALL", dayKey: names[day], weekend: false };
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
            people += `<div class="now-person">👤 ${oc.odp1 || oc.odp || "-"}${oc.session1 ? ` <span class="now-session">${oc.session1}</span>` : ""}</div>`;
            if (oc.odp2)
                people += `<div class="now-person">👤 ${oc.odp2}${oc.session2 ? ` <span class="now-session">${oc.session2}</span>` : ""}</div>`;
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
