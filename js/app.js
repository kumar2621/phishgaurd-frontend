/* ===== BACKEND CONFIG ===== */
const BACKEND_BASE_URL = "https://phishguard-backend-v2yh.onrender.com";

/* ===== TIMEOUT-AWARE FETCH HELPER ===== */
async function fetchWithTimeout(resource, options = {}, timeoutMs = 20000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal
    });
    return response;
  } finally {
    clearTimeout(id);
  }
}

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
    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/ssl`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ url })
      },
      12000 // 12-second timeout for SSL inspection
    );

    if (!res.ok) {
      return {
        success: false,
        error_type: "HTTP_ERROR",
        error: `Server responded with status ${res.status}`
      };
    }

    return await res.json();
  } catch (err) {
    const isTimeout = err.name === "AbortError";
    console.error("SSL Error:", err);
    return {
      success: false,
      error_type: isTimeout ? "TIMEOUT" : "NETWORK_ERROR",
      error: isTimeout
        ? "SSL scan timed out (target server took too long)"
        : "Failed to connect to SSL scanner"
    };
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
    document.getElementById("ssl-status").textContent = "🔄 Scanning...";
  }
  if (document.getElementById("ssl-issuer")) {
    document.getElementById("ssl-issuer").textContent = "-";
  }
  if (document.getElementById("ssl-expiry")) {
    document.getElementById("ssl-expiry").textContent = "-";
  }

  // Visual helper if backend is waking from cold start
  let coldStartTimer = setTimeout(() => {
    result.innerHTML =
      "⏳ Analyzing URL...<br><span style='font-size:0.85rem; color:#00d4ff;'>Backend server is waking up, please wait...</span>";
  }, 3500);

  try {
    /* ===== PARALLEL REQUESTS FOR SPEED ===== */
    const [predictData, sslData] = await Promise.all([
      fetchWithTimeout(
        `${BACKEND_BASE_URL}/api/predict`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ url })
        },
        25000 // 25s timeout allows for Render cold start
      ).then(async (res) => {
        if (!res.ok) throw new Error(`Predict error (${res.status})`);
        return await res.json();
      }),
      getSSLReport(url)
    ]);

    clearTimeout(coldStartTimer);

    /* ===== SSL INTEGRATION ===== */
    const sslCard = document.getElementById("ssl-card");
    if (sslCard) {
      sslCard.style.display = "block";
    }

    /* ===== POPULATE SSL FIELDS ===== */
    const tlsEl = document.getElementById("ssl-status");
    const issuerEl = document.getElementById("ssl-issuer");
    const expiryEl = document.getElementById("ssl-expiry");
    const domainEl = document.getElementById("ssl-domain");
    const ipEl = document.getElementById("ssl-ip");
    const issuedEl = document.getElementById("ssl-issued");
    const cipherEl = document.getElementById("ssl-cipher");
    const hstsEl = document.getElementById("ssl-hsts");

    let fallbackHostname = "";
    try {
      fallbackHostname = new URL(url.startsWith("http") ? url : "https://" + url).hostname;
    } catch (e) {}

    if (sslData && sslData.success) {
      if (tlsEl) tlsEl.textContent = sslData.tls_version || "N/A";
      if (issuerEl) issuerEl.textContent = sslData.issuer || "N/A";
      if (expiryEl) expiryEl.textContent = sslData.valid_to || "N/A";
      if (domainEl) domainEl.textContent = sslData.domain || fallbackHostname || "N/A";
      if (ipEl) ipEl.textContent = sslData.ip || "N/A";
      if (issuedEl) issuedEl.textContent = sslData.issued_to || "N/A";
      if (cipherEl) cipherEl.textContent = sslData.cipher || "N/A";
      if (hstsEl) hstsEl.textContent = sslData.hsts || "Not Enabled";
    } else {
      // Clear informative error message instead of bare "N/A"
      const errorMsg = sslData ? (sslData.error || "Inspection Unavailable") : "Unavailable";
      if (tlsEl) tlsEl.textContent = `⚠️ ${errorMsg}`;
      if (issuerEl) issuerEl.textContent = sslData && sslData.error_type === "TIMEOUT" ? "Timed Out" : "Unavailable";
      if (expiryEl) expiryEl.textContent = "Unavailable";
      if (domainEl) domainEl.textContent = (sslData && sslData.domain) || fallbackHostname || "N/A";
      if (ipEl) ipEl.textContent = (sslData && sslData.ip) || "Unavailable";
      if (issuedEl) issuedEl.textContent = "Unavailable";
      if (cipherEl) cipherEl.textContent = "Unavailable";
      if (hstsEl) hstsEl.textContent = (sslData && sslData.hsts) || "Not Checked";
    }

    /* ===== SMART VERDICT LOGIC ===== */
    let finalMessage = "";
    let finalType = "safe";
    let isPhishing = predictData.prediction === "Phishing";

    // Handle confidence and safety score cleanly (compatible with old & new backend)
    let confidenceVal = predictData.confidence;
    let riskLevel = predictData.risk_level || "Low";

    if (!isPhishing && predictData.safety_score !== undefined) {
      confidenceVal = predictData.safety_score;
    } else if (!isPhishing && confidenceVal !== undefined && confidenceVal < 50) {
      // If backend returned raw phishing probability, invert to show true legitimate confidence
      confidenceVal = Number((100 - confidenceVal).toFixed(2));
    }

    let confidenceNote = "";

    if (isPhishing) {
      finalMessage = "🔴 DANGEROUS";
      finalType = "phishing";
      confidenceNote = `Confidence: ${confidenceVal}% (Phishing) | Risk Level: ${riskLevel}`;
    } else if (sslData && sslData.success === false && sslData.error_type === "SSL_INVALID") {
      // Genuine certificate failure (e.g. self-signed, invalid host, expired)
      finalMessage = "⚠️ SUSPICIOUS (Invalid SSL)";
      finalType = "phishing";
      confidenceNote = "Security Alert: Untrusted or expired SSL certificate | Risk Level: Medium";
    } else if (sslData && sslData.success === false && sslData.error_type === "NO_SSL") {
      // Port 443 refused / no HTTPS
      finalMessage = "⚠️ INSECURE (No SSL)";
      finalType = "phishing";
      confidenceNote = "Warning: Website lacks HTTPS encryption | Risk Level: Medium";
    } else {
      // Legitimate URL according to ML model
      finalMessage = "🟢 SAFE";
      finalType = "safe";
      confidenceNote = `Confidence: ${confidenceVal}% (Legitimate) | Risk Level: ${riskLevel}`;
      if (sslData && sslData.success === false && sslData.error_type === "TIMEOUT") {
        confidenceNote += " (Note: SSL check timed out)";
      }
    }

    showResult(finalMessage, finalType);
    confidence.innerText = confidenceNote;


  } catch (error) {
    clearTimeout(coldStartTimer);
    console.error(error);
    const isTimeout = error.name === "AbortError";
    const msg = isTimeout
      ? "⏱️ Request timed out. The server took too long to respond. Please try again."
      : "❌ Backend not reachable";
    showResult(msg, "phishing");
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
