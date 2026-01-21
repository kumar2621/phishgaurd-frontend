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

/* ===== CONTACT FORM SUBMISSION ===== */
/* ===== CONTACT FORM SUBMISSION ===== */
document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("contactForm");
    const sendBtn = form?.querySelector("button");

    if (!form) {
        console.error("contactForm not found");
        return;
    }

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

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000); // 10 sec timeout

        try {
            const response = await fetch(
                "https://phishguard-backend-a8yw.onrender.com/api/feedback",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ name, email, message }),
                    signal: controller.signal
                }
            );

            clearTimeout(timeout);

            if (!response.ok) {
                throw new Error("Server error");
            }

            alert("✅ Message sent successfully!");
            form.reset();

        } catch (err) {
            if (err.name === "AbortError") {
                alert("❌ Server timeout. Please try again later.");
            } else {
                alert("❌ Failed to send message.");
            }
        } finally {
            sendBtn.disabled = false;
            sendBtn.innerText = "Send";
        }
    });
});
