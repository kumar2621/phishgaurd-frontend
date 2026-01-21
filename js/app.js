/* ===== NAVBAR MOBILE TOGGLE ===== */
function toggleMenu() {
    const nav = document.getElementById("navLinks");
    nav.classList.toggle("active");
}

/* ===== PHISHING CHECK ===== */
async function checkUrl() {
    const urlInput = document.getElementById("url");
    const result = document.getElementById("result");
    const button = document.querySelector(".check-btn");

    const url = urlInput.value.trim();
    const urlPattern = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/.*)?$/i;

    if (!url) {
        showResult("⚠️ Please enter a URL", "phishing");
        return;
    }

    if (!urlPattern.test(url)) {
        showResult("⚠️ Invalid URL format", "phishing");
        return;
    }

    button.disabled = true;
    button.innerText = "Checking...";
    showResult("⏳ Checking URL...", "phishing");

    try {
        const response = await fetch(
            "https://phishguard-backend-a8yw.onrender.com/api/predict",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url })
            }
        );

        const data = await response.json();

        if (data.prediction === "Safe") {
            showResult("🛡️ SAFE URL", "safe");
        } else {
            showResult("⚠️ PHISHING DETECTED", "phishing");
        }

    } catch (error) {
        showResult("❌ Backend not reachable", "phishing");
    } finally {
        button.disabled = false;
        button.innerText = "Check";
    }
}

/* ===== RESULT UI HANDLER ===== */
function showResult(message, type) {
    const result = document.getElementById("result");

    result.className = "result-card";

    if (type === "safe") {
        result.classList.add("safe-card");
    } else {
        result.classList.add("phishing-card");
    }

    result.innerHTML = message;
}
