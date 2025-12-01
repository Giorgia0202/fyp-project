// emailAnalyzer.js - ULTIMATE FIX: Extract ALL data before ANY processing
console.log("✅ emailAnalyzer.js loaded");

// Global storage for clean email data extracted BEFORE any badges
let cleanEmailData = null;

// Get current Gmail user
function getCurrentGmailUser() {
  console.log('🔍 Detecting current Gmail user...');
  
  // Strategy 1: Look for user profile elements
  const userSelectors = [
    'div[data-ogsc]',
    'div[data-email]',
    'a[aria-label*="@"]',
    '.gb_d[aria-label*="@"]',
    '.gb_e[aria-label*="@"]',
    'div[data-email]',
    'span[data-email]'
  ];
  
  for (const selector of userSelectors) {
    const userElement = document.querySelector(selector);
    if (userElement) {
      const email = userElement.getAttribute('data-email') || 
                    userElement.getAttribute('aria-label') ||
                    userElement.textContent;
      if (email && email.includes('@')) {
        const username = email.split('@')[0];
        console.log('👤 User detected via selector:', selector, '->', username);
        return username;
      }
    }
  }
  
  // Strategy 2: Look for user in URL
  const urlHash = window.location.hash;
  if (urlHash && urlHash.includes('@')) {
    const match = urlHash.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (match) {
      const username = match[0].split('@')[0];
      console.log('👤 User detected via URL hash ->', username);
      return username;
    }
  }
  
  // Strategy 3: Look for user in page URL
  const currentUrl = window.location.href;
  if (currentUrl.includes('@')) {
    const match = currentUrl.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (match) {
      const username = match[0].split('@')[0];
      console.log('👤 User detected via page URL ->', username);
      return username;
    }
  }
  
  // Strategy 4: Look for user in Gmail account switcher
  const accountElements = document.querySelectorAll('[data-email], [aria-label*="@"]');
  for (const element of accountElements) {
    const email = element.getAttribute('data-email') || element.getAttribute('aria-label');
    if (email && email.includes('@')) {
      const username = email.split('@')[0];
      console.log('👤 User detected via account switcher ->', username);
      return username;
    }
  }
  
  console.log('⚠️ Could not detect user, using default_user');
  return 'default_user';
}

// ✅ ULTIMATE FIX: Extract ALL email data FIRST, before any processing
function extractCleanEmailDataFirst() {
  console.log("🧹 EXTRACTING CLEAN EMAIL DATA FIRST (before any badges)");
  
  try {
    // ✅ EXTRACT CLEAN SUBJECT (no badges can exist yet)
    let subject = "Unknown Subject";
    const subjectEl = document.querySelector("h2.hP");
    if (subjectEl) {
      subject = subjectEl.textContent.trim();
      console.log(`📧 RAW subject extracted: "${subject}"`);
    }
    
    // ✅ EXTRACT SENDER
    let sender = "Unknown Sender";
    
    // Strategy 1: Look for email attribute in spans
    const emailSelectors = [
      "span[email]",
      ".go span[email]", 
      ".gD span[email]",
      ".h2osw span[email]",
      ".yW span[email]"
    ];

    for (const selector of emailSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        const email = el.getAttribute("email");
        if (email && email.includes("@")) {
          sender = email;
          console.log(`📧 Found sender via ${selector}: ${sender}`);
          break;
        }
      }
      if (sender !== "Unknown Sender") break;
    }

    // Strategy 2: Fallback sender detection
    if (sender === "Unknown Sender") {
      const senderElements = document.querySelectorAll(".gD, .go, .h2osw");
      for (const element of senderElements) {
        const text = element.textContent || "";
        const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        if (emailMatch && text.length < 200) {
          sender = emailMatch[1];
          console.log(`📧 Found sender via text: ${sender}`);
          break;
        }
      }
    }
    
    // ✅ EXTRACT BODY (this should be clean since no badges exist yet)
    const root = document.querySelector("div.a3s");
    const bodyHTML = root ? root.innerHTML : "";
    const bodyText = extractEmailBodyTextNow();
    
    // ✅ STORE CLEAN DATA GLOBALLY
    cleanEmailData = {
      subject: subject,
      sender: sender,
      body: bodyText,
      bodyHTML: bodyHTML
    };
    
    console.log("✅ CLEAN EMAIL DATA STORED:", {
      subject: cleanEmailData.subject,
      sender: cleanEmailData.sender,
      bodyLength: cleanEmailData.body.length
    });
    
    return cleanEmailData;
    
  } catch (error) {
    console.error("❌ Error extracting clean email data:", error);
    cleanEmailData = {
      subject: "Unknown Subject",
      sender: "Unknown Sender",
      body: "Could not extract email body",
      bodyHTML: "Could not extract email body"
    };
    return cleanEmailData;
  }
}

// ✅ Extract body text immediately (before any modifications)
function extractEmailBodyTextNow() {
  console.log("📄 Extracting email body text NOW...");

  const root =
    document.querySelector("div.a3s") ||
    document.querySelector("div.adn") ||
    document.querySelector("div.ii.gt") ||
    document.querySelector("div.im") ||
    document.querySelector("div[role=main]") ||
    document.body;

  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = root.innerHTML;

  // Remove Gmail-specific elements
  const elementsToRemove = [
    'div.yj6qo', 'div.adL', 'div.h5', 'div.gmail_extra', 'div.gmail_quote',
    'img[src*="gmail"]', 'div[style*="display:none"]', 'div[style*="display: none"]'
  ];

  elementsToRemove.forEach(selector => {
    const elements = tempDiv.querySelectorAll(selector);
    elements.forEach(el => el.remove());
  });

  // Handle images
  const images = tempDiv.querySelectorAll("img");
  images.forEach((img, i) => {
    try {
      const src = img.src || img.getAttribute('src') || img.getAttribute('data-src') || '';
      let imageText = src && src !== '' && !src.includes('data:') && !src.includes('blob:') 
        ? `[IMAGE:${src}]` : '[IMAGE]';
      img.replaceWith(document.createTextNode('\n\n' + imageText + '\n\n'));
    } catch (err) {
      img.replaceWith(document.createTextNode('\n\n[IMAGE]\n\n'));
    }
  });

  // Process links
  const links = tempDiv.querySelectorAll("a");
  links.forEach((link, i) => {
    try {
      const label = link.textContent?.trim() || "[no label]";
      let href = link.href || link.getAttribute("href") || "";

      if (!href || href === "#" || /^javascript:/i.test(href)) {
        link.replaceWith(document.createTextNode(` ${label} `));
        return;
      }

      // URL unwrapping
      if (href.includes("mail.google.com") && href.includes("url=")) {
        try {
          const url = new URL(href);
          const actualUrl = url.searchParams.get("url");
          if (actualUrl) {
            href = decodeURIComponent(actualUrl);
          }
        } catch (e) {
          // ignore
        }
      }

      link.replaceWith(document.createTextNode(` ${label} (${href}) `));
    } catch (err) {
      const raw = link.textContent || link.innerText || "";
      link.replaceWith(document.createTextNode(` ${raw} `));
    }
  });

  // Handle paragraphs
  const paragraphElements = tempDiv.querySelectorAll("div, p");
  paragraphElements.forEach(el => {
    const content = el.textContent?.trim() || '';
    if (!content) {
      el.remove();
      return;
    }
    
    const parent = el.parentElement;
    if (parent && parent !== tempDiv && parent.textContent === content) {
      return;
    }
    
    const beforeText = document.createTextNode('\n\n');
    const contentText = document.createTextNode(content);
    const afterText = document.createTextNode('\n\n');
    
    el.parentNode.insertBefore(beforeText, el);
    el.parentNode.insertBefore(contentText, el);
    el.parentNode.insertBefore(afterText, el);
    el.remove();
  });

  // Handle line breaks
  const breaks = tempDiv.querySelectorAll("br");
  breaks.forEach(br => {
    br.replaceWith(document.createTextNode('\n'));
  });

  // Get final text
  const rawText = tempDiv.textContent || tempDiv.innerText || "";
  
  let cleanText = rawText
    .replace(/\xa0|\u200c|\u200b|\u200d/g, ' ') // Remove invisible unicode
    .replace(/[\s\u00A0]+/g, ' ')                // Collapse whitespace
    .replace(/\n{3,}/g, '\n\n')                 // Max 2 newlines in a row
    .replace(/Download\s+/g, '')
    .replace(/DownloadAdd\s+to\s+Drive/g, '')
    .replace(/Save\s+to\s+Photos/g, '')
    .replace(/\[Message clipped\]/g, '')
    .replace(/View entire message/g, '')
    .replace(/^[ \t\n]+/, '')
    .replace(/[ \t\n]+$/, '')
    .trim();

  // Truncate if too long
  if (cleanText.length > 10000) {
    cleanText = cleanText.substring(0, 10000) + '\n[TRUNCATED]';
  }

  return cleanText;
}

// ✅ Convert text to HTML
function convertTextToHTML(textContent) {
  if (!textContent || textContent === "Could not extract email body") {
    return "Could not extract email body";
  }

  let htmlContent = textContent
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/([^(]+)\s*\((https?:\/\/[^)]+)\)/g, 
      '<a href="$2" target="_blank" style="color: #1a73e8; text-decoration: underline;">$1</a>')
    .replace(/\[IMAGE:[^\]]+\]/g, 
      '<span style="display: inline-block; padding: 4px 8px; background: #e3f2fd; border: 1px solid #2196f3; border-radius: 12px; font-size: 11px; color: #1976d2; margin: 0 4px;">📷 Image</span>')
    .replace(/\[IMAGE\]/g, 
      '<span style="display: inline-block; padding: 4px 8px; background: #f5f5f5; border: 1px solid #ccc; border-radius: 12px; font-size: 11px; color: #666; margin: 0 4px;">📷 Image</span>')
    .replace(/\. ([A-Z])/g, '.<br><br>$1')
    .replace(/: ([A-Z])/g, ':<br><br>$1')
    .replace(/Sincerely,/g, '<br><br>Sincerely,');

  return `<div style="font-family: Arial, Helvetica, sans-serif; font-size: 13px; line-height: 1.6; color: #222; max-width: 100%; word-wrap: break-word;">${htmlContent}</div>`;
}

// ✅ NEW: Update security category counts based on verdict
function updateSecurityCounts(verdict) {
  const today = new Date().toDateString();
  const currentEmailUrl = window.location.href;
  const currentUser = getCurrentGmailUser();
  
  // User-specific storage keys
  const userSecurityCountsKey = `securityCounts_${currentUser}`;
  const userLastScanDateKey = `lastScanDate_${currentUser}`;
  const userScannedEmailsKey = `scannedEmails_${currentUser}`;
  
  chrome.storage.local.get([userSecurityCountsKey, userLastScanDateKey, userScannedEmailsKey], function(result) {
    let securityCounts = result[userSecurityCountsKey] || {};
    let lastScanDate = result[userLastScanDateKey] || today;
    let scannedEmails = result[userScannedEmailsKey] || {};
    
    // Reset counts if it's a new day
    if (lastScanDate !== today) {
      securityCounts = {};
      lastScanDate = today;
    }
    
    // Check if this email was already counted for security categories today
    const emailKey = `${today}_${currentEmailUrl}`;
    const securityKey = `${today}_${currentEmailUrl}_security`;
    
    // Only count if email was scanned today AND not already counted for security
    if (scannedEmails[emailKey] && !scannedEmails[securityKey]) {
      // Initialize today's counts if not exists
      if (!securityCounts[today]) {
        securityCounts[today] = {
          safe: 0,
          malicious: 0,
          phishing: 0
        };
      }
      
      // Increment the appropriate category
      if (verdict === "SAFE" || verdict === "LEGITIMATE") {
        securityCounts[today].safe++;
      } else if (verdict === "SUSPICIOUS" || verdict === "MALICIOUS") {
        securityCounts[today].malicious++;
      } else if (verdict === "PHISHING") {
        securityCounts[today].phishing++;
      }
      
      // Mark this email as counted for security categories
      scannedEmails[securityKey] = true;
      
      const storageData = {};
      storageData[userSecurityCountsKey] = securityCounts;
      storageData[userLastScanDateKey] = lastScanDate;
      storageData[userScannedEmailsKey] = scannedEmails;
      
      chrome.storage.local.set(storageData, function() {
        console.log(`📊 Updated security counts for user ${currentUser}, ${today}:`, securityCounts[today]);
      });
    } else if (!scannedEmails[emailKey]) {
      console.log('📧 Email not yet counted for daily scan, skipping security count');
    } else {
      console.log('📧 Security count already updated for this email today, skipping duplicate');
    }
  });
}

// ✅ FIXED: Send email content to backend API using CLEAN data
function analyzeEmail(emailData) {
  const endpoint = "http://127.0.0.1:5050/api/detect";
  console.log("📤 Sending CLEAN email data to backend:", endpoint);
  console.log("📧 CLEAN Email data structure:", {
    subject: emailData.subject,
    sender: emailData.sender,
    bodyLength: emailData.body.length,
    bodyPreview: emailData.body.substring(0, 200) + "..."
  });

  const requestPayload = {
    content: {
      content: `${emailData.subject}\n\n${emailData.body}`,
      sender: emailData.sender,
      subject: emailData.subject,
      html: emailData.bodyHTML
    }
  };

  chrome.runtime.sendMessage({
    type: "analyzeEmail",
    endpoint: endpoint,
    content: requestPayload.content
  }, response => {
    if (!response) {
      console.error("❌ No response from background script");
      return showBadge("ERROR", "N/A", "#f0f0f0", "#333");
    }

    if (!response.ok) {
      console.error("❌ API call failed:", response.error);
      return showBadge("ERROR", "N/A", "#f0f0f0", "#333");
    }

    console.log("✅ Backend response:", response.data);

    const data = response.data;
    const verdict = (data.verdict || "ERROR").toUpperCase();
    const score = typeof data.score === "number" ? data.score.toFixed(2) : "N/A";

    let bgColor = "#e6ffed";
    let textColor = "green";
    
    if (verdict === "PHISHING") {
      bgColor = "#ffe6e6";
      textColor = "red";
    } else if (verdict === "SUSPICIOUS") {
      bgColor = "#fff3cd";
      textColor = "#856404";
    } else if (verdict === "ERROR") {
      bgColor = "#f0f0f0";
      textColor = "#333";
    }

    // ✅ NEW: Set verdict for link protection
    if (window.setCurrentEmailVerdict) {
      window.setCurrentEmailVerdict(verdict);
    }

    // ✅ NEW: Update security category counts
    updateSecurityCounts(verdict);

    showBadge(verdict, score, bgColor, textColor);
  });
}

// ✅ ULTIMATE FIX: Main function that extracts FIRST, then analyzes
function detectAndAnalyzeEmail() {
  console.log("🔍 ULTIMATE FIX: Starting email detection with clean extraction first...");
  
  // ✅ NEW: Check if extension is paused before analyzing
  chrome.storage.local.get(['extensionActive'], function(result) {
    const isActive = result.extensionActive !== false; // Default to true
    
    if (!isActive) {
      console.log("⏸️ Extension is paused - skipping email analysis");
      return;
    }
    
    console.log("✅ Extension is active - proceeding with email analysis");
    
    // Get current email URL to prevent duplicate counting
    const currentEmailUrl = window.location.href;
    const today = new Date().toDateString(); // e.g., "Mon Dec 16 2024"
    const currentUser = getCurrentGmailUser();
    
    // User-specific storage keys
    const userDailyScanCountKey = `dailyScanCount_${currentUser}`;
    const userLastScanDateKey = `lastScanDate_${currentUser}`;
    const userScannedEmailsKey = `scannedEmails_${currentUser}`;
    const userSecurityCountsKey = `securityCounts_${currentUser}`;
    
    chrome.storage.local.get([userDailyScanCountKey, userLastScanDateKey, userScannedEmailsKey, userSecurityCountsKey], function(result) {
      let dailyScanCount = result[userDailyScanCountKey] || {};
      let lastScanDate = result[userLastScanDateKey] || today;
      let scannedEmails = result[userScannedEmailsKey] || {};
      let securityCounts = result[userSecurityCountsKey] || {};
      
      // Reset counts if it's a new day
      if (lastScanDate !== today) {
        dailyScanCount = {};
        scannedEmails = {};
        securityCounts = {};
        lastScanDate = today;
      }
      
      // Check if this email was already scanned today (for counting purposes only)
      const emailKey = `${today}_${currentEmailUrl}`;
      if (!scannedEmails[emailKey]) {
        // Only increment if this email hasn't been scanned today
        dailyScanCount[today] = (dailyScanCount[today] || 0) + 1;
        scannedEmails[emailKey] = true;
        
        const storageData = {};
        storageData[userDailyScanCountKey] = dailyScanCount;
        storageData[userLastScanDateKey] = lastScanDate;
        storageData[userScannedEmailsKey] = scannedEmails;
        
        chrome.storage.local.set(storageData, function() {
          console.log(`📈 Updated daily scan count for user ${currentUser}, ${today}:`, dailyScanCount[today], '(new email)');
        });
      } else {
        console.log('📧 Email already scanned today, but will still analyze for terminal output');
      }
    });

    // ✅ NEW: Reset link protection first
    if (window.resetLinkProtection) {
      window.resetLinkProtection();
    }
    
    setTimeout(() => {
      // STEP 1: Extract ALL clean data FIRST (before any badges exist)
      const cleanData = extractCleanEmailDataFirst();
      
      // STEP 2: Send the clean data to backend
      analyzeEmail(cleanData);
    }, 500);
  });
}

// ✅ OVERRIDE: Make sure extractCurrentEmailData returns clean data
window.extractCurrentEmailData = function() {
  console.log("📧 OVERRIDE: extractCurrentEmailData called - returning CLEAN data");
  
  if (cleanEmailData) {
    console.log("✅ Returning cached CLEAN email data:", {
      subject: cleanEmailData.subject,
      sender: cleanEmailData.sender,
      bodyLength: cleanEmailData.body.length
    });
    return cleanEmailData;
  } else {
    console.warn("⚠️ No clean data cached, extracting now...");
    return extractCleanEmailDataFirst();
  }
};

// Reset clean data when email changes
window.resetCleanEmailData = function() {
  console.log("🧹 Resetting clean email data cache");
  cleanEmailData = null;
};

// Listen for popup requests for current counts and user
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.type === 'getCurrentCounts') {
        console.log('📊 Popup requested current counts');
        sendResponse({success: true});
        return true;
    }
    
    if (request.type === 'getCurrentUser') {
        const currentUser = getCurrentGmailUser();
        console.log('👤 Popup requested current user:', currentUser);
        sendResponse({user: currentUser});
        return true;
    }
});

// Kick things off
detectAndAnalyzeEmail();