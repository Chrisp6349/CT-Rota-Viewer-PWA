/* =====================================================
   Cardiothoracic Theatre Viewer
   config.js
   -----------------------------------------------------
   Staff, theatres, and bank holidays used to be hardcoded
   here; they now come live from Cadence (the department
   set in cadence-config.js) instead. This file still
   exposes them under the same names the rest of the app
   already expects, so nothing downstream needs to know
   they arrive asynchronously.

   ODP_NAMES/CADENCE_THEATRES/BANK_HOLIDAYS_SET start empty
   and get filled in place once CadenceData.ready resolves.
   Nothing that reads them (My Week's name picker, the
   theatre grid, bank-holiday labels) runs before then in
   practice: api.js's RotaAPI methods all await
   CadenceData.ready internally before returning rota data,
   and everything else only runs after that data has loaded.

   Cadence has no anaesthetist-initials-to-full-name concept
   (anaesthetists are stored under their real display name
   directly) so ANAES_NAMES/anaesName() are gone - every
   caller already checks `typeof anaesName === "function"`
   first and falls back gracefully.
   ===================================================== */

const ODP_NAMES = [];
const CADENCE_THEATRES = [];   // [{id, name}, ...] in display order
const BANK_HOLIDAYS_SET = new Set();

function isBankHoliday(iso) {
    return BANK_HOLIDAYS_SET.has(iso);
}

// Kept as a no-op so every existing `${anaesEmoji(x)} ${x}` call site
// still works untouched - names alone already read as clearly distinct
// without a doctor icon.
function anaesEmoji() {
    return "";
}

const CadenceData = {
    ready: (async () => {
        await CadenceAuth.token();

        const [dept, theatres, staff] = await Promise.all([
            CadenceFirestore.getDoc(`departments/${CADENCE.DEPARTMENT_ID}`),
            CadenceFirestore.listCollection(`departments/${CADENCE.DEPARTMENT_ID}/theatres`),
            CadenceFirestore.listCollection(`departments/${CADENCE.DEPARTMENT_ID}/staff`)
        ]);

        theatres
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .forEach(t => CADENCE_THEATRES.push({ id: t.id, name: t.name || t.id }));

        staff
            .filter(s => s.type === "odp")
            .forEach(s => ODP_NAMES.push(s.rotaName || s.name));

        Object.keys((dept && dept.bankHolidays) || {}).forEach(iso => BANK_HOLIDAYS_SET.add(iso));

        return { dept, theatres: CADENCE_THEATRES, odps: ODP_NAMES };
    })()
};
