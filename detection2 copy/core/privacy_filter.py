import re
import hashlib
from typing import Dict, List, Tuple

class PrivacyFilter:
    def __init__(self):
        # Define sensitive data patterns - ENHANCED with name detection and financial data
        self.patterns = {
            'email': r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
            'phone': r'\b(\+?60[-.\s]?)?(?:\(?\d{2,3}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{4}\b',
            'credit_card': r'\b(?:\d[ -]*?){13,19}\b',
            'ssn': r'\b\d{3}-?\d{2}-?\d{4}\b',
            'name': r'\b(Ms\.|Mr\.|Mrs\.|Dr\.)\s+[A-Z][a-z]+\b',
            'verification_code': r'\b(?:verification code|OTP|PIN)\s*[:：]\s*[A-Za-z0-9]{4,10}\b',
            # UPDATED: More specific flight number pattern - requires "flight" context or airline code pattern
            'flight_number': r'\b(?:flight|flt)[\s#:]*[A-Z]{2,3}\d{3,5}\b|\b(?:AA|UA|DL|BA|LH|AF|EK|SQ|MH|AK|OD|QZ|FD|ID|GA)\d{3,5}\b',
            'ip_address': r'\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b',
            # 'url_params': r'(\?|&)[^=]+=[^&\s]+',  # COMMENTED OUT to avoid unnecessary URL parameter removal
            'api_key': r'\b[A-Za-z0-9]{32,}\b',
            'account_number': r'\b(?:account|acc)[\s#:]+\d{8,20}\b',
            # NEW: Financial amounts in various currencies
            'currency_amount': r'(?:RM|USD|EUR|GBP|£|\$|€|¥|₹|MYR|SGD)[ \t]*[0-9][\d,]*\.?\d*',
            'amount_with_decimals': r'\b\d{1,3}(?:,\d{3})*\.\d{2}\b',
            # NEW: Transaction and financial terms
            # Require separator and code to start with a digit (to avoid matching 'reference' in normal text)
            'transaction_id': r'\b(?:transaction|txn|reference|ref)[\s#:]+[0-9][A-Z0-9]{5,}\b',
            'invoice_number': r'\b(?:invoice|inv)[\\s#:]+[0-9][A-Z0-9]{3,}\b',
            # NEW: Personal identifiers
            'nric': r'\b\d{6}-\d{2}-\d{4}\b',
            'employee_id': r'\b(?:employee|emp|staff)[\s#:]*[A-Z0-9]{4,}\b',
            # NEW: Personal name patterns - UPDATED to handle ALL CAPS
            'personal_name': r'\b(?:Hello|Hi|Dear|Hey)\s+([A-Z][A-Za-z]*(?:\s+[A-Z][A-Za-z]*)*)[,\s]',
            'name_in_greeting': r'\b(Hello|Hi|Dear|Hey)\s+([A-Z][A-Za-z]*(?:\s+[A-Z][A-Za-z]*)*)[,\s]',
            # NEW: URL patterns - make them unusable but preserve domain
            'full_url': r'https?://[^\s)]+',
            'www_url': r'www\.[^\s)]+',
        }
        
        # Sensitive keywords that need context checking - EXPANDED
        self.sensitive_keywords = [
            'password', 'pin', 'verification', 'code', 'otp', 'token',
            'social security', 'passport', 'license', 'balance', 
            'account balance', 'total amount', 'payment', 'salary',
            'income', 'earnings', 'withdrawal', 'deposit',
            # Gmail/Email-specific
            'your verification code is', 'reset your password', 'security code',
            'reset link', 'reset your account', 'confirm your identity',
            '2-step verification', '2 factor authentication', 'login code',
            'temporary password', 'one-time password', 'one time password',
            'authorization code', 'auth code', 'access code', 'unlock code',
            'change your password', 'set a new password', 'update your password',
        ]

    def sanitize_content(self, content: str, is_subject: bool = False) -> Dict:
        """
        Main function to sanitize content and return results
        Skip filtering for subjects since they rarely contain sensitive info
        """
        if not content:
            return {
                'sanitized_content': '',
                'sensitive_detected': False,
                'content_hash': '',
                'removed_patterns': [],
         }

        original = content

        # Strip real <img> tags and Markdown images → "[IMAGE]"
        sanitized = re.sub(r'<img\b[^>]*>', '[IMAGE]', original, flags=re.IGNORECASE)
        sanitized = re.sub(r'!\[[^\]]*\]\([^\)]*\)', '[IMAGE]', sanitized)

        # Collapse any old "[IMAGE:...]" placeholders
        sanitized = re.sub(r'\[IMAGE:[^\]]+\]', '[IMAGE]', sanitized, flags=re.IGNORECASE)

        # If this is a subject, skip all further filtering
        if is_subject:
            return {
                'sanitized_content': original,
                'sensitive_detected': False,
                'content_hash': hashlib.sha256(original.encode()).hexdigest()[:16],
                'removed_patterns': []
            }

        detected_patterns = []

        # Apply name filtering
        sanitized, name_patterns = self._filter_personal_names(sanitized)
        detected_patterns.extend(name_patterns)

        # Apply URL filtering
        sanitized, url_patterns = self._filter_urls(sanitized)
        detected_patterns.extend(url_patterns)

        # Rule-based masking for other sensitive patterns
        for pattern_name, pattern in self.patterns.items():
            if pattern_name in ['personal_name', 'name_in_greeting', 'full_url', 'www_url']:
                continue
            if re.search(pattern, sanitized, re.IGNORECASE):
                detected_patterns.append(pattern_name)
                if pattern_name == 'currency_amount':
                    sanitized = re.sub(pattern, '[AMOUNT_REMOVED]', sanitized, flags=re.IGNORECASE)
                elif pattern_name == 'amount_with_decimals':
                    sanitized = re.sub(
                        r'\b\d{1,3}(?:,\d{3})+\.\d{2}\b',
                        '[AMOUNT_REMOVED]',
                        sanitized
                    )
                else:
                    sanitized = re.sub(
                        pattern,
                        f'[{pattern_name.upper()}_REMOVED]',
                        sanitized,
                        flags=re.IGNORECASE
                    )

        # Keyword-based context filtering
        keyword_patterns = self._detect_sensitive_keywords(sanitized)
        detected_patterns.extend(keyword_patterns)

        # Drop any "[LINK_TO_...]" immediately following an "[IMAGE]"
        sanitized = re.sub(
            r'\[IMAGE\]\s*(?:\(\s*)?\[LINK_TO_[^\]]+\](?:\s*\))?',
            '[IMAGE]',
            sanitized
        )

        # Final whitespace cleanup and compute hash
        # Collapse runs of spaces/tabs but keep newlines
        sanitized = re.sub(r'[ \t]+', ' ', sanitized)

        # Normalize multiple blank lines → two newlines
        sanitized = re.sub(r'\n\s*\n+', '\n\n', sanitized)

        # Strip leading/trailing spaces *on each line* (but keep the line breaks)
        lines = [line.strip() for line in sanitized.splitlines()]
        sanitized = "\n".join(lines).strip()

        # Compute your hash
        content_hash = hashlib.sha256(original.encode()).hexdigest()[:16]

        return {
            'sanitized_content': sanitized,
            'sensitive_detected': bool(detected_patterns),
            'content_hash': content_hash,
            'removed_patterns': list(set(detected_patterns))
            }

    def _filter_personal_names(self, content: str) -> Tuple[str, List[str]]:
        """
        Filter personal names from greetings and content
        """
        detected_patterns = []
        
        #pattern will match names that are all caps, title case, or mixed case
        greeting_pattern = r'\b(Hello|Hi|Dear|Hey)\s+([A-Z][A-Z]*(?:\s+[A-Z][A-Z]*)*)[,\s]'
        
        def replace_greeting(match):
            greeting = match.group(1)
            name = match.group(2)
            punctuation = match.group(0)[-1] if match.group(0)[-1] in ',\s' else ','
            
            # Check if it's likely a real name (including ALL CAPS)
            if self._is_likely_name(name):
                detected_patterns.append('personal_name_in_greeting')
                return f"{greeting} [NAME]{punctuation}"
            return match.group(0)
        
        content = re.sub(greeting_pattern, replace_greeting, content)
        
        # Pattern 2: Names in signatures or sign-offs
        signature_pattern = r'\b(Warmly|Regards|Sincerely|Best|Thanks)[,\s]*\n?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)'
        
        def replace_signature(match):
            sign_off = match.group(1)
            name = match.group(2)
            
            if self._is_likely_name(name):
                detected_patterns.append('personal_name_in_signature')
                return f"{sign_off},\n[NAME]"
            return match.group(0)
        
        content = re.sub(signature_pattern, replace_signature, content)
        
        return content, detected_patterns

    def _filter_urls(self, content: str) -> Tuple[str, List[str]]:
        """
        MODIFIED: Preserve URLs for analysis instead of making them unusable
        Only apply privacy filtering to truly sensitive content, not URLs needed for phishing detection
        """
        detected_patterns = []
        
        # Pattern 1: Full URLs (http/https) - PRESERVE THEM
        def replace_full_url(match):
            url = match.group(0)
            detected_patterns.append('url_detected_and_preserved')
            # Return the URL as-is for analysis
            return url
        
        content = re.sub(r'https?://[^\s)]+', replace_full_url, content)
        
        # Pattern 2: www URLs - PRESERVE THEM
        def replace_www_url(match):
            url = match.group(0)
            detected_patterns.append('www_url_detected_and_preserved')
            # Return the URL as-is for analysis
            return url
        
        content = re.sub(r'www\.[^\s)]+', replace_www_url, content)
        
        return content, detected_patterns

    def _is_likely_name(self, text: str) -> bool:
        """
        Determine if a text string is likely a personal name (pattern-based, no hardcoded names)
        """
        if not text or len(text) < 2:
            return False
        # Only use pattern-based checks, no hardcoded name list
        if re.match(r'^[A-Z][A-Za-z]*(?:\s+[A-Z][A-Za-z]*)*$', text):
            words = text.split()
            business_indicators = ['team', 'support', 'service', 'company', 'corp', 'inc', 'ltd']
            if any(indicator in text.lower() for indicator in business_indicators):
                return False
            if len(words) > 4:
                return False
            if any(len(word) < 2 for word in words):
                return False
            if text.isupper() and len(words) >= 2:
                return True
            return True
        return False
    
    def _detect_sensitive_keywords(self, content: str) -> List[str]:
        """
        Detect sensitive information based on keywords and context
        """
        detected = []
        content_lower = content.lower()
        sentences = re.split(r'(?<=[.!?])\s+', content)
        new_sentences = []
        for sentence in sentences:
            sentence_lower = sentence.lower()
            redacted = False
            for keyword in self.sensitive_keywords:
                if keyword in sentence_lower:
                    detected.append(f'sensitive_{keyword.replace(" ", "_")}')
                    # Redact the whole sentence if keyword is found
                    new_sentences.append(f'[SENSITIVE_{keyword.upper().replace(" ", "_")}_REMOVED]')
                    redacted = True
                    break
            if not redacted:
                new_sentences.append(sentence)
        # Join sentences back
        content = ' '.join(new_sentences)
        return detected
    
    def sanitize_email_address(self, email: str) -> str:
        """
        Convert email to domain-only for analysis
        """
        if not email or '@' not in email:
            return '[EMAIL_REMOVED]'
        
        try:
            domain = email.split('@')[1]
            return f'[USER]@{domain}'
        except:
            return '[EMAIL_REMOVED]'
    
    def sanitize_subject(self, subject: str) -> str:
        """
        Sanitize email subject - but skip filtering since subjects rarely contain sensitive info
        """
        if not subject:
            return ''
        
        # Use is_subject=True to skip filtering
        result = self.sanitize_content(subject, is_subject=True)
        return result['sanitized_content']
    
    def extract_domain_from_url(self, url: str) -> str:
        """
        Extract only domain from URL, remove sensitive parameters
        """
        try:
            # Remove URL parameters
            clean_url = re.sub(r'\?.*', '', url)
            # Extract domain pattern
            domain_match = re.search(r'(?:https?://)?(?:www\.)?([^/]+)', clean_url)
            if domain_match:
                return domain_match.group(1)
            return '[DOMAIN_EXTRACTED]'
        except:
            return '[URL_REMOVED]'
    
    def should_store_content(self, content: str) -> bool:
        """
        Determine if content is safe to store after sanitization
        """
        result = self.sanitize_content(content)
        
        # Don't store if too much sensitive data was detected
        sensitive_patterns = result['removed_patterns']
        high_risk_patterns = ['credit_card', 'ssn', 'password_pattern', 'api_key']
        
        # DEBUG: Print what's being detected
        print(f"[PRIVACY DEBUG] Original content length: {len(content)}")
        print(f"[PRIVACY DEBUG] Sanitized content length: {len(result['sanitized_content'])}")
        print(f"[PRIVACY DEBUG] Patterns detected: {sensitive_patterns}")
        print(f"[PRIVACY DEBUG] Sanitized content: {result['sanitized_content'][:200]}...")
        
        if any(pattern in sensitive_patterns for pattern in high_risk_patterns):
            print(f"[PRIVACY DEBUG] High risk patterns found: {[p for p in sensitive_patterns if p in high_risk_patterns]}")
            return False
        
        # Don't store if content is mostly sensitive data
        original_length = len(content)
        sanitized_length = len(result['sanitized_content'])
        
        if original_length > 0 and (sanitized_length / original_length) < 0.1:
            print(f"[PRIVACY DEBUG] Content too heavily sanitized: {sanitized_length}/{original_length} = {sanitized_length/original_length:.2f}")
            return False
        
        return True

