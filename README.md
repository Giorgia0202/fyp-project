# Real-Time Phishing Detection for Personal Email Using a Chrome Extension and Machine Learning

This project is my Final Year Project titled:

**Develop a Real-Time Phishing Detection Solution for Personal Email Through a Chrome Extension Using Machine Learning**

The system works directly inside Gmail. When the user clicks an email, a Chrome Extension sends the email content and URLs to a backend server. The backend analyzes the email using two trained machine learning models and a custom scoring system. Based on the result, the extension displays a **color indicator behind the email’s subject/title**:

- 🟩 **Green** – Safe  
- 🟨 **Yellow** – Suspicious  
- 🟥 **Red** – Likely phishing  

---

## 🌟 Main Idea

Emails often contain clues that reveal whether they are legitimate or phishing.  
This project combines:

- **Machine Learning (DistilBERT)** to analyze email text  
- **XGBoost + TF-IDF** to analyze URLs found inside the email  
- **Heuristic checks** (spoofing, domain risk, keywords)  
- **A Chrome Extension** for real-time on-screen alerts  

The goal is to help users recognise dangerous emails before clicking any links.

---

## 🔍 How the Detection Works

When an email is opened, the extension extracts:

- The full **email content**
- All **URLs**, including hidden hyperlinks
- The **sender’s domain**
- Any **display text vs actual URL** (for spoofing)

These are sent to the backend API.

The backend generates a final **risk score (0 to 1)** using **five components**, each with a fixed weight:

### **1. Content Analysis (28%) – DistilBERT**
A fine-tuned DistilBERT model checks the email text for phishing-style language such as threats, urgency, fake account updates, etc.

### **2. URL Analysis (40%) – XGBoost + TF-IDF**
The system collects all URLs inside the email.  
Each URL is processed using a trained XGBoost model.  
Among all suspicious URLs, the system takes the **highest confidence score** to calculate this component.

This is the most heavily weighted part.

### **3. Spoofing Detection (17%)**
Checks if the displayed text and actual URL mismatch.  
Example:  
“You are logging into **google.com**” → actually links to **malicious-site.com**

### **4. Domain Analysis (6%)**
Checks if the sender's email domain appears suspicious or is not in the safe/trusted list.

### **5. Heuristic Rules (9%)**
Simple rule-based checks using common phishing patterns  
(e.g., “verify your account”, “your password expires”, “urgent action required”).

---

## 🎨 Email Warning UI

After processing, the backend returns:

- A final **risk score**
- The classification (safe / suspicious / phishing)

The extension then shows:

### **Color Indicator Behind Email Title**
- 🟩 **Green** – Safe  
- 🟨 **Yellow** – Suspicious  
- 🟥 **Red** – Phishing detected  

### **Link Warning Popup**
If a phishing/suspicious link is clicked:

- The extension shows a popup
- It reveals the **full URL**, even if it was hidden behind hyperlink text
- Warns the user before they continue

---




