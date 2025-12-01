import re
import numpy as np
from urllib.parse import urlparse
from models.models import TRUSTED_DOMAINS

# Regex patterns
URL_REGEX = re.compile(r"https?://[^\s)]+|www\.[^\s)]+")
EMAIL_REGEX = re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+")

def make_json_serializable(obj):
    """Convert numpy/torch types to Python native types for JSON serialization"""
    if isinstance(obj, dict):
        return {key: make_json_serializable(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [make_json_serializable(item) for item in obj]
    elif isinstance(obj, (np.float32, np.float64)):
        return float(obj)
    elif isinstance(obj, (np.int32, np.int64)):
        return int(obj)
    elif hasattr(obj, 'item'):  # PyTorch tensors
        return obj.item()
    else:
        return obj

def is_gmail_address(url):
    """
    Simple function to detect Gmail addresses
    """
    gmail_domains = ['@gmail.com', '@googlemail.com', '@google.com', '@youtube.com']
    url_lower = url.lower()
    
    # Check if it's an email address (contains @ but not http)
    if '@' in url and not url.startswith(('http://', 'https://')):
        for domain in gmail_domains:
            if domain in url_lower:
                return True
    
    return False

def classify_input(text):
    text = text.strip()
    # pure email address?
    if EMAIL_REGEX.fullmatch(text):
        return "email"
    # pure single URL?
    if URL_REGEX.fullmatch(text):
        return "url"
    # contains at least one URL in a block of text
    if URL_REGEX.search(text):
        return "text"
    return "text"

def extract_domain(text):
    try:
        # Handle cases where URL might not have protocol
        if not text.startswith(('http://', 'https://')):
            text = 'http://' + text
        
        domain = urlparse(text).netloc.lower()
        
        # Remove 'www.' prefix for better matching
        if domain.startswith('www.'):
            domain = domain[4:]
            
        return domain
    except:
        return ""

def is_image_url(url):
    """
    Check if a URL points to an image file
    """
    if not url:
        return False
    
    # Common image file extensions
    image_extensions = [
        '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg',
        '.ico', '.tiff', '.tif', '.avif', '.jfif', '.pjpeg', '.pjp'
    ]
    
    # Convert to lowercase for case-insensitive matching
    url_lower = url.lower()
    
    # Check if URL ends with any image extension
    for ext in image_extensions:
        if url_lower.endswith(ext):
            return True
        # Also check for URLs with parameters after the extension
        if ext in url_lower and (url_lower.find(ext) + len(ext) < len(url_lower)):
            # Check if the character after the extension is a query parameter or fragment
            next_char_pos = url_lower.find(ext) + len(ext)
            if next_char_pos < len(url_lower) and url_lower[next_char_pos] in '?#&':
                return True
    
    return False

def is_domain_trusted(domain):
    """
    Enhanced trusted domain checking with better subdomain support
    """
    if not domain:
        return False
    
    domain_lower = domain.lower()
    
    # Remove www. prefix for better matching
    if domain_lower.startswith('www.'):
        domain_lower = domain_lower[4:]
    
    for trusted_domain in TRUSTED_DOMAINS:
        # Skip comments and empty lines
        if trusted_domain.startswith('#') or not trusted_domain.strip():
            continue
            
        trusted_lower = trusted_domain.lower()
        
        # Exact match
        if domain_lower == trusted_lower:
            return True
        
        # Subdomain match
        if domain_lower.endswith(f'.{trusted_lower}'):
            return True
    
    return False

def preprocess_url(url):
    try:
        clean = re.sub(r'^https?:\/\/(www\.)?', '', url.lower())
        parsed = urlparse("http://" + clean)
        return f"{parsed.netloc} {parsed.path} {parsed.query}"
    except:
        return "invalid_url"

def clean_email_subject(subject):
    """
    Clean email subject by removing extension badges and artifacts
    This is a server-side failsafe to ensure clean subjects are stored
    """
    if not subject:
        return "No Subject"
    
    print(f"[SUBJECT CLEAN] Original subject: '{subject}'")
    
    # Store original for comparison
    original = subject
    cleaned = subject
    
    # Remove shield emoji + prediction patterns (most common)
    cleaned = re.sub(r'🛡️\s*(SAFE|PHISHING|SUSPICIOUS)\s*\([^)]+\)', '', cleaned, flags=re.IGNORECASE)
    
    # Remove standalone prediction patterns without emoji
    cleaned = re.sub(r'\s*(SAFE|PHISHING|SUSPICIOUS)\s*\([^)]+\)', '', cleaned, flags=re.IGNORECASE)
    
    # Remove just the shield emoji if it exists alone
    cleaned = re.sub(r'🛡️\s*', '', cleaned)
    
    # Remove any remaining score patterns like (0.30)
    cleaned = re.sub(r'\s*\(\d+\.\d{2}\)\s*', '', cleaned)
    
    # Remove any remaining badge-like patterns
    cleaned = re.sub(r'\s*(SAFE|PHISHING|SUSPICIOUS)\s*', '', cleaned, flags=re.IGNORECASE)
    
    # Clean up whitespace
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    
    # If cleaning resulted in empty string, try alternative extraction
    if not cleaned or len(cleaned) < 3:
        # Try to extract everything before first emoji or badge pattern
        match = re.match(r'^([^🛡️]+?)(?:\s*🛡️|$)', original)
        if match and match.group(1).strip():
            cleaned = match.group(1).strip()
        else:
            # Last resort: return original if we can't clean it
            cleaned = original
    
    # Final validation - ensure it doesn't still contain badge text
    if any(word in cleaned.upper() for word in ['SAFE', 'PHISHING', 'SUSPICIOUS']):
        # Emergency cleaning: take everything before any of these words
        for word in ['SAFE', 'PHISHING', 'SUSPICIOUS', '🛡️']:
            if word in cleaned:
                parts = cleaned.split(word)
                if parts[0].strip():
                    cleaned = parts[0].strip()
                    break
    
    print(f"[SUBJECT CLEAN] Cleaned subject: '{cleaned}'")
    print(f"[SUBJECT CLEAN] Changed: {original != cleaned}")
    
    return cleaned if cleaned else "No Subject"