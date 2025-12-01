
// uiComponents.js - UI组件模块
console.log("✅ uiComponents.js loaded");

// ✅ Insert badge next to Gmail subject line with feedback functionality
function showBadge(verdict, score, bgColor, textColor) {
  const oldBadge = document.getElementById("phishing-badge");
  if (oldBadge) oldBadge.remove();

  const subjectEl = document.querySelector("h2.hP");
  if (!subjectEl) {
    console.warn("❗ Email subject not found. Cannot insert badge.");
    return;
  }

  const badge = document.createElement("button");
  badge.id = "phishing-badge";
  badge.innerHTML = `🛡️ ${verdict} (${score})`;

  Object.assign(badge.style, {
    marginLeft: "10px",
    backgroundColor: bgColor,
    color: textColor,
    padding: "4px 8px",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: "bold",
    border: "none",
    cursor: "pointer",
    fontFamily: "Arial, sans-serif",
    verticalAlign: "middle"
  });

  // Store current prediction data for feedback
  badge.setAttribute("data-verdict", verdict);
  badge.setAttribute("data-score", score);

  badge.addEventListener("click", () => {
    showFeedbackPopup(verdict, score);
  });

  subjectEl.appendChild(badge);
}

// ✅ Show feedback status message
function showFeedbackStatus(message, type) {
  const existingStatus = document.getElementById("feedback-status");
  if (existingStatus) existingStatus.remove();

  const status = document.createElement("div");
  status.id = "feedback-status";
  status.innerHTML = message;

  const bgColor = type === "success" ? "#d4edda" : "#f8d7da";
  const textColor = type === "success" ? "#155724" : "#721c24";
  const borderColor = type === "success" ? "#c3e6cb" : "#f5c6cb";

  Object.assign(status.style, {
    position: "fixed",
    top: "20px",
    right: "20px",
    background: bgColor,
    color: textColor,
    border: `1px solid ${borderColor}`,
    padding: "12px 16px",
    borderRadius: "8px",
    fontFamily: "Arial, sans-serif",
    fontSize: "14px",
    zIndex: "10001",
    maxWidth: "300px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)"
  });

  document.body.appendChild(status);

  setTimeout(() => {
    if (status.parentNode) status.remove();
  }, 4000);
}

// ✅ Remove all UI elements when email view changes
function removeAllUIElements() {
  const elementsToRemove = [
    "phishing-badge",
    "phishing-popup", 
    "phishing-overlay",
    "report-popup",
    "report-overlay", 
    "feedback-status"
  ];
  
  elementsToRemove.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.remove();
      console.log(`🧹 Removed ${id}`);
    }
  });
}
