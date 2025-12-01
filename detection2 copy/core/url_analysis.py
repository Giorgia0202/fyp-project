import re
import difflib
from urllib.parse import urlparse, parse_qs
from bs4 import BeautifulSoup
from core.utils import URL_REGEX, EMAIL_REGEX, extract_domain, is_image_url, is_gmail_address, is_domain_trusted, preprocess_url
from models.models import vectorizer, url_model, TRUSTED_DOMAINS
from config import LEET_MAP, SUSPICIOUS_TLDS, SHORTENERS

def extract_all_urls_for_analysis(text):
    """
    Extract all URLs excluding image URLs for comprehensive analysis
    """
    urls = set()
    
    # ONLY use the existing URL_REGEX (most reliable)
    regular_urls = URL_REGEX.findall(text)
    urls.update(regular_urls)
    
    # Extract hyperlink patterns: "display_text (actual_url)" 
    hyperlink_pattern = r'([^\s\(]+)\s+\(([^)]+)\)'
    hyperlink_matches = re.findall(hyperlink_pattern, text)
    
    for display_text, actual_url in hyperlink_matches:
        # Only add actual URLs (must start with http/https)
        if actual_url.startswith(('http://', 'https://')):
            urls.add(actual_url)
            
            # Only add display text if it's also a URL
            if display_text.startswith(('http://', 'https://', 'www.')):
                urls.add(display_text)
    
    # Extract URLs in parentheses - ONLY if they start with http/https
    paren_urls = re.findall(r'\((https?://[^)]+)\)', text)
    if paren_urls:
        urls.update(paren_urls)
    
    # Extract email addresses (these are safe and identifiable)
    email_matches = re.findall(EMAIL_REGEX, text)
    if email_matches:
        urls.update(email_matches)
    
    # Filter out image URLs AND Gmail interface URLs silently
    filtered_urls = []
    for url in urls:
        # Skip image URLs
        if is_image_url(url):
            continue
        
        # Skip Gmail interface/system URLs  
        if any(pattern in url.lower() for pattern in [
            'gmail.com/mail/help/images',
            'gstatic.com/images',
            'googleusercontent.com',
            '.gif', '.png', '.jpg', '.jpeg'
        ]):
            continue
        
        # Skip if URL contains only hashes/IDs (like the ML features you saw)
        if re.match(r'^[a-f0-9]+$', extract_domain(url)):
            continue
            
        filtered_urls.append(url)
    
    return filtered_urls


def is_domain_suspicious(domain: str) -> bool:
    """
    Enhanced heuristics + fuzzy-brand detection.
    Returns True if the domain should be flagged as suspicious.
    Uses the existing trusted_domains.txt file for legitimate domain checking.
    """
    if not domain:
        return False

    domain_lower = domain.lower()
    suspicious_score = 0

    if is_domain_trusted(domain_lower):
        return False

    # Suspicious TLDs
    for tld in SUSPICIOUS_TLDS:
        if domain_lower.endswith(tld):
            suspicious_score += 3

    # URL shorteners
    for short in SHORTENERS:
        if short in domain_lower:
            suspicious_score += 3

    # Extract brand names from trusted domains for comparison
    brand_keywords = set()
    
    # Extract main brand names from trusted domains
    for trusted_domain in TRUSTED_DOMAINS:
        # Skip government/educational TLDs
        if trusted_domain.startswith('.') or trusted_domain in ['gov', '.gov', '.edu']:
            continue
            
        # Extract the main brand name (before first dot)
        main_brand = trusted_domain.split('.')[0]
        if len(main_brand) >= 4:  # Only consider brands with 4+ characters
            brand_keywords.add(main_brand)
    
    # Split domain into parts for analysis
    labels = re.split(r"[.\-]", domain_lower)
    
    for label in labels:
        # De-leet the label
        norm_label = label.translate(LEET_MAP)
        
        for brand in brand_keywords:
            ratio = difflib.SequenceMatcher(None, norm_label, brand).ratio()
            
            # Flag typosquatting attempts (fuzzy matches)
            if 0.80 <= ratio < 1.0:
                suspicious_score += 3
            elif ratio == 1.0:
                # Perfect match - check if it's an impersonation attempt
                # If it was legitimate, it would have been caught by is_domain_trusted() above
                suspicious_score += 3

    # ── 3) Enhanced legitimacy override logic ──────────────────────────────
    if suspicious_score > 0:
        legitimacy_signals = 0

        # Check for structured email service patterns (like Gmail's goo.su)
        if re.match(r'^[a-z0-9]+-[0-9]+\.[a-z]+\.(com|net)$', domain_lower):
            legitimacy_signals += 2
        
        # Business TLDs are more legitimate
        if domain_lower.endswith(('.com','.net','.org','.edu','.gov')):
            legitimacy_signals += 1
        
        # Reasonable domain structure
        parts = domain_lower.split('.')
        if 2 <= len(parts) <= 4:
            legitimacy_signals += 1
        
        # No confusing characters
        if not any(c in domain_lower for c in ('0','1','l','I')):
            legitimacy_signals += 1

        if legitimacy_signals >= 3:
            return False

    # ── 4) Other suspicious patterns ──────────────────────────────────────
    suspicious_patterns = [
        '-', '_', 'secure', 'login', 'verify', 'account', 
        'update', 'confirm', 'billing', 'payment', 'auth'
    ]
    
    for pattern in suspicious_patterns:
        if pattern in domain_lower and domain_lower.count('.') >= 1:
            # Exception for structured email services
            if pattern == '-' and re.match(r'^[a-z0-9]+-[0-9]+\.[a-z]+\.(com|net)$', domain_lower):
                continue
            suspicious_score += 1

    # ── 5) Final decision ──────────────────────────────────────────────────
    is_suspicious = (suspicious_score >= 2)
    return is_suspicious

def predict_url_score(url):
    """
    ML-based URL scoring with image URL filtering and heuristic fallback
    """
    # ✅ FIXED: Skip image URLs entirely (no logging)
    if is_image_url(url):
        return 0, 0.0
    
    clean   = preprocess_url(url)
    vec     = vectorizer.transform([clean])
    domain  = extract_domain(url)

    # 1) Early-trust Gmail addrs & your trusted-domain list
    if is_gmail_address(url) or is_domain_trusted(domain):
        return 0, 0.0

    # 2) No ML features? fall back to your heuristic function
    if vec.sum() == 0:
        if is_domain_suspicious(domain):
            return 1, 0.6
        else:
            return 0, 0.0

    # 3) Otherwise, use the trained model
    probs = url_model.predict_proba(vec)[0]
    label = int(url_model.predict(vec)[0])
    conf  = float(probs[label])

    # 4) If ML says "safe" but our heuristics still find it suspicious, override
    if label == 0 and is_domain_suspicious(domain):
        return 1, 0.6

    # 5) Otherwise trust the ML result
    return label, conf

def extract_urls_enhanced(text, html=None):
    """
    Enhanced URL extraction that handles Gmail addresses properly
    and also pulls hrefs out of <a> tags if you pass in the raw HTML.
    Now also extracts URLs from all tag attributes for robustness.
    """
    # 1) existing text-based URLs and emails
    urls = set(URL_REGEX.findall(text))
    emails = set(re.findall(EMAIL_REGEX, text))

    if html:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, 'html.parser')
        # Extract all <a href="...">
        for a in soup.find_all('a', href=True):
            href = a['href'].strip()
            # Gmail proxy link → https://mail.google.com/...url=<real>&...
            if "mail.google.com" in href and "url=" in href:
                from urllib.parse import urlparse, parse_qs
                q = parse_qs(urlparse(href).query).get("url")
                if q:
                    urls.add(q[0])
                    continue
            urls.add(href)
        # Extract URLs from all tag attributes (for edge cases)
        for tag in soup.find_all(True):
            for attr, val in tag.attrs.items():
                if isinstance(val, str) and val.startswith('http'):
                    urls.add(val)
                elif isinstance(val, list):
                    for v in val:
                        if isinstance(v, str) and v.startswith('http'):
                            urls.add(v)
    # combine and return
    return list(urls | emails)

def predict_domain_score(domain):
    # If domain is trusted, return safe
    if is_domain_trusted(domain):
        return 0, 0.0
    
    pseudo_url = f"{domain}/"
    vec = vectorizer.transform([pseudo_url])
    if vec.sum() == 0:
        if is_domain_suspicious(domain):
            return 1, 0.6
        return 0, 0.0
    prob = url_model.predict_proba(vec)[0]
    label = url_model.predict(vec)[0]
    return label, prob[label]

def classify_urls_with_existing_logic(urls):
    all_urls_trusted = True
    suspicious_urls = []

    for url in urls:
        # ✅ FIXED: Skip image URLs (no logging)
        if is_image_url(url):
            continue
            
        domain = extract_domain(url)

        # Skip any domain in your TRUSTED_DOMAINS list
        if is_domain_trusted(domain):
            continue

        # 1) Heuristic check
        if is_domain_suspicious(domain):
            suspicious_urls.append(url)
            all_urls_trusted = False
            continue

        # 2) ML check
        label, conf = predict_url_score(url)
        if label == 1 and conf > 0.5:
            suspicious_urls.append(url)
            all_urls_trusted = False

    return all_urls_trusted, suspicious_urls