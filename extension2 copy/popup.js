// Simple encouraging messages
const messages = [
    { text: "Everything is OK!", status: "All systems protected" },
    { text: "You're Safe!", status: "No threats detected" },
    { text: "All Good!", status: "Protection active" },
    { text: "Stay Secure!", status: "Monitoring emails" },
    { text: "Well Protected!", status: "Extension working" },
    { text: "Great Job!", status: "Security first" },
    { text: "Keep It Up!", status: "Phishing blocked" },
    { text: "You Rock!", status: "Cyber safe" }
];

// Paused state message
const pausedMessage = { text: "Extension Paused", status: "Protection disabled" };

let currentIndex = 0;

function showNextMessage() {
    // Check if extension is active
    chrome.storage.local.get(['extensionActive'], function(result) {
        const isActive = result.extensionActive !== false;
        
        if (!isActive) {
            // Show paused message
            document.getElementById('message').textContent = pausedMessage.text;
            document.getElementById('status').textContent = pausedMessage.status;
            return;
        }
        
        // Get next message for active state
        currentIndex = (currentIndex + 1) % messages.length;
        const message = messages[currentIndex];

        // Add fade animation
        document.getElementById('message').className = 'message fade-in';
        document.getElementById('status').className = 'status fade-in';

        // Update content
        document.getElementById('message').textContent = message.text;
        document.getElementById('status').textContent = message.status;
    });
}

document.body.addEventListener('click', function(e) {
    e.preventDefault();
    showNextMessage();
});

let isExtensionActive = true;

chrome.storage.local.get(['extensionActive'], function(result) {
    isExtensionActive = result.extensionActive !== false; // Default to true
    updateToggleState();
    updateMessageForState();
});

function updateMessageForState() {
    if (isExtensionActive) {
        document.getElementById('message').textContent = messages[0].text;
        document.getElementById('status').textContent = messages[0].status;
    } else {
        document.getElementById('message').textContent = pausedMessage.text;
        document.getElementById('status').textContent = pausedMessage.status;
    }
}

function updateToggleState() {
    const toggle = document.getElementById('extensionToggle');
    const statusIndicator = document.getElementById('statusIndicator');
    
    if (isExtensionActive) {
        toggle.classList.add('active');
        statusIndicator.textContent = 'Active';
        statusIndicator.classList.remove('paused');
    } else {
        toggle.classList.remove('active');
        statusIndicator.textContent = 'Paused';
        statusIndicator.classList.add('paused');
    }
}

document.getElementById('settingsIcon').addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    console.log('🔧 Settings icon clicked');
    
    const panel = document.getElementById('togglePanel');
    panel.classList.add('show');
    this.classList.add('active');
    console.log('Settings panel shown');
});

document.getElementById('extensionToggle').addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    console.log('🔄 Toggle clicked, current state:', isExtensionActive);
    
    isExtensionActive = !isExtensionActive;
    console.log('🔄 New state:', isExtensionActive);
    
    chrome.storage.local.set({ extensionActive: isExtensionActive }, function() {
        console.log('💾 State saved to storage');
    });
    
    updateToggleState();
    updateMessageForState();
    
    chrome.runtime.sendMessage({
        type: 'toggleExtension',
        active: isExtensionActive
    }, function(response) {
        console.log('📨 Background response:', response);
    });
});

        // Close panel when clicking outside
        document.addEventListener('click', function(e) {
            if (!e.target.closest('#settingsIcon') && !e.target.closest('#togglePanel')) {
                document.getElementById('togglePanel').classList.remove('show');
            }
        });

        // Prevent popup from closing when interacting with settings
        document.addEventListener('mouseup', function(e) {
            if (e.target.closest('#settingsIcon') || e.target.closest('#togglePanel')) {
                e.stopPropagation();
            }
        });

        // Close button handler (replaces back button)
        document.getElementById('closeButton').addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('❌ Close button clicked');
            
            const panel = document.getElementById('togglePanel');
            const settingsIcon = document.getElementById('settingsIcon');
            
            panel.classList.remove('show');
            settingsIcon.classList.remove('active');
            console.log('Back to main view');
        });

updateMessageForState();

console.log('🔍 Debug: Checking elements...');
console.log('Settings icon exists:', !!document.getElementById('settingsIcon'));
console.log('Toggle panel exists:', !!document.getElementById('togglePanel'));
console.log('Extension toggle exists:', !!document.getElementById('extensionToggle'));

setTimeout(() => {
    const panel = document.getElementById('togglePanel');
    if (panel) {
        console.log('Panel initial state:', panel.classList.contains('show'));
        console.log('Panel computed style:', window.getComputedStyle(panel).visibility);
    }
}, 100); 



// Show user-specific daily scan count and security counts in popup
function updateScanCount() {
    const today = new Date().toDateString();
    
    // Get current user from content script (which has access to Gmail DOM)
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0] && tabs[0].url && tabs[0].url.includes('mail.google.com')) {
            chrome.tabs.sendMessage(tabs[0].id, {type: 'getCurrentUser'}, function(response) {
                const currentUser = response && response.user ? response.user : 'default_user';
                console.log('👤 Current user detected:', currentUser);
                
                // User-specific storage keys
                const userDailyScanCountKey = `dailyScanCount_${currentUser}`;
                const userLastScanDateKey = `lastScanDate_${currentUser}`;
                const userScannedEmailsKey = `scannedEmails_${currentUser}`;
                const userSecurityCountsKey = `securityCounts_${currentUser}`;
                
                chrome.storage.local.get([userDailyScanCountKey, userLastScanDateKey, userScannedEmailsKey, userSecurityCountsKey], function(result) {
                    const dailyScanCount = result[userDailyScanCountKey] || {};
                    const lastScanDate = result[userLastScanDateKey] || today;
                    const securityCounts = result[userSecurityCountsKey] || {};
                    
                    // Get today's security counts
                    const todaySecurityCounts = securityCounts[today] || { safe: 0, malicious: 0, phishing: 0 };
                    
                    // Calculate total from security categories to ensure consistency
                    const totalCount = (todaySecurityCounts.safe || 0) + (todaySecurityCounts.malicious || 0) + (todaySecurityCounts.phishing || 0);
                    
                    // Update scan count display
                    const scanCountEl = document.getElementById('scanCount');
                    if (scanCountEl) scanCountEl.textContent = totalCount;
                    
                    // Update security category counts
                    const safeCountEl = document.getElementById('safeCount');
                    if (safeCountEl) safeCountEl.textContent = todaySecurityCounts.safe || 0;
                    
                    const maliciousCountEl = document.getElementById('maliciousCount');
                    if (maliciousCountEl) maliciousCountEl.textContent = todaySecurityCounts.malicious || 0;
                    
                    const phishingCountEl = document.getElementById('phishingCount');
                    if (phishingCountEl) phishingCountEl.textContent = todaySecurityCounts.phishing || 0;
                });
            });
        } else {
            // Fallback if not on Gmail
            const currentUser = 'default_user';
            console.log('👤 Using fallback user:', currentUser);
            
            // User-specific storage keys
            const userDailyScanCountKey = `dailyScanCount_${currentUser}`;
            const userLastScanDateKey = `lastScanDate_${currentUser}`;
            const userScannedEmailsKey = `scannedEmails_${currentUser}`;
            const userSecurityCountsKey = `securityCounts_${currentUser}`;
            
            chrome.storage.local.get([userDailyScanCountKey, userLastScanDateKey, userScannedEmailsKey, userSecurityCountsKey], function(result) {
                const dailyScanCount = result[userDailyScanCountKey] || {};
                const lastScanDate = result[userLastScanDateKey] || today;
                const securityCounts = result[userSecurityCountsKey] || {};
                
                // Get today's security counts
                const todaySecurityCounts = securityCounts[today] || { safe: 0, malicious: 0, phishing: 0 };
                
                // Calculate total from security categories to ensure consistency
                const totalCount = (todaySecurityCounts.safe || 0) + (todaySecurityCounts.malicious || 0) + (todaySecurityCounts.phishing || 0);
                
                // Update scan count display
                const scanCountEl = document.getElementById('scanCount');
                if (scanCountEl) scanCountEl.textContent = totalCount;
                
                // Update security category counts
                const safeCountEl = document.getElementById('safeCount');
                if (safeCountEl) safeCountEl.textContent = todaySecurityCounts.safe || 0;
                
                const maliciousCountEl = document.getElementById('maliciousCount');
                if (maliciousCountEl) maliciousCountEl.textContent = todaySecurityCounts.malicious || 0;
                
                const phishingCountEl = document.getElementById('phishingCount');
                if (phishingCountEl) phishingCountEl.textContent = todaySecurityCounts.phishing || 0;
            });
        }
    });
}

// Update scan count immediately when popup opens
updateScanCount();

// Also update when popup gains focus (in case it was already open)
document.addEventListener('focus', updateScanCount);
window.addEventListener('focus', updateScanCount);

// Request fresh data from content script when popup opens
chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs[0] && tabs[0].url && tabs[0].url.includes('mail.google.com')) {
        chrome.tabs.sendMessage(tabs[0].id, {type: 'getCurrentCounts'}, function(response) {
            if (response && response.success) {
                updateScanCount();
            }
        });
    }
});

// Listen for changes to all relevant storage items and update live
chrome.storage.onChanged.addListener(function(changes, namespace) {
    if (namespace === 'local') {
        // Get current user from content script for storage change events
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0] && tabs[0].url && tabs[0].url.includes('mail.google.com')) {
                chrome.tabs.sendMessage(tabs[0].id, {type: 'getCurrentUser'}, function(response) {
                    const currentUser = response && response.user ? response.user : 'default_user';
                    const userKeys = [
                        `dailyScanCount_${currentUser}`,
                        `lastScanDate_${currentUser}`,
                        `scannedEmails_${currentUser}`,
                        `securityCounts_${currentUser}`
                    ];
                    
                    // Check if any user-specific keys changed
                    const hasRelevantChanges = userKeys.some(key => changes[key]);
                    if (hasRelevantChanges) {
                        updateScanCount();
                    }
                });
            }
        });
    }
}); 

