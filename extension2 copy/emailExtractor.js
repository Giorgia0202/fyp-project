// Target the CLEAN span elements instead of the contaminated h2.hP
console.log("✅ emailExtractor.js - FINAL FIX loaded");

// (No further references to removed functions remain)

// Keep the existing body extraction functions unchanged
function extractEmailBodyHTML() {
  console.log("📄 Converting text to HTML (no images)…");

  const textContent = extractEmailBodyText();
  
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
    .replace(/Sincerely,/g, '<br><br>Sincerely,')
    .replace(/Amazon Billing Services/g, '<br>Amazon Billing Services');

  const finalHTML = `
    <div style="
      font-family: Arial, Helvetica, sans-serif;
      font-size: 13px;
      line-height: 1.6;
      color: #222;
      max-width: 100%;
      word-wrap: break-word;
    ">
      ${htmlContent}
    </div>
  `;

  console.log("✅ Simple HTML conversion complete (no image size issues)");
  return finalHTML;
}