from flask import Blueprint, request, jsonify
from controllers.authController import register, login, get_me, update_me
from middleware.auth import auth_middleware

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/register', methods=['POST'])
def register_route():
    return register()

@auth_bp.route('/login', methods=['POST'])
def login_route():
    return login()

@auth_bp.route('/me', methods=['GET'])
@auth_middleware
def get_me_route():
    return get_me()

@auth_bp.route('/me', methods=['PUT'])
@auth_middleware
def update_me_route():
    return update_me()