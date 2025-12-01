// debug_extension.js - Extension debugging utility
console.log("🔍 Extension Debug Script Loaded");

// Check if extension is properly loaded
function checkExtensionStatus() {
    console.log("=== Extension Status Check ===");
    
    // Check if we're in a browser extension context
    if (typeof chrome !== 'undefined' && chrome.runtime) {
        console.log("✅ Chrome extension API available");
        console.log("📦 Extension ID:", chrome.runtime.id);
        console.log("📋 Manifest:", chrome.runtime.getManifest());
    } else {
        console.log("❌ Chrome extension API not available");
    }
    
    // Check if background script is loaded
    if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({type: 'ping'}, (response) => {
            if (chrome.runtime.lastError) {
                console.log("❌ Background script not responding:", chrome.runtime.lastError);
            } else {
                console.log("✅ Background script responding");
            }
        });
    }
    
    // Check if we're on Gmail
    if (window.location.href.includes('mail.google.com')) {
        console.log("✅ On Gmail domain");
    } else {
        console.log("❌ Not on Gmail domain");
    }
    
    // Check for required DOM elements
    const requiredElements = [
        'body',
        'div[role="main"]',
        'h2.hP'
    ];
    
    requiredElements.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
            console.log(`✅ Found: ${selector}`);
        } else {
            console.log(`❌ Missing: ${selector}`);
        }
    });
}

// Run status check after page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkExtensionStatus);
} else {
    checkExtensionStatus();
}

// Monitor for errors
window.addEventListener('error', (event) => {
    console.error("🚨 JavaScript Error:", event.error);
});

// Monitor for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error("🚨 Unhandled Promise Rejection:", event.reason);
});

console.log("🔍 Debug script setup complete"); 