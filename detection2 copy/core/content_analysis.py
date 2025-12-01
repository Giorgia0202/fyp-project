import re
import torch
from core.utils import extract_domain, is_domain_trusted
from core.url_analysis import extract_all_urls_for_analysis, predict_url_score, is_domain_suspicious
from models.models import content_model, content_tokenizer, TRUSTED_DOMAINS
from config import device, PHISHING_KEYWORDS

def predict_content(text):
    inputs = content_tokenizer(text, return_tensors="pt", padding=True, truncation=True, max_length=256).to(device)
    with torch.no_grad():
        logits = content_model(**inputs).logits
        probs = torch.softmax(logits, dim=1)
    idx = torch.argmax(probs, dim=1).item()
    label_map = content_model.config.id2label
    label = label_map[idx].lower().replace("label_", "") if idx in label_map else str(idx)
    return label, probs[0][idx].item()

def apply_heuristics(text, domain):
    """
    MODIFIED: Apply heuristic rules with capped scoring to prevent overflow
    """
    score = 0.0
    lowered = text.lower()
    keyword_count = 0
    urgency_count = 0

    # 1) Phishing keywords 
    for phrase in PHISHING_KEYWORDS:
        if phrase in lowered:
            keyword_count += 1
            print(f"[HEURISTIC] Found phishing keyword: '{phrase}'")
    
    # Cap keyword contribution to prevent overflow
    keyword_score = min(keyword_count * 0.02, 0.10)  # Max 0.10 from keywords
    score += keyword_score

    # 2) Urgency phrases 
    urgency_phrases = [
        '24 hours', '48 hours', 'immediately',
        'expires', 'temporary lock', 'suspended'
    ]
    for phrase in urgency_phrases:
        if phrase in lowered:
            urgency_count += 1
            print(f"[HEURISTIC] Found urgency phrase: '{phrase}'")
    
    # Cap urgency contribution
    urgency_score = min(urgency_count * 0.03, 0.09)  # Max 0.09 from urgency
    score += urgency_score

    # 3) Suspicious domain pattern - fixed penalty
    if is_domain_suspicious(domain):
        score += 0.05

    # Cap total heuristic score to prevent overflow
    final_score = min(score, 1.0)
    return final_score

def detect_spoofing(text, urls):
    """
    Enhanced spoofing detection that catches:
    1. Domain mismatches (original functionality)
    2. Legitimate-looking text linking to malicious URLs (NEW)
    3. Deceptive action words linking to phishing (NEW)
    """
    spoofing_score = 0.0
    spoofing_detected = False
    
    # Extract hyperlink patterns from content.js format: "display_text (actual_url)"
    hyperlink_pattern = r'([^\s\(]+)\s+\(([^)]+)\)'
    hyperlink_matches = re.findall(hyperlink_pattern, text)
    
    print(f"[SPOOFING] Analyzing {len(hyperlink_matches)} hyperlinks")
    
    # NEW: Legitimate action words that are commonly used in phishing
    legitimate_action_words = [
        'open', 'view', 'download', 'access', 'login', 'sign in', 'verify', 
        'confirm', 'update', 'review', 'check', 'click here', 'continue',
        'proceed', 'activate', 'enable', 'unlock', 'restore', 'recover',
        'document', 'file', 'report', 'statement', 'invoice', 'receipt'
    ]
    
    for display_text, actual_url in hyperlink_matches:
        display_domain = extract_domain(display_text) if display_text.startswith(('http', 'www')) else display_text.lower()
        actual_domain = extract_domain(actual_url)
        
        # Skip if domains are empty
        if not actual_domain:
            continue
        
        #Legitimate action words pointing to malicious URLs
        display_lower = display_text.lower()
        contains_action_word = any(action in display_lower for action in legitimate_action_words)
        
        if contains_action_word:
            # Check if the URL is malicious using existing ML model
            try:
                label_url, conf_url = predict_url_score(actual_url)
                url_is_malicious = (label_url == 1 and conf_url > 0.5)
            except:
                url_is_malicious = False
            
            # Check if domain is suspicious using heuristics
            url_is_suspicious = is_domain_suspicious(actual_domain)
            
            # Check if actual URL is NOT trusted
            actual_is_trusted = is_domain_trusted(actual_domain)
            
            if (url_is_malicious or url_is_suspicious) and not actual_is_trusted:
                spoofing_detected = True
                penalty = 0.7 if url_is_malicious else 0.5
                spoofing_score += penalty
                continue
        
        # Skip if domains are the same or related (subdomain, same base domain)
        if display_text.startswith(('http', 'www')) and display_domain and actual_domain:
            if (display_domain == actual_domain or 
                display_domain in actual_domain or 
                actual_domain in display_domain):
                continue
            
            # Use existing ML URL model to check if actual URL is malicious
            try:
                label_url, conf_url = predict_url_score(actual_url)
                url_is_malicious = (label_url == 1 and conf_url > 0.6)
            except:
                url_is_malicious = False
            
            # Use existing heuristics to check if actual URL is suspicious
            url_is_suspicious = is_domain_suspicious(actual_domain)
            
            # Check if display mentions trusted domain but actual isn't trusted
            display_mentions_trusted = is_domain_trusted(display_domain) or any(td in display_domain for td in TRUSTED_DOMAINS)
            actual_is_trusted = is_domain_trusted(actual_domain)
            
            # Only flag spoofing if display mentions trusted domain/brand AND actual URL is malicious/suspicious AND actual URL is not trusted
            if display_mentions_trusted and not actual_is_trusted and (url_is_malicious or url_is_suspicious):
                spoofing_detected = True
                penalty = 0.8 if url_is_malicious else 0.6
                spoofing_score += penalty
    
    # This catches cases where URLs are embedded but not in "text (url)" format
    all_urls_in_text = re.findall(r'https?://[^\s)]+', text)
    
    for url in all_urls_in_text:
        # Skip if this URL was already analyzed in hyperlink patterns
        if any(url in match[1] for match in hyperlink_matches):
            continue
        
        domain = extract_domain(url)
        if not domain or is_domain_trusted(domain):
            continue
        
        # Check if URL is malicious
        try:
            label_url, conf_url = predict_url_score(url)
            url_is_malicious = (label_url == 1 and conf_url > 0.6)
        except:
            url_is_malicious = False
        
        if url_is_malicious:
            # Look for nearby legitimate-looking text
            url_context = text[max(0, text.find(url) - 50):text.find(url) + len(url) + 50]
            context_has_action = any(action in url_context.lower() for action in legitimate_action_words)
            
            if context_has_action:
                spoofing_detected = True
                spoofing_score += 0.4
    
    # Cap spoofing score to max 1.0
    spoofing_score = min(spoofing_score, 1.0)
    return spoofing_detected, spoofing_score