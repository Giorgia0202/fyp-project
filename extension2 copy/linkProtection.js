// linkProtection.js - Complete Working Version (No browser confirm dialog)
console.log("✅ linkProtection.js loaded - CUSTOM DIALOG VERSION");

// Global variables
let currentEmailVerdict = null;
let isProtectionActive = false;

// Set verdict function
function setCurrentEmailVerdict(verdict) {
  console.log(`🎯 setCurrentEmailVerdict called with: ${verdict}`);
  currentEmailVerdict = verdict;
  
  if (verdict === "SUSPICIOUS" || verdict === "PHISHING") {
    console.log("🚨 SUSPICIOUS/PHISHING detected - activating protection");
    activateLinkProtection();
  } else {
    console.log("✅ Safe email - deactivating protection");
    deactivateLinkProtection();
  }
}

// Activate protection
function activateLinkProtection() {
  if (isProtectionActive) {
    console.log("⚠️ Protection already active");
    return;
  }
  
  console.log("🔒 ACTIVATING LINK PROTECTION");
  isProtectionActive = true;
  
  // Add global click interceptor
  document.addEventListener("click", globalClickHandler, true);
  
  // Find and log links (but don't add visual indicators)
  setTimeout(() => {
    logProtectedLinks();
  }, 1000);
}

// Global click handler
function globalClickHandler(event) {
  if (!currentEmailVerdict || (currentEmailVerdict !== "SUSPICIOUS" && currentEmailVerdict !== "PHISHING")) {
    return;
  }
  
  const target = event.target;
  const link = target.closest("a[href]");
  
  if (link) {
    // Check if the link is within the email content area
    const emailContainers = [
      document.querySelector("div.a3s"),
      document.querySelector("div.ii.gt"),
      document.querySelector("div.adn"),
      document.querySelector("div.im")
    ].filter(el => el !== null);
    
    // Only intercept if link is inside email content
    const isInEmailContent = emailContainers.some(container => container.contains(link));
    
    if (isInEmailContent) {
      console.log(`🚨 SUSPICIOUS LINK CLICKED: ${link.href}`);
      console.log(`🚨 Link text: "${link.textContent}"`);
      
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      
      // Use CUSTOM dialog instead of browser confirm
      showCustomWarningDialog(link.href);
      return false;
    } else {
      console.log(`✅ Non-email link clicked: ${link.href} - allowing normal behavior`);
    }
  }
}

// Log protected links (no visual changes)
function logProtectedLinks() {
  console.log("🔍 Looking for links to protect...");
  
  const containers = [
    document.querySelector("div.a3s"),
    document.querySelector("div.ii.gt"),
    document.querySelector("div.adn"),
    document.querySelector("div.im")
  ].filter(el => el !== null);
  
  console.log(`📧 Found ${containers.length} email containers`);
  
  let totalLinks = 0;
  containers.forEach(container => {
    const links = container.querySelectorAll("a[href]");
    totalLinks += links.length;
    
    links.forEach((link, i) => {
      console.log(`🔗 Link ${i + 1}: "${link.textContent}" -> ${link.href}`);
      // NO visual indicators - links look normal
    });
  });
  
  console.log(`🔗 Total links found: ${totalLinks}`);
}

// CUSTOM WARNING DIALOG - NO BROWSER CONFIRM
function showCustomWarningDialog(url) {
  console.log(`🚨 Showing CUSTOM warning for: ${url}`);
  
  // Remove existing dialog if any
  const existingDialog = document.getElementById("custom-warning-dialog");
  if (existingDialog) existingDialog.remove();
  
  // Create overlay - perfectly centered
  const overlay = document.createElement("div");
  overlay.id = "custom-warning-overlay";
  overlay.style.cssText = `
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    background: rgba(0, 0, 0, 0.7) !important;
    z-index: 999999 !important;
    display: flex !important;
    justify-content: center !important;
    align-items: center !important;
    backdrop-filter: blur(5px) !important;
  `;
  
  // Create dialog - COMPACT VERSION
  const dialog = document.createElement("div");
  dialog.id = "custom-warning-dialog";
  dialog.style.cssText = `
    background: white !important;
    border-radius: 16px !important;
    padding: 24px !important;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4) !important;
    max-width: 420px !important;
    width: 85% !important;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif !important;
    text-align: center !important;
    transform: scale(0.8) !important;
    opacity: 0 !important;
    transition: all 0.3s ease-out !important;
  `;
  
  // Determine warning details
  const warningLevel = currentEmailVerdict === "PHISHING" ? "PHISHING" : "SUSPICIOUS";
  const warningColor = currentEmailVerdict === "PHISHING" ? "#dc3545" : "#fd7e14";
  const warningIcon = currentEmailVerdict === "PHISHING" ? "🚨" : "⚠️";
  
  dialog.innerHTML = `
    <div style="color: ${warningColor}; font-size: 48px; margin-bottom: 16px;">
      ${warningIcon}
    </div>
    
    <h2 style="color: #212529; margin: 0 0 16px 0; font-size: 20px; font-weight: 700; letter-spacing: -0.3px;">
      WARNING: ${warningLevel} EMAIL DETECTED
    </h2>
    
    <p style="color: #6c757d; margin: 0 0 20px 0; font-size: 14px; line-height: 1.5;">
      This email has been classified as <strong style="color: ${warningColor};">${warningLevel.toLowerCase()}</strong>.<br>
      The link you clicked may be dangerous:
    </p>
    
    <div style="
      background: linear-gradient(145deg, #f8f9fa, #e9ecef);
      border: 1px solid #dee2e6;
      border-radius: 12px;
      padding: 12px;
      margin: 16px 0 20px 0;
      font-family: 'SF Mono', Monaco, monospace;
      font-size: 12px;
      color: #495057;
      word-break: break-all;
      max-height: 80px;
      overflow-y: auto;
      box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
    ">
      ${url}
    </div>
    
    <p style="color: #495057; margin: 0 0 24px 0; font-size: 15px; font-weight: 600;">
      Are you sure you want to proceed?
    </p>
    
    <div style="display: flex; gap: 12px; justify-content: center;">
      <button id="custom-warning-cancel" style="
        background: linear-gradient(145deg, #f8f9fa, #e9ecef);
        color: #495057;
        border: 1px solid #ced4da;
        padding: 10px 20px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        min-width: 80px;
        transition: all 0.3s ease;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      ">Cancel</button>
      
      <button id="custom-warning-proceed" style="
        background: linear-gradient(145deg, ${warningColor}, ${warningColor}dd);
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        min-width: 80px;
        transition: all 0.3s ease;
        box-shadow: 0 2px 6px rgba(0,0,0,0.2);
      ">Proceed</button>
    </div>
  `;
  
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
  
  // Animate in
  setTimeout(() => {
    dialog.style.transform = "scale(1)";
    dialog.style.opacity = "1";
  }, 50);
  
  // Add enhanced hover effects
  const cancelBtn = document.getElementById("custom-warning-cancel");
  const proceedBtn = document.getElementById("custom-warning-proceed");
  
  cancelBtn.addEventListener("mouseenter", () => {
    cancelBtn.style.background = "linear-gradient(145deg, #e9ecef, #dee2e6)";
    cancelBtn.style.transform = "translateY(-1px)";
    cancelBtn.style.boxShadow = "0 3px 6px rgba(0,0,0,0.15)";
  });
  
  cancelBtn.addEventListener("mouseleave", () => {
    cancelBtn.style.background = "linear-gradient(145deg, #f8f9fa, #e9ecef)";
    cancelBtn.style.transform = "translateY(0)";
    cancelBtn.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
  });
  
  proceedBtn.addEventListener("mouseenter", () => {
    proceedBtn.style.transform = "translateY(-1px)";
    proceedBtn.style.boxShadow = "0 3px 8px rgba(0,0,0,0.3)";
  });
  
  proceedBtn.addEventListener("mouseleave", () => {
    proceedBtn.style.transform = "translateY(0)";
    proceedBtn.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)";
  });
  
  // Add event listeners
  cancelBtn.addEventListener("click", () => {
    console.log("🚫 User cancelled link navigation");
    closeDialog();
  });
  
  proceedBtn.addEventListener("click", () => {
    console.log("⚠️ User proceeded with suspicious link");
    closeDialog();
    setTimeout(() => {
      window.open(url, "_blank");
    }, 100);
  });
  
  // Close dialog function
  function closeDialog() {
    dialog.style.transform = "scale(0.8)";
    dialog.style.opacity = "0";
    setTimeout(() => overlay.remove(), 300);
  }
  
  // Close on overlay click
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      closeDialog();
    }
  });
  
  // Close on Escape key
  document.addEventListener("keydown", function handleEscape(e) {
    if (e.key === "Escape") {
      closeDialog();
      document.removeEventListener("keydown", handleEscape);
    }
  });
}

// Deactivate protection
function deactivateLinkProtection() {
  console.log("✅ DEACTIVATING LINK PROTECTION");
  isProtectionActive = false;
  document.removeEventListener("click", globalClickHandler, true);
}

// Reset function
function resetLinkProtection() {
  console.log("🔄 RESETTING LINK PROTECTION");
  currentEmailVerdict = null;
  deactivateLinkProtection();
}

// Expose functions globally
window.setCurrentEmailVerdict = setCurrentEmailVerdict;
window.resetLinkProtection = resetLinkProtection;

// Test function
window.testLinkProtection = function() {
  console.log("🧪 Testing custom dialog...");
  currentEmailVerdict = "SUSPICIOUS";
  showCustomWarningDialog("http://test-malicious-link.com/test");
  return true;
};

console.log("🎯 Link protection ready with CUSTOM DIALOG!");