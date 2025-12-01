// content.js - 主要内容脚本
console.log("✅ content.js loaded");

;(function() {
  'use strict';

  // ✅ Wait for Gmail to be ready and start monitoring
  function initializeExtension() {
    console.log("🚀 Initializing Gmail Phishing Detector...");
    
    // Check if we're on Gmail
    if (!window.location.href.includes('mail.google.com')) {
      console.log("❌ Not on Gmail - extension inactive");
      return;
    }
    
    // Check if extension is active
    chrome.storage.local.get(['extensionActive'], function(result) {
      const isActive = result.extensionActive !== false; // Default to true
      
      if (!isActive) {
        console.log("⏸️ Extension is paused - not initializing email monitoring");
        return;
      }
      
      console.log("✅ Extension is active - proceeding with initialization");
      startGmailMonitoring();
    });
  }
  
  function startGmailMonitoring() {
    
    // Wait for Gmail to load
    function waitForGmail(attempts = 20) {
      const gmailLoaded = document.querySelector("body") && 
                        document.querySelector("div[role='main']");
      
      if (gmailLoaded) {
        console.log("✅ Gmail loaded, starting observer");
        setupGmailObserver();
        
        // Check if there's already an email open
        setTimeout(() => {
          const emailContainer = document.querySelector("div.a3s");
          const subjectElement = document.querySelector("h2.hP");
          
          if (emailContainer && subjectElement) {
            console.log("📧 Email already open - analyzing");
            detectAndAnalyzeEmail();
          }
        }, 1000);
        
      } else if (attempts > 0) {
        console.log(`⏳ Waiting for Gmail to load... (${attempts} attempts left)`);
        setTimeout(() => waitForGmail(attempts - 1), 1000);
      } else {
        console.error("❌ Gmail failed to load within timeout");
      }
    }
    
    waitForGmail();
  }
  
  // ✅ Start the extension
  initializeExtension();
  
  // Listen for extension state changes
  chrome.storage.onChanged.addListener(function(changes, namespace) {
    if (namespace === 'local' && changes.extensionActive) {
      const isActive = changes.extensionActive.newValue;
      console.log("🔄 Extension state changed:", isActive ? "ACTIVE" : "PAUSED");
      
      if (isActive) {
        console.log("🔄 Re-initializing extension...");
        initializeExtension();
      } else {
        console.log("⏸️ Extension paused - stopping monitoring");
        // You can add cleanup code here if needed
      }
    }
  });
})();