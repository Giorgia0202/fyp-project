from core.utils import extract_domain, is_domain_trusted, classify_input
from core.url_analysis import predict_url_score, predict_domain_score, is_domain_suspicious
from core.content_analysis import apply_heuristics
from config import (CONTENT_WEIGHT, URL_WEIGHT, SPOOFING_WEIGHT, 
                   DOMAIN_WEIGHT, HEURISTIC_WEIGHT)

def calculate_detailed_score(
    input_text, sender, urls, itype, label_text, conf_text,
    trusted_sender, spoofing_detected, spoofing_score,
    suspicious_urls, all_urls_trusted
):
    """Calculate score with consistent weights (0-1 guaranteed)"""
    
    conf = float(conf_text) if hasattr(conf_text, 'item') else float(conf_text)
    
    # Setup breakdown buckets
    B = {
        "content_analysis": 0.0,
        "url_analysis": 0.0,
        "domain_analysis": 0.0,
        "heuristics": 0.0,
        "spoofing_penalty": 0.0,
        "total_score": 0.0
    }
    details = []

    # Content Analysis
    if label_text == "1" and conf > 0.85 and not all_urls_trusted:
        c = CONTENT_WEIGHT * conf
        details.append(f"Content Analysis: +{c:.3f}")
    elif label_text == "1" and conf <= 0.85 and not trusted_sender:
        c = 0.02
        details.append(f"Content Analysis (low-conf): +{c:.3f}")
    else:
        c = 0.0
        details.append("Content Analysis: +0.000")
    B["content_analysis"] = c

    # IMPROVED URL Analysis - Handle spoofing scenarios
    all_urls = urls # Use the 'urls' argument directly
    unique_urls = list(set(all_urls))

    processed_domains = set()
    url_confs = []
    url_details = []
    trusted_urls = []

    for u in unique_urls:
    # Clean the URL before processing
        clean_u = u.split('","')[0].split('",')[0].split('"')[0]
        dom = extract_domain(clean_u)

    # Skip if we already processed this domain
        if dom in processed_domains:
                continue
        processed_domains.add(dom)
    
        lab, conf_u = predict_url_score(clean_u)

        if lab == 1:  # Malicious URL detected - PROPERLY INDENTED!
            if conf_u < 0.7:
                url_confs.append(0.8)
                url_details.append(f"{dom}:0.80(boosted)")
            else:
                url_confs.append(conf_u)
                url_details.append(f"{dom}:{conf_u:.2f}")
        elif is_domain_trusted(dom):
            trusted_urls.append(dom)
            url_details.append(f"{dom}:trusted")
        else:
            url_details.append(f"{dom}:safe")

    #unique_url_details = []
    #seen_domains = set()
    
    #for detail in url_details:
        #domain = detail.split(':')[0]
        #if domain not in seen_domains:
            #seen_domains.add(domain)
            #unique_url_details.append(detail)
            
    # URL Analysis scoring logic
    #if have malicious use highest confidence
    if url_confs:
        max_conf = max(url_confs)
        u = URL_WEIGHT * max_conf
        details.append(f"URL Analysis: +{u:.3f} (URLs: {', '.join(url_details)})")
    else:
        u = 0.0
        details.append(f"URL Analysis: +0.000 (URLs: {', '.join(url_details)})")

    B["url_analysis"] = u

    # Domain Analysis (unchanged)
    d = 0.0
    if itype == "email":
        dom = sender.split("@",1)[1].lower()
        if not is_domain_trusted(dom):
            _, conf_d = predict_domain_score(dom)
            conf_d = max(0.0, min(1.0, conf_d))
            d = DOMAIN_WEIGHT * conf_d
            details.append(f"Domain Analysis: +{d:.3f} (sender: {dom})")
        else:
            details.append("Domain Analysis: +0.000 (trusted sender)")
    else:
        details.append("Domain Analysis: +0.000 (not email)")
    B["domain_analysis"] = d

    # Heuristics (updated to use all_urls)
    h_raw = apply_heuristics(input_text, extract_domain(all_urls[0]) if all_urls else "")
    h_normalized = max(0.0, min(1.0, h_raw))
    h = HEURISTIC_WEIGHT * h_normalized
    details.append(f"Heuristics: +{h:.3f}")
    B["heuristics"] = h

    # Spoofing Penalty (unchanged)
    spoofing_normalized = max(0.0, min(1.0, spoofing_score))
    s = SPOOFING_WEIGHT * spoofing_normalized
    B["spoofing_penalty"] = s
    details.append(f"Spoofing Penalty: +{s:.3f}")

    # Calculate final total
    total = (B["content_analysis"] + B["url_analysis"] + B["domain_analysis"] + 
              + B["heuristics"] + B["spoofing_penalty"])
    
    B["total_score"] = max(0.0, min(1.0, total))

    # Print detailed breakdown
    for line in details:
        print("  •", line)
    print(f"→ TOTAL SCORE: {B['total_score']:.3f}")

    # Determine verdict
    fs = B["total_score"]
    if fs >= 0.55:   verdict, icon = "PHISHING", "🚨"
    elif fs >= 0.40: verdict, icon = "SUSPICIOUS", "⚠️"
    else:            verdict, icon = "SAFE", "✅"
    print("🎯 VERDICT:", icon, verdict)

    return fs, B