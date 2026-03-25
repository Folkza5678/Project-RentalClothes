import bcrypt
import jwt
import os
from datetime import datetime, timedelta
from flask import request, jsonify
from config.db import get_connection

JWT_SECRET = os.getenv('JWT_SECRET', 'your-secret-key')
JWT_EXPIRES_IN = os.getenv('JWT_EXPIRES_IN', '7d')

def generate_token(payload):
    expires = datetime.utcnow() + timedelta(days=7)  # default 7d
    payload['exp'] = expires
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')

def register():
    data = request.get_json(silent=True)
    if not data:
        data = request.form
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    full_name = data.get('full_name')
    phone = data.get('phone')
    address = data.get('address')

    # phone/address optional (frontend may send empty string)
    if not all([username, email, password, full_name]):
        return jsonify({'success': False, 'message': 'กรุณากรอกข้อมูลให้ครบ'}), 400
    phone = phone or None
    address = address or None

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('SELECT id FROM users WHERE username = ? OR email = ?', (username, email))
        existing = cursor.fetchone()
        if existing:
            return jsonify({'success': False, 'message': 'Username หรือ Email นี้ถูกใช้แล้ว'}), 409

        hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt())
        cursor.execute(
            'INSERT INTO users (username, email, password, full_name, phone, address, role) VALUES (?, ?, ?, ?, ?, ?, ?)',
            (username, email, hashed.decode(), full_name, phone, address, 'customer')
        )
        conn.commit()
        user_id = cursor.lastrowid
        token = generate_token({'id': user_id, 'username': username, 'role': 'customer'})
        return jsonify({'success': True, 'message': 'สมัครสมาชิกสำเร็จ', 'token': token}), 201
    except Exception as err:
        print(err)
        return jsonify({'success': False, 'message': 'เกิดข้อผิดพลาดในระบบ'}), 500
    finally:
        cursor.close()
        conn.close()

def login():
    data = request.get_json(silent=True)
    if not data:
        data = request.form
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'success': False, 'message': 'กรุณากรอก Username และ Password'}), 400

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('SELECT * FROM users WHERE username = ? OR email = ?', (username, username))
        user = cursor.fetchone()
        
        if not user:
            return jsonify({'success': False, 'message': 'ไม่พบบัญชีผู้ใช้นี้'}), 401

        # 🔧 จุดที่แก้ไข: แปลงข้อมูลจากฐานข้อมูลให้เป็น Dictionary ก่อน
        user_dict = dict(user)

        # พอเป็น Dictionary แล้ว จะสามารถใช้ .get() และ .items() ได้แบบไม่ติด Error 500 ครับ
        if user_dict.get('is_blacklisted'):
            return jsonify({'success': False, 'message': 'บัญชีนี้ถูกระงับการใช้งาน'}), 403

        if not bcrypt.checkpw(password.encode(), user_dict['password'].encode()):
            return jsonify({'success': False, 'message': 'รหัสผ่านไม่ถูกต้อง'}), 401

        token = generate_token({'id': user_dict['id'], 'username': user_dict['username'], 'role': user_dict['role']})
        safe_user = {k: v for k, v in user_dict.items() if k != 'password'}
        
        return jsonify({'success': True, 'token': token, 'user': safe_user})
        
    except Exception as err:
        print("Login Error:", err) # ให้แสดง Error ใน Terminal จะได้รู้ว่าพังตรงไหน
        return jsonify({'success': False, 'message': 'เกิดข้อผิดพลาดในระบบ'}), 500
    finally:
        cursor.close()
        conn.close()

def get_me():
    user_id = request.user['id']
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('SELECT id, username, email, full_name, phone, address, role, created_at FROM users WHERE id = ?', (user_id,))
        user = cursor.fetchone()
        if not user:
            return jsonify({'success': False, 'message': 'ไม่พบผู้ใช้'}), 404
        # sqlite row factory returns mapping
        return jsonify({'success': True, 'user': dict(user)})
    except Exception as err:
        print(err)
        return jsonify({'success': False, 'message': 'เกิดข้อผิดพลาดในระบบ'}), 500
    finally:
        cursor.close()
        conn.close()

def update_me():
    data = request.get_json()
    email = data.get('email')
    full_name = data.get('full_name')
    phone = data.get('phone')
    address = data.get('address')
    password = data.get('password')

    user_id = request.user['id']
    conn = get_connection()
    cursor = conn.cursor()
    try:
        if password:
            hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt())
            cursor.execute(
                'UPDATE users SET email=?, full_name=?, phone=?, address=?, password=? WHERE id=?',
                (email, full_name, phone, address, hashed.decode(), user_id)
            )
        else:
            cursor.execute(
                'UPDATE users SET email=?, full_name=?, phone=?, address=? WHERE id=?',
                (email, full_name, phone, address, user_id)
            )
        return jsonify({'success': True, 'message': 'อัปเดตข้อมูลสำเร็จ'})
    except Exception as err:
        return jsonify({'success': False, 'message': 'เกิดข้อผิดพลาดในระบบ'}), 500
    finally:
        cursor.close()
        conn.close()