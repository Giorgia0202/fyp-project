// feedbackService.js - ULTIMATE FIX: Always use clean data for feedback
console.log("✅ feedbackService.js loaded");

// ✅ ULTIMATE FIX: Submit feedback with GUARANTEED clean data
function submitFeedback(reportType, verdict, score) {
  try {
    console.log("📤 ULTIMATE FIX: Getting CLEAN email data for feedback...");
    
    // ✅ ALWAYS use the extractCurrentEmailData function (which now returns clean data)
    const emailData = extractCurrentEmailData();
    
    // No more subject cleaning here; send as-is
    const feedbackData = {
      reportType: reportType || "unknown",
      originalPrediction: verdict || "unknown", 
      originalScore: score || 0,
      emailSubject: emailData.subject || "No Subject", // Use subject as extracted
      emailSender: emailData.sender || "Unknown Sender",
      emailBody: emailData.body || "No Body Content",
      emailBodyHTML: emailData.bodyHTML || emailData.body,
      timestamp: new Date().toISOString()
    };

    console.log("📤 Sending feedback with RAW subject:", {
      subject: emailData.subject,
      sender: feedbackData.emailSender,
      bodyLength: feedbackData.emailBody.length
    });

    // Send to background script
    chrome.runtime.sendMessage({
      type: "submitFeedback",
      data: feedbackData
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("❌ Background script error:", chrome.runtime.lastError);
        showFeedbackStatus("❌ Extension error occurred", "error");
        return;
      }

      if (response && response.success) {
        console.log("✅ Feedback submitted successfully with RAW subject:", emailData.subject);
        showFeedbackStatus("✅ Thank you for your feedback!", "success");
      } else {
        console.error("❌ Background script failed:", response?.error);
        showFeedbackStatus("❌ Failed to submit feedback", "error");
      }
    });

  } catch (error) {
    console.error("❌ Error in submitFeedback:", error);
    showFeedbackStatus("❌ An error occurred while submitting feedback.", "error");
  }
}