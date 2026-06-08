/* ===== NAVBAR MOBILE TOGGLE ===== */
function toggleMenu() {
  const nav = document.getElementById("nav-links");
  nav.classList.toggle("active");
}

/* ===== UNICODE / HOMOGRAPH DETECTION ===== */
function containsUnicode(input) {
  try {
    input = decodeURIComponent(input);
  } catch (e) {}

  return /[^\x00-\x7F]/.test(input);
}

function hasUnicodeDomain(input) {
  try {
    let formattedUrl = input.trim();

    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = "https://" + formattedUrl;
    }

    const hostname = new URL(formattedUrl).hostname;

    return /[^\x00-\x7F]/.test(hostname);
  } catch {
    return true;
  }
}

/* ===== SSL REPORT FUNCTION ===== */
async function getSSLReport(url) {
  try {
    const res = await fetch(
      "https://phishguard-backend-v2yh.onrender.com/api/ssl",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ url })
      }
    );

    return await res.json();
  } catch (err) {
    console.error("SSL Error:", err);
    return {};
  }
}

/* ===== PHISHING CHECK ===== */
async function checkUrl() {
  const urlInput = document.getElementById("url");
  const result = document.getElementById("result");
  const confidence = document.getElementById("confidence");
  const button = document.querySelector(".check-btn");

  const url = urlInput.value.trim();

  /* ===== UNICODE BLOCKING ===== */
  if (!url) {
    return showResult("⚠️ Please enter a URL", "phishing");
  }

  if (containsUnicode(url)) {
    showResult("🚨 UNICODE URL DETECTED", "phishing");
    confidence.innerText =
      "Analysis Stopped: Unicode characters found in URL.";
    return;
  }

  if (hasUnicodeDomain(url)) {
    showResult("🚨 UNICODE DOMAIN DETECTED", "phishing");
    confidence.innerText =
      "Possible Homograph (IDN) phishing attack.";
    return;
  }

  const urlPattern =
    /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/.*)?$/i;

  if (!urlPattern.test(url)) {
    return showResult("⚠️ Invalid URL format", "phishing");
  }

  button.disabled = true;
  button.innerText = "Checking...";
  result.innerText = "⏳ Analyzing URL...";
  confidence.innerText = "";

  /* ===== SSL LOADING STATE ===== */
  if (document.getElementById("ssl-status")) {
    document.getElementById("ssl-status").textContent =
      "🔄 Scanning...";
  }

  if (document.getElementById("ssl-issuer")) {
    document.getElementById("ssl-issuer").textContent = "-";
  }

  if (document.getElementById("ssl-expiry")) {
    document.getElementById("ssl-expiry").textContent = "-";
  }

  try {
    const response = await fetch(
      "https://phishguard-backend-v2yh.onrender.com/api/predict",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ url })
      }
    );

    if (!response.ok) {
      throw new Error("Server error");
    }

    const data = await response.json();

    /* ===== SSL INTEGRATION ===== */
    const sslData = await getSSLReport(url);

    const sslCard = document.getElementById("ssl-card");

    if (sslCard) {
      sslCard.style.display = "block";
    }

    /* ===== SSL FIELDS ===== */
    const tlsEl = document.getElementById("ssl-status");
    const issuerEl = document.getElementById("ssl-issuer");
    const expiryEl = document.getElementById("ssl-expiry");

    if (tlsEl) {
      tlsEl.textContent = sslData.tls_version || "N/A";
    }

    if (issuerEl) {
      issuerEl.textContent = sslData.issuer || "N/A";
    }

    if (expiryEl) {
      expiryEl.textContent = sslData.valid_to || "N/A";
    }

    /* ===== EXTRA SSL FIELDS ===== */
    const domainEl = document.getElementById("ssl-domain");
    const ipEl = document.getElementById("ssl-ip");
    const issuedEl = document.getElementById("ssl-issued");
    const cipherEl = document.getElementById("ssl-cipher");
    const hstsEl = document.getElementById("ssl-hsts");

    if (domainEl) {
      domainEl.textContent = sslData.domain || "N/A";
    }

    if (ipEl) {
      ipEl.textContent = sslData.ip || "N/A";
    }

    if (issuedEl) {
      issuedEl.textContent = sslData.issued_to || "N/A";
    }

    if (cipherEl) {
      cipherEl.textContent = sslData.cipher || "N/A";
    }

    if (hstsEl) {
      hstsEl.textContent = sslData.hsts || "Not Enabled";
    }

    /* ===== ORIGINAL RESULT ===== */
    if (data.prediction === "Phishing") {
      showResult("🔴 PHISHING DETECTED", "phishing");
    } else {
      showResult("🟢 SAFE URL", "safe");
    }

    confidence.innerText =
      `Confidence: ${data.confidence}% | Risk Level: ${data.risk_level}`;

    /* ===== FINAL COMBINED RESULT ===== */
    let finalMessage = "";
    let finalType = "safe";

    if (data.prediction === "Phishing") {
      finalMessage = "🔴 DANGEROUS";
      finalType = "phishing";
    } else if (!sslData.tls_version || !sslData.issuer) {
      finalMessage = "⚠️ SUSPICIOUS";
      finalType = "phishing";
    } else {
      finalMessage = "🟢 SAFE";
      finalType = "safe";
    }

    showResult(finalMessage, finalType);

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
  } else {
    result.classList.add("phishing-card");
  }

  result.innerHTML = message;
}