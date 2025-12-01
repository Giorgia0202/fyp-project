import mysql.connector
from mysql.connector import Error
from datetime import datetime
import traceback
from config import DB_CONFIG
from core.utils import clean_email_subject
from core.privacy_filter import PrivacyFilter

# Initialize privacy filter
privacy_filter = PrivacyFilter()

def test_database_connection():
    """Test database connection on startup"""
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        if connection.is_connected():
            cursor = connection.cursor()
            cursor.execute("SELECT 1")
            result = cursor.fetchone()
            print("✅ Database connection successful!")
            cursor.close()
            connection.close()
            return True
    except Error as e:
        print(f"❌ Database connection failed: {e}")
        print("Make sure MySQL is running and credentials are correct")
        return False
    return False

def save_feedback_to_database(feedback_data):
    """Save feedback to database with SERVER-SIDE subject cleaning"""
    connection = None
    cursor = None
    
    try:
        print(f"[DATABASE] Starting save process with SERVER-SIDE subject cleaning...")
        
        # Get original content
        original_email_body = feedback_data.get('emailBody', '')
        original_email_body_html = feedback_data.get('emailBodyHTML', original_email_body)
        original_email_subject = feedback_data.get('emailSubject', '')
        
        # Clean the subject on the SERVER SIDE
        cleaned_subject = clean_email_subject(original_email_subject)
        
        print(f"[DATABASE] Original subject from frontend: '{original_email_subject}'")
        print(f"[DATABASE] SERVER-CLEANED subject: '{cleaned_subject}'")
        print(f"[DATABASE] Original body length: {len(original_email_body)}")
        
        # Apply privacy filter for body content
        try:
            body_result = privacy_filter.sanitize_content(original_email_body, is_subject=False)
            print(f"[PRIVACY] Body sanitization successful")
            print(f"[PRIVACY] Body patterns removed: {body_result['removed_patterns']}")
            
        except Exception as privacy_error:
            print(f"[PRIVACY ERROR] {privacy_error}")
            body_result = {
                'sanitized_content': original_email_body[:1000],
                'content_hash': 'error_hash',
                'removed_patterns': []
            }
        
        # Connect to database
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor()
        print(f"[DATABASE] Connection successful")
        
        # Insert query - use CLEANED subject for ALL subject fields
        insert_query = """
        INSERT INTO feedback (
            report_type, 
            original_prediction, 
            original_score, 
            email_subject_sanitized, 
            sender_domain, 
            content_hash,
            timestamp,
            original_subject,
            original_body,
            original_body_html
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        # Extract domain from sender email
        sender = feedback_data.get('emailSender', '')
        if '@' in sender:
            sender_domain = sender.split('@')[1]
        else:
            sender_domain = 'unknown'
        
        values = (
            feedback_data.get('reportType', 'unknown'),
            feedback_data.get('originalPrediction', 'unknown'),
            float(feedback_data.get('originalScore', 0)),
            cleaned_subject[:500] if cleaned_subject else 'No Subject',  
            sender_domain,
            body_result.get('content_hash', 'no_hash'),
            datetime.now(),
            cleaned_subject,              
            body_result['sanitized_content'],
            original_email_body_html
        )
        
        print(f"[DATABASE] Storing CLEAN subject in both fields: '{cleaned_subject}'")
        print(f"[DATABASE] Storing sanitized body length: {len(body_result['sanitized_content'])}")
        
        # Execute insertion
        cursor.execute(insert_query, values)
        connection.commit()
        
        record_id = cursor.lastrowid
        print(f"✅ Feedback saved with SERVER-SIDE cleaned subject! Record ID: {record_id}")
        print(f"✅ Subject transformation: '{original_email_subject}' → '{cleaned_subject}'")
        return True
        
    except mysql.connector.Error as e:
        print(f"❌ MySQL Database error: {e}")
        if connection:
            connection.rollback()
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        traceback.print_exc()
        return False
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()

def get_admin_stats():
    """Get statistics for admin dashboard"""
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor()
        
        # Total feedback count
        cursor.execute("SELECT COUNT(*) FROM feedback")
        total_feedback = cursor.fetchone()[0]
        
        # Correct predictions (feedback type = 'correct')
        cursor.execute("SELECT COUNT(*) FROM feedback WHERE report_type = 'correct'")
        correct_predictions = cursor.fetchone()[0]
        
        # Incorrect reports (feedback type starts with 'incorrect_')
        cursor.execute("SELECT COUNT(*) FROM feedback WHERE report_type LIKE 'incorrect_%'")
        incorrect_reports = cursor.fetchone()[0]
        
        # Calculate accuracy
        accuracy_rate = (correct_predictions / total_feedback * 100) if total_feedback > 0 else 0
        
        stats = {
            "total_feedback": total_feedback,
            "correct_predictions": correct_predictions,
            "incorrect_reports": incorrect_reports,
            "accuracy_rate": round(accuracy_rate, 1)
        }
        
        cursor.close()
        connection.close()
        
        return stats
        
    except Error as e:
        print(f"❌ Database error in admin stats: {e}")
        return {
            "total_feedback": 0,
            "correct_predictions": 0,
            "incorrect_reports": 0,
            "accuracy_rate": 0
        }

def get_recent_feedback():
    """Get recent feedback submissions with HTML content"""
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor()
        
        # Get ALL feedback including HTML content
        cursor.execute("""
        SELECT id, report_type, original_prediction, original_score, 
               email_subject_sanitized, sender_domain, content_hash, timestamp,
               original_subject, original_body, original_body_html
        FROM feedback 
        ORDER BY id DESC 
        LIMIT 50
        """)
        
        feedback_data = cursor.fetchall()
        
        # Convert to list of dictionaries with HTML content
        feedback_list = []
        for row in feedback_data:
            # Handle timestamp properly
            timestamp_value = row[7] if len(row) > 7 and row[7] else None
            
            if timestamp_value:
                timestamp_str = timestamp_value.isoformat() if hasattr(timestamp_value, 'isoformat') else str(timestamp_value)
            else:
                from datetime import datetime
                timestamp_str = datetime.now().isoformat()
            
            # Get original content (prioritize HTML if available)
            original_subject = row[8] if len(row) > 8 and row[8] else row[4]
            original_body = row[9] if len(row) > 9 and row[9] else "No original content stored"
            original_body_html = row[10] if len(row) > 10 and row[10] else original_body
            
            feedback_list.append({
                "id": row[0],
                "report_type": row[1],
                "original_prediction": row[2],
                "original_score": float(row[3]) if row[3] else 0,
                "email_subject": row[4] if row[4] else "No Subject",
                "email_sender": row[5] if row[5] else "Unknown",
                "timestamp": timestamp_str,
                "original_subject": original_subject,
                "original_body": original_body,
                "original_body_html": original_body_html  # Include HTML version
            })
        
        cursor.close()
        connection.close()
        
        print(f"[ADMIN] Returned {len(feedback_list)} feedback records with HTML content")
        return feedback_list
        
    except Error as e:
        print(f"❌ Database error in recent feedback: {e}")
        return []

def delete_feedback_record(feedback_id):
    """Delete a specific feedback record"""
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor()
        
        # Delete the record
        cursor.execute("DELETE FROM feedback WHERE id = %s", (feedback_id,))
        connection.commit()
        
        success = cursor.rowcount > 0
        cursor.close()
        connection.close()
        
        return success
        
    except Error as e:
        print(f"❌ Database error in delete feedback: {e}")
        return False

def clear_feedback_section(section_type):
    """Clear all records from a specific section (correct or incorrect)"""
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor()
        
        # Delete records based on section type
        if section_type == 'correct':
            cursor.execute("DELETE FROM feedback WHERE report_type = 'correct'")
        else:
            cursor.execute("DELETE FROM feedback WHERE report_type != 'correct'")
        
        deleted_count = cursor.rowcount
        connection.commit()
        
        cursor.close()
        connection.close()
        
        print(f"✅ Cleared {deleted_count} {section_type} records")
        return deleted_count
        
    except Error as e:
        print(f"❌ Database error in clear section: {e}")
        return 0
    