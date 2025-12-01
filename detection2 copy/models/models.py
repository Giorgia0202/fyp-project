import joblib
import torch
import os
from transformers import AutoModelForSequenceClassification, AutoTokenizer
from config import device, MODEL_PATH

import os
import warnings
import sys

warnings.filterwarnings('ignore')
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
os.environ['PYTHONWARNINGS'] = 'ignore'
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'

# Suppress scikit-learn verbose output
import sklearn
sklearn.set_config(print_changed_only=True)

try:
    import xgboost as xgb
    xgb.set_config(verbosity=0)
except ImportError:
    pass

# If you're using transformers, also add:
try:
    import transformers
    transformers.logging.set_verbosity_error()
except ImportError:
    pass

# Get the directory where this script is located
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_FILES_DIR = os.path.join(BASE_DIR, "../saved_model")

# Load models
content_model = AutoModelForSequenceClassification.from_pretrained(MODEL_PATH).to(device).eval()
content_tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)

# Load vectorizer and URL model with absolute paths
try:
    vectorizer = joblib.load(os.path.join(MODEL_FILES_DIR, "tfidf_vectorizer_improved.pkl"))
    print(f"✅ Loaded vectorizer from {os.path.join(MODEL_FILES_DIR, 'tfidf_vectorizer_improved.pkl')}")
except FileNotFoundError:
    print(f"❌ Error: tfidf_vectorizer_improved.pkl not found at {os.path.join(MODEL_FILES_DIR, 'tfidf_vectorizer_improved.pkl')}")
    raise

try:
    url_model = joblib.load(os.path.join(MODEL_FILES_DIR, "xgboost_tfidf_model_improved.pkl"))
    print(f"✅ Loaded URL model from {os.path.join(MODEL_FILES_DIR, 'xgboost_tfidf_model_improved.pkl')}")
except FileNotFoundError:
    print(f"❌ Error: xgboost_tfidf_model_improved.pkl not found at {os.path.join(MODEL_FILES_DIR, 'xgboost_tfidf_model_improved.pkl')}")
    raise

# Load trusted domains from file - with auto-creation if missing
TRUSTED_DOMAINS = []

try:
    print(f"[DEBUG] Current working directory: {os.getcwd()}")
    print(f"[DEBUG] Script directory: {BASE_DIR}")
    
    # Get exact filename from directory listing
    all_files = os.listdir(".")
    trusted_file = None
    
    for file in all_files:
        if file == "trusted_domains.txt":
            trusted_file = file
            print(f"[DEBUG] Found exact match: '{file}'")
            break
    
    if trusted_file:
        print(f"[DEBUG] Attempting to read: '{trusted_file}'")
        try:
            # Try reading with different encodings
            encodings = ['utf-8', 'latin-1', 'ascii']
            for encoding in encodings:
                try:
                    with open(trusted_file, 'r', encoding=encoding) as f:
                        content = f.read()
                        print(f"[DEBUG] Successfully read with {encoding} encoding")
                        print(f"[DEBUG] File content length: {len(content)}")
                        
                        # Parse the content
                        lines = content.strip().split('\n')
                        TRUSTED_DOMAINS = [line.strip().lower() for line in lines if line.strip() and not line.startswith("#")]
                        print(f"✅ Loaded {len(TRUSTED_DOMAINS)} trusted domains from existing file")
                        if len(TRUSTED_DOMAINS) > 0:
                            print(f"[DEBUG] First few domains: {TRUSTED_DOMAINS[:5]}")
                        break
                except UnicodeDecodeError:
                    print(f"[DEBUG] Failed to read with {encoding} encoding")
                    continue
                except Exception as e:
                    print(f"[DEBUG] Error with {encoding}: {e}")
                    continue
        except Exception as e:
            print(f"[DEBUG] Error reading file: {e}")
    else:
        print("[DEBUG] trusted_domains.txt not found in directory listing")
        # Do not auto-create or use basic_domains fallback
        pass
except Exception as e:
    print(f"❌ ERROR: {e}")
    TRUSTED_DOMAINS = ['google.com', 'github.com', 'microsoft.com']
    print(f"✅ Using emergency fallback: {TRUSTED_DOMAINS}")

print(f"[DEBUG] Final trusted domains count: {len(TRUSTED_DOMAINS)}")