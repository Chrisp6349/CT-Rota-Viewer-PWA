/* =====================================================
   Cardiothoracic Theatre Viewer
   cadence-firestore.js
   -----------------------------------------------------
   A minimal Firebase REST client - no SDK, no build step,
   same "everything is a plain fetch()" style as the rest
   of this app (and avoids the ES-module-vs-classic-script
   ordering headaches the full Firebase SDK would add to a
   page full of plain <script> tags). Two jobs:

     1. CadenceAuth - signs into the shared read-only
        "viewer" account in the background (no login UI),
        refreshing the token automatically as it nears
        expiry, and de-duplicating concurrent callers so
        two things needing a token at once only trigger
        one sign-in/refresh request.

     2. CadenceFirestore - reads Firestore documents and
        collections over the REST API and decodes
        Firestore's typed JSON ({"stringValue":"x"} etc)
        into plain JS values/objects.
   ===================================================== */

const CadenceAuth = {
    _idToken: null,
    _refreshToken: null,
    _expiresAt: 0,
    _pending: null,

    // Resolves with a valid ID token, signing in or refreshing first if
    // needed. Safe to call from multiple places at once - concurrent
    // callers before the first sign-in completes all share one request.
    async token() {
        if (this._idToken && Date.now() < this._expiresAt) return this._idToken;
        if (this._pending) return this._pending;

        this._pending = (this._refreshToken ? this._refresh().catch(() => this._signIn()) : this._signIn())
            .finally(() => { this._pending = null; });

        return this._pending;
    },

    async _signIn() {
        const r = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${CADENCE.API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: CADENCE.VIEWER_EMAIL,
                    password: CADENCE.VIEWER_PASSWORD,
                    returnSecureToken: true
                })
            }
        );
        if (!r.ok) throw new Error("Cadence sign-in failed: HTTP " + r.status);
        const data = await r.json();
        this._store(data.idToken, data.refreshToken, data.expiresIn);
        return this._idToken;
    },

    async _refresh() {
        const r = await fetch(
            `https://securetoken.googleapis.com/v1/token?key=${CADENCE.API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(this._refreshToken)}`
            }
        );
        if (!r.ok) throw new Error("Cadence token refresh failed: HTTP " + r.status);
        const data = await r.json();
        this._store(data.id_token, data.refresh_token, data.expires_in);
        return this._idToken;
    },

    _store(idToken, refreshToken, expiresInSeconds) {
        this._idToken = idToken;
        this._refreshToken = refreshToken;
        // Refresh a minute early so a request never straddles expiry.
        this._expiresAt = Date.now() + (Number(expiresInSeconds) - 60) * 1000;
    }
};

// Decodes one Firestore REST "Value" wrapper into a plain JS value.
function decodeFirestoreValue(v) {
    if (v == null) return null;
    if ("stringValue" in v) return v.stringValue;
    if ("booleanValue" in v) return v.booleanValue;
    if ("integerValue" in v) return Number(v.integerValue);
    if ("doubleValue" in v) return v.doubleValue;
    if ("nullValue" in v) return null;
    if ("timestampValue" in v) return v.timestampValue;
    if ("mapValue" in v) return decodeFirestoreFields(v.mapValue.fields);
    if ("arrayValue" in v) return (v.arrayValue.values || []).map(decodeFirestoreValue);
    return null;
}

// Decodes a Firestore REST document's "fields" object into a plain
// {key: value, ...} object.
function decodeFirestoreFields(fields) {
    const out = {};
    Object.entries(fields || {}).forEach(([k, v]) => { out[k] = decodeFirestoreValue(v); });
    return out;
}

const CadenceFirestore = {
    BASE: `https://firestore.googleapis.com/v1/projects/${CADENCE.PROJECT_ID}/databases/(default)/documents`,

    // One document at a specific path, e.g. "departments/cardiac".
    // Returns { id, ...decoded fields }, or null if it doesn't exist.
    async getDoc(path) {
        const token = await CadenceAuth.token();
        const r = await fetch(`${this.BASE}/${path}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (r.status === 404) return null;
        if (!r.ok) throw new Error(`Cadence read failed (${path}): HTTP ${r.status}`);
        const json = await r.json();
        return { id: path.split("/").pop(), ...decodeFirestoreFields(json.fields) };
    },

    // Every document directly inside a collection, e.g.
    // "departments/cardiac/theatres". Handles pagination - Firestore's
    // REST list endpoint pages results, so a growing weeks archive
    // doesn't silently get truncated.
    async listCollection(path) {
        const token = await CadenceAuth.token();
        const out = [];
        let pageToken = "";

        do {
            const url = new URL(`${this.BASE}/${path}`);
            url.searchParams.set("pageSize", "300");
            if (pageToken) url.searchParams.set("pageToken", pageToken);

            const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
            if (!r.ok) throw new Error(`Cadence list failed (${path}): HTTP ${r.status}`);
            const json = await r.json();

            (json.documents || []).forEach(doc => {
                out.push({ id: doc.name.split("/").pop(), ...decodeFirestoreFields(doc.fields) });
            });

            pageToken = json.nextPageToken || "";
        } while (pageToken);

        return out;
    }
};
