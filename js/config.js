// config.js
const LOCAL_BACKEND = "http://localhost:5000";
const PROD_BACKEND = "https://phishguard-backend-v2yh.onrender.com";

// Auto detect default backend based on hosting context
const getAutoBackend = () => {
  const isLocal = window.location.hostname === "localhost" || 
                  window.location.hostname === "127.0.0.1" || 
                  window.location.protocol === "file:";
  return isLocal ? LOCAL_BACKEND : PROD_BACKEND;
};

// Retrieve configured backend base URL
const getBackendBaseUrl = () => {
  const source = localStorage.getItem("pg_backend_source") || "production";
  if (source === "local") return LOCAL_BACKEND;
  if (source === "production") return PROD_BACKEND;
  if (source === "custom") return localStorage.getItem("pg_backend_custom_url") || LOCAL_BACKEND;
  if (source === "auto") return getAutoBackend();
  return PROD_BACKEND;
};

const API_CONFIG = {
  get SSL_REPORT() {
    return `${getBackendBaseUrl()}/api/ssl`;
  },
  get PHISHING_PREDICT() {
    return `${getBackendBaseUrl()}/api/predict`;
  },
  get HEALTH() {
    return `${getBackendBaseUrl()}/`;
  },
  getBackendBaseUrl
};