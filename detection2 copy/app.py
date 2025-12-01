from flask_cors import CORS
from flask import Flask
import os
from dotenv import load_dotenv
load_dotenv()


try:
    from api.routes import api_bp
except ImportError as e:
    raise ImportError(
        "Could not import api_bp Blueprint from api/routes.py. Please ensure api/routes.py exists and is error-free.\n" + str(e))

app = Flask(__name__)

# Read configuration from environment variables
HOST = os.environ.get('FLASK_RUN_HOST', '127.0.0.1')
PORT = int(os.environ.get('FLASK_RUN_PORT', 5050))
DEBUG = os.environ.get('FLASK_DEBUG', 'True').lower() in ('true', '1', 'yes')
ALLOWED_ORIGINS = os.environ.get('FLASK_ALLOWED_ORIGINS', '*')


CORS(app, resources={
    r"/*": {
        "origins": ALLOWED_ORIGINS,  # WARNING: Restrict this in production!
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"]
    }
})

# Register Blueprints
app.register_blueprint(api_bp)

# Admin Routes
# app.add_url_rule("/admin", "admin_dashboard", admin_dashboard, methods=["GET"])

if __name__ == "__main__":
    app.run(host=HOST, debug=DEBUG, port=PORT)
