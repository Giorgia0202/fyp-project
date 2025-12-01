// background.js - Enhanced background service worker
console.log("✅ background.js loaded");

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log("📨 Background received message:", msg.type);

  // Handle ping for debugging
  if (msg.type === 'ping') {
    console.log("🏓 Background responding to ping");
    sendResponse({ status: 'ok', timestamp: Date.now() });
    return false;
  }

  if (msg.type === 'analyzeEmail') {
    const requestBody = {
      content: msg.content,
    };
    
    fetch(msg.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    })
    .then(res => {
      if (!res.ok) throw Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(data => sendResponse({ ok: true, data }))
    .catch(err => sendResponse({ ok: false, error: err.message }));
    
    return true; // Keep message channel open
  }

  // Handle extension toggle
  if (msg.type === 'toggleExtension') {
    console.log("🔄 Extension toggled:", msg.active ? "ON" : "OFF");
    
    // Store the state
    chrome.storage.local.set({ extensionActive: msg.active }, function() {
      console.log("💾 Extension state saved to storage");
    });
    
    // Send response
    sendResponse({ success: true, active: msg.active });
    return false;
  }

  // NEW: Handle feedback submissions
  if (msg.type === 'submitFeedback') {
    console.log("📤 Background submitting feedback:", msg.data);
    
    fetch("http://127.0.0.1:5050/api/feedback", {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(msg.data)
    })
    .then(response => {
      console.log("📥 Background got response:", response.status);
      if (!response.ok) {
        return response.text().then(text => {
          throw new Error(`HTTP ${response.status}: ${text}`);
        });
      }
      return response.json();
    })
    .then(data => {
      console.log("✅ Background feedback success:", data);
      sendResponse({ success: true, data: data });
    })
    .catch(error => {
      console.error("❌ Background feedback error:", error);
      sendResponse({ success: false, error: error.message });
    });
    
    return true; // Keep message channel open
  }
});