# Extension Troubleshooting Guide

## Issues Fixed

### 1. Popup File Path Issue
**Problem**: The manifest.json was referencing `"default_popup": "popup.html"` but the file was located in `html/popup.html`

**Solution**: Updated manifest.json to use the correct path:
```json
"default_popup": "html/popup.html"
```

### 2. Icon Path Issue in Popup
**Problem**: The popup.html was trying to load `"icons/virusThumbsup.png"` but the manifest uses `"icons/logoFYP.png"`

**Solution**: Updated popup.html to use the correct icon path:
```html
<img src="../icons/logoFYP.png" alt="Logo" class="logo-img">
```

### 3. Web Accessible Resources
**Problem**: The web accessible resources were missing some files and had incorrect paths

**Solution**: Updated manifest.json to include all necessary resources:
```json
"web_accessible_resources": [
  {
    "resources": [
      "icons/logoFYP.png",
      "icons/virusThumbsup.png",
      "html/feedbackPopup.html",
      "html/reportPopup.html"
    ],
    "matches": ["https://mail.google.com/*"]
  }
]
```

## How to Test the Fix

### 1. Reload the Extension
1. Open Chrome and go to `chrome://extensions/`
2. Find your "Phishing Detector" extension
3. Click the refresh/reload button
4. Make sure the extension is enabled

### 2. Test the Icon
1. Look for the extension icon in your browser toolbar
2. The icon should display properly (no broken image)
3. Hover over the icon to see the tooltip "Phishing Detector Status"

### 3. Test the Popup
1. Click on the extension icon in the toolbar
2. A popup should appear with:
   - The logo image
   - "Everything is OK!" message
   - "All systems protected" status
3. Click anywhere in the popup to cycle through different messages

### 4. Test on Gmail
1. Go to Gmail (https://mail.google.com)
2. Open an email
3. The extension should work without the "file not found" error

## Debugging Tools

### 1. Test HTML File
Open `test_extension.html` in your browser to verify all files are accessible.

### 2. Debug Script
The `debug_extension.js` file can be added to your content scripts for debugging.

### 3. Console Logs
Check the browser console for any error messages:
- Press F12 to open Developer Tools
- Go to the Console tab
- Look for any red error messages

## Common Issues and Solutions

### Issue: "Your file couldn't be accessed"
**Cause**: Incorrect file paths in manifest.json
**Solution**: Ensure all paths are correct and files exist

### Issue: Extension icon not showing
**Cause**: Icon files missing or incorrect format
**Solution**: Verify icon files exist and are valid PNG images

### Issue: Popup not opening
**Cause**: Incorrect popup path or HTML errors
**Solution**: Check the popup HTML file and ensure it's valid

### Issue: Extension not working on Gmail
**Cause**: Content scripts not loading or permissions issues
**Solution**: Check manifest.json permissions and content script configuration

## File Structure
```
extension copy/
├── manifest.json (MAIN CONFIG)
├── background.js (SERVICE WORKER)
├── content.js (CONTENT SCRIPT)
├── icons/
│   ├── logoFYP.png (EXTENSION ICON)
│   └── virusThumbsup.png (POPUP ICON)
├── html/
│   ├── popup.html (MAIN POPUP)
│   ├── feedbackPopup.html
│   └── reportPopup.html
└── [other JS files]
```

## Next Steps
1. Reload the extension in Chrome
2. Test the icon and popup functionality
3. Test on Gmail to ensure everything works
4. If issues persist, check the browser console for errors 