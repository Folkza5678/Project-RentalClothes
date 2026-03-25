from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
import os
from dotenv import load_dotenv
from routes.auth import auth_bp
from controllers.dashboardController import get_stats
from middleware.auth import admin_only

load_dotenv()

app = Flask(__name__, static_folder='../', static_url_path='')
CORS(app, origins='*', supports_credentials=True)

# Ensure uploads directory exists
upload_dir = os.getenv('UPLOAD_PATH', 'uploads/')
if not os.path.exists(upload_dir):
    os.makedirs(upload_dir, exist_ok=True)

# Register blueprints
app.register_blueprint(auth_bp)

# Serve static files from parent directory (excluding /api paths)
@app.route('/<path:path>', methods=['GET'])
def serve_static(path):
    if path.startswith('api/'):
        return jsonify({'success': False, 'message': 'API route not found'}), 404

    # Backward compatibility for old template path references
    if path.startswith('template/'):
        fallback = path[len('template/'):]
        if os.path.exists(os.path.join('..', fallback)):
            return send_from_directory('../', fallback)

    # Handle known renamed JS path
    if path == 'carousel.js' and os.path.exists(os.path.join('..', 'Carousel.js')):
        return send_from_directory('../', 'Carousel.js')

    if os.path.exists(os.path.join('..', path)):
        return send_from_directory('../', path)

    return jsonify({'success': False, 'message': 'File not found'}), 404

# Serve uploads
@app.route('/uploads/<path:filename>', methods=['GET'])
def serve_upload(filename):
    return send_from_directory(upload_dir, filename)

# Root route serves main.html
@app.route('/')
def index():
    return send_file('../main.html')

# Support legacy direct form submits from static pages (fallback)
@app.route('/register.html', methods=['POST'])
def register_html_post():
    from controllers.authController import register
    return register()

@app.route('/login.html', methods=['POST'])
def login_html_post():
    from controllers.authController import login
    return login()

# Dashboard
@app.route('/api/dashboard', methods=['GET'])
@admin_only
def dashboard():
    return get_stats()

# Health check
@app.route('/api/health')
def health():
    from datetime import datetime
    return jsonify({'success': True, 'message': 'Rental Clothes API is running 🚀', 'time': datetime.now()})

if __name__ == '__main__':
    port = int(os.getenv('PORT', 3001))
    app.run(host='0.0.0.0', port=port, debug=True)