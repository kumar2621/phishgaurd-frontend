/* ===== PHISHING CHECK ===== */
async function checkUrl() {
    const urlInput = document.getElementById("url");
    const result = document.getElementById("result");

    const url = urlInput.value.trim();

    if (!url) {
        result.className = "result-card phishing-card";
        result.innerHTML = "⚠️ <span>Please enter a URL</span>";
        return;
    }

    // Loading state
    result.className = "result-card";
    result.innerHTML = "⏳ <span>Checking URL...</span>";

    try {
        const response = await fetch("https://phishguard-backend-a8yw.onrender.com/api/predict", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ url })
        });

        const data = await response.json();

        if (data.error) {
            result.className = "result-card phishing-card";
            result.innerHTML = "❌ <span>" + data.error + "</span>";
            return;
        }

        // ✅ CARD ALERT RESULT
        if (data.prediction === "Safe") {
            result.className = "result-card safe-card";
            result.innerHTML = "🛡️ <span>SAFE URL</span>";
        } else {
            result.className = "result-card phishing-card";
            result.innerHTML = "⚠️ <span>PHISHING DETECTED</span>";
        }

    } catch (err) {
        console.error(err);
        result.className = "result-card phishing-card";
        result.innerHTML = "❌ <span>Backend not reachable</span>";
    }
}
