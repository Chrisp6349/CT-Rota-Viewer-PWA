/* =====================================================
   Cardiothoracic Theatre Viewer
   settings.js
   -----------------------------------------------------
   Small bottom-sheet panel for device-level preferences -
   dark mode and text size today, room for more later.
   Both preferences are also set before first paint by an
   inline <script> in index.html's <head> (same two
   localStorage keys: "theme" and "textSize"), so this file
   only needs to keep the panel's own controls in sync with
   whatever's already applied, not apply it itself on load.
   ===================================================== */

function setDarkMode(on) {
    if (on) {
        document.documentElement.dataset.theme = "dark";
        localStorage.setItem("theme", "dark");
    } else {
        delete document.documentElement.dataset.theme;
        localStorage.removeItem("theme");
    }
    const toggle = document.getElementById("darkModeToggle");
    if (toggle) toggle.setAttribute("aria-checked", String(on));
}

function setTextSize(size) {
    if (size === "normal") {
        delete document.documentElement.dataset.textSize;
        localStorage.removeItem("textSize");
    } else {
        document.documentElement.dataset.textSize = size;
        localStorage.setItem("textSize", size);
    }
    document.querySelectorAll(".settings-textsize-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.size === size);
    });
}

window.addEventListener("DOMContentLoaded", () => {

    const panel = document.getElementById("settingsPanel");
    const overlay = document.getElementById("settingsOverlay");
    const btn = document.getElementById("settingsBtn");
    if (!panel || !overlay || !btn) return;

    function openPanel() {
        panel.classList.remove("hidden");
        overlay.classList.remove("hidden");
        requestAnimationFrame(() => {
            panel.classList.add("show");
            overlay.classList.add("show");
        });
    }

    function closePanel() {
        panel.classList.remove("show");
        overlay.classList.remove("show");
        setTimeout(() => {
            panel.classList.add("hidden");
            overlay.classList.add("hidden");
        }, 300);
    }

    btn.addEventListener("click", openPanel);
    overlay.addEventListener("click", closePanel);

    const darkToggle = document.getElementById("darkModeToggle");
    if (darkToggle) {
        darkToggle.setAttribute("aria-checked", String(document.documentElement.dataset.theme === "dark"));
        darkToggle.addEventListener("click", () => {
            setDarkMode(document.documentElement.dataset.theme !== "dark");
        });
    }

    const currentSize = document.documentElement.dataset.textSize || "normal";
    document.querySelectorAll(".settings-textsize-btn").forEach(sizeBtn => {
        sizeBtn.classList.toggle("active", sizeBtn.dataset.size === currentSize);
        sizeBtn.addEventListener("click", () => setTextSize(sizeBtn.dataset.size));
    });
});
