import torch
import os
import sys

db_password = os.environ.get('DB_PASSWORD')
if not db_password:
    print("ERROR: DB_PASSWORD environment variable is not set. Please set it in your .env file.")
    sys.exit(1)

# Database configuration
DB_CONFIG = {
    'host': os.environ.get('DB_HOST', 'localhost'),
    'database': os.environ.get('DB_NAME', 'phishing_feedback_db'),
    'user': os.environ.get('DB_USER', 'root'),
    'password': db_password
}

# Model configuration
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
MODEL_PATH = "./saved_model"

# Scoring weights
CONTENT_WEIGHT = 0.28     
URL_WEIGHT = 0.40          
SPOOFING_WEIGHT = 0.17     
DOMAIN_WEIGHT = 0.06       
HEURISTIC_WEIGHT = 0.09    

# Validation: Total = 1.00
TOTAL_WEIGHT = (CONTENT_WEIGHT + URL_WEIGHT + SPOOFING_WEIGHT + 
                DOMAIN_WEIGHT + HEURISTIC_WEIGHT)
assert abs(TOTAL_WEIGHT - 1.0) < 1e-10, f"Weights must sum to 1.0, got {TOTAL_WEIGHT}"

# Security patterns
LEET_MAP = str.maketrans({
    '0': 'o',
    '1': 'l',
    '3': 'e',
    '4': 'a',
    '5': 's',
    '7': 't'
})

SUSPICIOUS_TLDS = ['.su', '.tk', '.ml', '.ga', '.cf', '.click', '.live', '.top']
SHORTENERS = [
    'bit.ly', 'tinyurl.com', 't.co', 'tinycc.com', 'short.link',
    'ow.ly', 'tiny.cc', 'is.gd', 'buff.ly'
]

PHISHING_KEYWORDS = [
    "click the link", "confirm your identity", "account suspension",
    "verify", "login", "urgent", "24 hours", "temporary suspension", "immediate action required",
    "suspended", "locked", "expires", "click here", "act now", "unusual login", "unrecognized device",
    "verify your account", "security alert", "account compromised", "verify immediately"
]

SUSPICIOUS_DOMAIN_PATTERNS = [
    'hsbc', 'paypal', 'amazon', 'microsoft', 'apple', 'google', 'facebook', 'instagram',
    'netflix', 'spotify', 'dropbox', 'github', 'linkedin', 'twitter', 'whatsapp','glassdoor'
]