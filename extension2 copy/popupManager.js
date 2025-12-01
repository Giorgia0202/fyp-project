// popupManager.js - 弹窗管理模块
console.log("✅ popupManager.js loaded");

// ✅ Main feedback popup function
function showFeedbackPopup(verdict, score) {
  const existingPopup = document.getElementById("phishing-popup");
  const existingOverlay = document.getElementById("phishing-overlay");
  if (existingPopup) existingPopup.remove();
  if (existingOverlay) existingOverlay.remove();

  // Create overlay with blur effect
  const overlay = document.createElement("div");
  overlay.id = "phishing-overlay";
  Object.assign(overlay.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    zIndex: "9999",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    paddingTop: "100px"
  });

  // Create popup with glassmorphism effect
  const popup = document.createElement("div");
  popup.id = "phishing-popup";
  popup.innerHTML = `
    <div style="text-align: center; margin-bottom: 8px;">
      <img src="${chrome.runtime.getURL('icons/logoFYP.png')}" alt="Logo" style="
        width: 80px;
        height: 80px;
        margin: 0 auto 5px auto;
        filter: drop-shadow(0 4px 12px rgba(0,0,0,0.15));
        object-fit: contain;
      ">
    </div>
    
    <div style="text-align: center; margin-bottom: 2px;">
      <h2 style="
        margin: 0;
        font-size: 28px;
        font-weight: 700;
        color: #2c3e50;
        letter-spacing: -0.5px;
        text-shadow: 0 1px 2px rgba(0,0,0,0.1);
      ">Feedback</h2>
    </div>
    
    <div style="text-align: center; margin-bottom: 20px;">
      <p style="
        margin: 0;
        font-size: 16px;
        color: #5a6c7d;
        font-weight: 400;
        line-height: 1.4;
      ">Is the prediction correct?</p>
    </div>
    
    <div style="display: flex; gap: 15px; justify-content: center;">
      <button id="feedback-correct" style="
        background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%);
        color: white;
        border: none;
        padding: 14px 32px;
        border-radius: 25px;
        cursor: pointer;
        font-size: 16px;
        font-weight: 600;
        transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        box-shadow: 0 4px 15px rgba(74, 85, 104, 0.4);
        min-width: 120px;
      ">Yes</button>
      
      <button id="feedback-wrong" style="
        background: rgba(255, 255, 255, 0.25);
        color: #4a5568;
        border: 1px solid rgba(255, 255, 255, 0.3);
        padding: 14px 32px;
        border-radius: 25px;
        cursor: pointer;
        font-size: 16px;
        font-weight: 600;
        transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        backdrop-filter: blur(10px);
        WebkitBackdropFilter: blur(10px);
        min-width: 120px;
      ">Report</button>
    </div>
  `;

  Object.assign(popup.style, {
    background: "linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.8) 100%)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    border: "1px solid rgba(255, 255, 255, 0.3)",
    borderRadius: "24px",
    padding: "30px 45px",
    boxShadow: "0 25px 50px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.1)",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    minWidth: "420px",
    maxWidth: "480px",
    animation: "popupFadeIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
  });

  // Add CSS animations
  if (!document.getElementById("popup-animations")) {
    const style = document.createElement("style");
    style.id = "popup-animations";    
    style.textContent = `
      @keyframes popupFadeIn {
        from { opacity: 0; transform: translateY(-30px) scale(0.8); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes popupFadeOut {
        from { opacity: 1; transform: translateY(0) scale(1); }
        to { opacity: 0; transform: translateY(-30px) scale(0.8); }
      }
    `;
    document.head.appendChild(style);
  }

  overlay.appendChild(popup);
  document.body.appendChild(overlay);

  // Close popup when clicking on overlay
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closePopupWithAnimation();
  });

  // Event listeners for feedback buttons
  document.getElementById("feedback-correct").addEventListener("click", () => {
    submitFeedback("correct", verdict, score);
    closePopupWithAnimation();
  });

  document.getElementById("feedback-wrong").addEventListener("click", () => {
    console.log("🔴 Report button clicked!");
    closePopupWithAnimation();
    setTimeout(() => {
      showReportPopup(verdict, score);
    }, 300);
  });

  // Close with animation function
  function closePopupWithAnimation() {
    popup.style.animation = "popupFadeOut 0.3s cubic-bezier(0.55, 0.085, 0.68, 0.53) forwards";
    overlay.style.opacity = "0";
    overlay.style.transition = "opacity 0.3s ease-in";
    setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 300);
  }

  // Auto-close after 25 seconds
  setTimeout(() => { if (overlay.parentNode) closePopupWithAnimation(); }, 25000);

  // Close on Escape key
  function handleEscape(e) {
    if (e.key === "Escape") {
      closePopupWithAnimation();
      document.removeEventListener("keydown", handleEscape);
    }
  }
  document.addEventListener("keydown", handleEscape);
}

// ✅ Working report popup function
function showReportPopup(verdict, score) {
  console.log("🔴 showReportPopup called with:", verdict, score);
  
  const existing = document.getElementById("report-popup");
  if (existing) existing.remove();
  
  const overlay = document.createElement("div");
  overlay.id = "report-overlay";
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    z-index: 9999;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding-top: 100px;
    opacity: 0;
    transition: opacity 0.3s ease-in-out;
  `;
  
  const popup = document.createElement("div");
  popup.id = "report-popup";
  popup.style.cssText = `
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.8) 100%);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 24px;
    padding: 30px 45px;
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.1);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
    min-width: 420px;
    max-width: 480px;
    text-align: center;
    transform: translateY(-30px) scale(0.8);
    opacity: 0;
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  `;
  
  popup.innerHTML = `
    <div style="margin-bottom: 8px;">
      <img src="${chrome.runtime.getURL('icons/logoFYP.png')}" alt="Logo" style="
        width: 80px;
        height: 80px;
        margin: 0 auto 5px auto;
        filter: drop-shadow(0 4px 12px rgba(0,0,0,0.15));
        object-fit: contain;
      ">
    </div>
    
    <div style="text-align: center; margin-bottom: 2px;">
      <h2 style="
        margin: 0;
        font-size: 28px;
        font-weight: 700;
        color: #2c3e50;
        letter-spacing: -0.5px;
        text-shadow: 0 1px 2px rgba(0,0,0,0.1);
      ">Report this Email</h2>
    </div>
    
    <div style="text-align: left; margin: 20px 0; padding-left: 20px;">
      <label style="display: flex; align-items: center; margin: 15px 0; cursor: pointer; font-size: 16px; color: #2c3e50; font-weight: 500;">
        <input type="radio" name="report-type" value="safe" style="margin-right: 12px; transform: scale(1.3); accent-color: #4a5568;">
        <span>Safe</span>
      </label>
      <label style="display: flex; align-items: center; margin: 15px 0; cursor: pointer; font-size: 16px; color: #2c3e50; font-weight: 500;">
        <input type="radio" name="report-type" value="suspicious" style="margin-right: 12px; transform: scale(1.3); accent-color: #4a5568;">
        <span>Suspicious</span>
      </label>
      <label style="display: flex; align-items: center; margin: 15px 0; cursor: pointer; font-size: 16px; color: #2c3e50; font-weight: 500;">
        <input type="radio" name="report-type" value="phishing" style="margin-right: 12px; transform: scale(1.3); accent-color: #4a5568;">
        <span>Phishing</span>
      </label>
    </div>
    
    <div style="display: flex; gap: 15px; justify-content: center; margin-top: 20px;">
      <button id="report-submit" style="
        background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%);
        color: white;
        border: none;
        padding: 14px 32px;
        border-radius: 25px;
        cursor: pointer;
        font-size: 16px;
        font-weight: 600;
        min-width: 120px;
        transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        box-shadow: 0 4px 15px rgba(74, 85, 104, 0.4);
      ">Submit</button>
      
      <button id="report-cancel" style="
        background: rgba(255, 255, 255, 0.25);
        color: #4a5568;
        border: 1px solid rgba(255, 255, 255, 0.3);
        padding: 14px 32px;
        border-radius: 25px;
        cursor: pointer;
        font-size: 16px;
        font-weight: 600;
        min-width: 120px;
        transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
      ">Cancel</button>
    </div>
  `;
  
  overlay.appendChild(popup);
  document.body.appendChild(overlay);
  
  // Trigger animations
  requestAnimationFrame(() => {
    overlay.style.opacity = "1";
    popup.style.opacity = "1";
    popup.style.transform = "translateY(0) scale(1)";
  });
  
  // Close with animation
  function closeReportPopupWithAnimation() {
    popup.style.transform = "translateY(-30px) scale(0.8)";
    popup.style.opacity = "0";
    overlay.style.opacity = "0";
    
    setTimeout(() => {
      if (overlay.parentNode) overlay.remove();
    }, 300);
  }
  
  // Event listeners
  document.getElementById("report-submit").addEventListener("click", () => {
    const selected = document.querySelector('input[name="report-type"]:checked');
    if (selected) {
      console.log("🔴 Selected:", selected.value);
      submitFeedback(`incorrect_${selected.value}`, verdict, score);
      closeReportPopupWithAnimation();
    } else {
      alert("Please select an option first!");
    }
  });
  
  document.getElementById("report-cancel").addEventListener("click", () => {
    closeReportPopupWithAnimation();
  });
  
  // Close on overlay click
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      closeReportPopupWithAnimation();
    }
  });
  
  // Close on Escape key
  function handleEscape(e) {
    if (e.key === "Escape") {
      closeReportPopupWithAnimation();
      document.removeEventListener("keydown", handleEscape);
    }
  }
  document.addEventListener("keydown", handleEscape);
  
  // Auto-close after 25 seconds
  setTimeout(() => {
    if (overlay.parentNode) closeReportPopupWithAnimation();
  }, 25000);
}