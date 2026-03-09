/* ===== NAVBAR MOBILE TOGGLE ===== */
function toggleMenu() {
    const nav = document.getElementById("navLinks");
    nav.classList.toggle("active");
}


/* ===== PHISHING CHECK ===== */
async function checkUrl() {

    const urlInput = document.getElementById("url");
    const result = document.getElementById("result");
    const confidence = document.getElementById("confidence");
    const button = document.querySelector(".check-btn");

    const featureTable = document.getElementById("featureTable");
    const indicatorsList = document.getElementById("indicators");
    const riskScore = document.getElementById("riskScore");

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

    result.innerText = "⏳ Analyzing URL...";
    confidence.innerText = "";

    try {

        const response = await fetch(
            "http://127.0.0.1:5000/api/predict",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ url: url })
            }
        );

        if (!response.ok) {
            throw new Error("Server error");
        }

        const data = await response.json();


        /* ===== RESULT ===== */

        if (data.prediction === "Phishing") {

            showResult("🔴 PHISHING DETECTED", "phishing");

        } else {

            showResult("🟢 SAFE URL", "safe");
        }

        confidence.innerText =
            "Confidence: " + data.confidence + "% | Risk Level: " + data.risk_level;


        /* ===== RISK SCORE ===== */

        if (riskScore && data.risk_score !== undefined) {
            riskScore.innerText = "Risk Score: " + data.risk_score + "%";
        }


        /* ===== TOP RISK INDICATORS ===== */

        if (indicatorsList && data.top_indicators) {

            indicatorsList.innerHTML = "";

            data.top_indicators.forEach(indicator => {

                const li = document.createElement("li");

                li.innerText =
                    indicator.feature + " (impact: " +
                    indicator.impact.toFixed(3) + ")";

                indicatorsList.appendChild(li);
            });
        }


        /* ===== FEATURE REPORT TABLE ===== */

        if (featureTable && data.features) {

            featureTable.innerHTML = "";

            Object.entries(data.features).forEach(([feature, info]) => {

                let statusColor = "green";

                if (info.status === "Suspicious") statusColor = "orange";
                if (info.status === "Phishing") statusColor = "red";

                const row = `
                    <tr>
                        <td>${feature}</td>
                        <td>${info.value}</td>
                        <td style="color:${statusColor}; font-weight:600">
                            ${info.status}
                        </td>
                    </tr>
                `;

                featureTable.innerHTML += row;
            });
        }

    } catch (error) {

        console.error(error);

        showResult("❌ Backend not reachable", "phishing");
        confidence.innerText = "";

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
    }
    else {
        result.classList.add("phishing-card");
    }

    result.innerHTML = message;
}



/* ===== CONTACT FORM ===== */

document.addEventListener("DOMContentLoaded", function () {

    const form = document.getElementById("contactForm");
    const sendBtn = form?.querySelector("button");

    if (!form) return;

    form.addEventListener("submit", async function (e) {

        e.preventDefault();

        const name = document.getElementById("name").value.trim();
        const email = document.getElementById("email").value.trim();
        const message = document.getElementById("message").value.trim();

        if (!name || !email || !message) {
            alert("Please fill all fields");
            return;
        }

        sendBtn.disabled = true;
        sendBtn.innerText = "Sending...";

        try {

            const response = await fetch(
                "https://phishguard-backend-a8yw.onrender.com/api/feedback",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name, email, message })
                }
            );

            if (!response.ok) throw new Error("Server error");

            alert("✅ Message sent successfully!");
            form.reset();

        } catch (err) {

            alert("❌ Failed to send message.");

        } finally {

            sendBtn.disabled = false;
            sendBtn.innerText = "Send";

        }

    });

});