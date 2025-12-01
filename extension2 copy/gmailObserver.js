// gmailObserver.js - ULTIMATE FIX with proper clean data reset
console.log("✅ gmailObserver.js loaded");

function setupGmailObserver() {
  console.log("👁️ Setting up Gmail observer with ULTIMATE CLEAN DATA FIX...");
  
  let currentEmailUrl = null;
  let processingEmail = false;
  
  const observer = new MutationObserver((mutations) => {
    if (!window.location.href.includes('mail.google.com')) {
      return;
    }
    
    const newEmailUrl = window.location.href;
    const emailContainer = document.querySelector("div.a3s");
    const subjectElement = document.querySelector("h2.hP");
    const existingBadge = document.getElementById("phishing-badge");
    
    if (emailContainer && subjectElement && !existingBadge && !processingEmail) {
      if (newEmailUrl !== currentEmailUrl) {
        console.log("📧 NEW EMAIL DETECTED - RESETTING EVERYTHING!");
        console.log("📧 URL:", newEmailUrl);
        
        currentEmailUrl = newEmailUrl;
        processingEmail = true;
        
        // ✅ ULTIMATE FIX: Reset ALL cached data
        if (window.resetCleanEmailData) {
          window.resetCleanEmailData();
        }
        
        // ✅ NEW: Reset link protection
        if (window.resetLinkProtection) {
          window.resetLinkProtection();
        }
        
        window.originalEmailSubject = null;
        window.cleanEmailData = null;
        
        // Remove any existing UI elements FIRST
        removeAllUIElements();
        
        // ✅ CRITICAL: Wait a bit longer for Gmail to fully load
        setTimeout(() => {
          console.log("🚀 Starting clean email analysis...");
          detectAndAnalyzeEmail();
        }, 800); // Increased delay
        
        setTimeout(() => {
          processingEmail = false;
        }, 3000); // Increased timeout
      }
    }
    
    else if (!emailContainer && (existingBadge || document.getElementById("phishing-popup"))) {
      console.log("📤 Email view closed - FULL CLEANUP");
      removeAllUIElements();
      
      // ✅ ULTIMATE RESET
      if (window.resetCleanEmailData) {
        window.resetCleanEmailData();
      }
      
      // ✅ NEW: Reset link protection
      if (window.resetLinkProtection) {
        window.resetLinkProtection();
      }
      
      window.originalEmailSubject = null;
      window.cleanEmailData = null;
      
      currentEmailUrl = null;
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false,
    attributeOldValue: false
  });
  
  console.log("✅ Gmail observer started with ULTIMATE CLEAN DATA PROTECTION");
  
  // URL change detection with FULL RESET
  let lastUrl = window.location.href;
  setInterval(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      console.log("🔄 URL changed - FULL RESET:", currentUrl);
      
      // ✅ ULTIMATE RESET on URL change
      if (window.resetCleanEmailData) {
        window.resetCleanEmailData();
      }
      
      // ✅ NEW: Reset link protection
      if (window.resetLinkProtection) {
        window.resetLinkProtection();
      }
      
      window.originalEmailSubject = null;
      window.cleanEmailData = null;
      
      setTimeout(() => {
        const emailContainer = document.querySelector("div.a3s");
        const subjectElement = document.querySelector("h2.hP");
        const existingBadge = document.getElementById("phishing-badge");
        
        if (emailContainer && subjectElement && !existingBadge && !processingEmail) {
          console.log("📧 Email detected via URL change - STARTING CLEAN ANALYSIS");
          processingEmail = true;
          removeAllUIElements();
          
          setTimeout(() => {
            detectAndAnalyzeEmail();
          }, 800);
          
          setTimeout(() => { processingEmail = false; }, 3000);
        }
      }, 1000);
    }
  }, 1000);
}