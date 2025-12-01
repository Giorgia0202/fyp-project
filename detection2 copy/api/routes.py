from flask import Blueprint, request, jsonify, render_template
import traceback
from core.utils import make_json_serializable, classify_input, is_domain_trusted
from core.url_analysis import extract_urls_enhanced, classify_urls_with_existing_logic
from core.content_analysis import predict_content, detect_spoofing
from core.scoring import calculate_detailed_score
from db.database import save_feedback_to_database, get_admin_stats, get_recent_feedback, delete_feedback_record, clear_feedback_section
import json

api_bp = Blueprint('api', __name__)

@api_bp.route('/api/detect', methods=['POST'])
def api_detect():
    try:
        data = request.get_json()

        # Handle both old and new data structures
        if isinstance(data.get("content"), dict):
            content_data = data.get("content", {})
            input_text = content_data.get("content", "").strip()
            sender     = content_data.get("sender", "")
            subject    = content_data.get("subject", "")
            html_body  = content_data.get("html", None)
        else:
            input_text = data.get("content", "").strip()
            sender     = data.get("sender", "")
            subject    = data.get("subject", "")
            html_body  = data.get("html", None)

        
        sender_domain = sender.split("@")[1].lower() if "@" in sender else ""

        if not input_text:
            return jsonify({"error": "No content provided"}), 400

        # Debug logging
        print(f"[DEBUG] Sender: {sender} ({sender_domain})")
        print(f"[ANALYSIS START] Analyzing email: '{subject}' from {sender}")

        # Trust checks
        trusted_sender    = is_domain_trusted(sender_domain)
        major_providers   = ['google.com','gmail.com','microsoft.com','outlook.com','hotmail.com']
        is_major_provider = any(sender_domain == p or sender_domain.endswith(f".{p}") 
                                 for p in major_providers)

        # Core analysis
        print(f"[ANALYSIS] Starting core analysis for email from {sender}")
        itype        = classify_input(input_text)
        print(f"[ANALYSIS] Input type: {itype}")
        label_text, conf_text = predict_content(input_text)
        print(f"[ANALYSIS] Content prediction: {label_text} (confidence: {conf_text:.3f})")
        urls         = extract_urls_enhanced(input_text, html=html_body)
        print(f"[ANALYSIS] Found {len(urls)} URLs in email")
        spoofing_detected, spoofing_score = detect_spoofing(input_text, urls)
        print(f"[ANALYSIS] Spoofing detection: {spoofing_detected} (score: {spoofing_score:.3f})")
        all_urls_trusted, suspicious_urls  = classify_urls_with_existing_logic(urls)
        print(f"[ANALYSIS] URL classification: {len(suspicious_urls)} suspicious URLs found")

        
        # Check if email meets early safe criteria (but still run full analysis)
        early_safe_criteria = (is_major_provider or trusted_sender) and all_urls_trusted and not spoofing_detected and label_text == "0" and conf_text > 0.85

        # MODIFIED: Use the new bounded scoring system
        final_score, breakdown = calculate_detailed_score(
            input_text, sender, urls, itype, label_text, conf_text,
            trusted_sender, spoofing_detected, spoofing_score, suspicious_urls,all_urls_trusted
        )

        # Determine verdict based on new thresholds
        verdict = (
            "phishing"   if final_score >= 0.58 else
            "suspicious" if final_score >= 0.40 else
            "safe"
        )

        # Override verdict and score for early safe criteria
        if early_safe_criteria:
            verdict = "safe"
            final_score = 0.02
            print(f"[EARLY SAFE] Email meets early safe criteria - overriding score to 0.02")

        response = {
            "type":            itype,
            "verdict":         verdict,
            "score":           round(final_score, 2),
            "confidence":      round(float(conf_text), 2),
            "label":           label_text,
            "score_breakdown": make_json_serializable(breakdown)
        }
        if trusted_sender and all_urls_trusted and not spoofing_detected and not suspicious_urls:
            response["trusted_domain_used"] = True
        if spoofing_detected:
            response["spoofing_detected"] = True
        if suspicious_urls:
            response["suspicious_urls_found"] = len(suspicious_urls)

        print(f"[ANALYSIS COMPLETE] Final verdict: {verdict} (score: {round(final_score, 2)})")
        return jsonify(response)

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@api_bp.route('/admin', methods=['GET'])
def admin_dashboard():
    """Render the admin HTML page"""
    return render_template("admin.html")

@api_bp.route('/api/admin/stats', methods=['GET'])
def api_admin_stats():
    """Get statistics for admin dashboard"""
    try:
        stats = get_admin_stats()
        return jsonify(stats)
    except Exception as e:
        print(f"❌ Error in admin stats: {e}")
        return jsonify({"error": str(e)}), 500

@api_bp.route('/api/feedback', methods=['POST', 'OPTIONS'])
def api_feedback():
    """Handle feedback submissions"""
    
    # Handle OPTIONS preflight request
    if request.method == "OPTIONS":
        response = jsonify({'status': 'ok'})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization,Accept,Origin,X-Requested-With")
        response.headers.add("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS")
        return response
    
    try:
        data = request.get_json()
        print("[FEEDBACK] User feedback has been submitted.")
        
        # Validate required fields
        required_fields = ['reportType', 'originalPrediction', 'emailSubject', 'emailSender', 'emailBody']
        missing_fields = [field for field in required_fields if field not in data or not data[field]]
        
        if missing_fields:
            error_msg = f"Missing required fields: {missing_fields}"
            print(f"[FEEDBACK ERROR] {error_msg}")
            return jsonify({"error": error_msg}), 400
        
        # Save to database with privacy filtering
        success = save_feedback_to_database(data)
        
        if success:
            print(f"[FEEDBACK] Successfully saved feedback to database")
            return jsonify({
                "status": "success",
                "message": "Feedback received and saved successfully"
            })
        else:
            print(f"[FEEDBACK] Failed to save feedback to database")
            return jsonify({
                "status": "error", 
                "message": "Failed to save feedback to database"
            }), 500
        
    except Exception as e:
        print(f"❌ Error in api_feedback: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@api_bp.route('/api/admin/recent-feedback', methods=['GET'])
def api_admin_recent_feedback():
    """Get recent feedback submissions with HTML content"""
    try:
        feedback_list = get_recent_feedback()
        return jsonify(feedback_list)
    except Exception as e:
        print(f"❌ Error in recent feedback: {e}")
        return jsonify({"error": str(e)}), 500

@api_bp.route('/api/admin/delete-feedback/<int:feedback_id>', methods=['DELETE'])
def api_delete_feedback(feedback_id):
    """Delete a specific feedback record"""
    try:
        success = delete_feedback_record(feedback_id)
        
        if success:
            return jsonify({"success": True, "message": "Record deleted successfully"})
        else:
            return jsonify({"error": "Record not found"}), 404
            
    except Exception as e:
        print(f"❌ Error in delete feedback: {e}")
        return jsonify({"error": str(e)}), 500

@api_bp.route('/api/admin/clear-section', methods=['POST'])
def api_clear_section():
    """Clear all records from a specific section (correct or incorrect)"""
    try:
        data = request.get_json()
        section_type = data.get('section_type')  # 'correct' or 'incorrect'
        
        if section_type not in ['correct', 'incorrect']:
            return jsonify({"error": "Invalid section type. Must be 'correct' or 'incorrect'"}), 400
        
        deleted_count = clear_feedback_section(section_type)
        
        return jsonify({
            "success": True, 
            "message": f"Successfully cleared {deleted_count} {section_type} records",
            "deleted_count": deleted_count
        })
        
    except Exception as e:
        print(f"❌ Error in clear section: {e}")
        return jsonify({"error": str(e)}), 500
