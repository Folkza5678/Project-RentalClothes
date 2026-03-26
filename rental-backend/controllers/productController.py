import os
import sqlite3
import uuid
from flask import request, jsonify
from config.db import get_connection

# 📂 Path สำหรับ Folder "images" (อยู่ระดับเดียวกับ backend)
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'images')

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ─── 1. ดึงข้อมูลสินค้าทั้งหมด ───
def get_products():
    conn = get_connection()
    conn.row_factory = sqlite3.Row 
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM products WHERE is_deleted = 0 ORDER BY id DESC")
        rows = cursor.fetchall()
        products = [dict(row) for row in rows]
        
        # ดึงสถิติเพื่อนับจำนวนแยกตามสถานะ
        cursor.execute("SELECT status, COUNT(*) as count FROM products WHERE is_deleted=0 GROUP BY status")
        stats_rows = cursor.fetchall()
        stats = { 'available': 0, 'booked': 0, 'washing': 0, 'damaged': 0 }
        for row in stats_rows:
            if row['status'] in stats:
                stats[row['status']] = row['count']
        
        return jsonify({'success': True, 'data': products, 'stats': stats})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        conn.close()

# ─── 2. ดึงข้อมูลสินค้า "รายชิ้น" (สำหรับปุ่มแก้ไข) ───
def get_product_by_id(id):
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM products WHERE id = ? AND is_deleted = 0", (id,))
        row = cursor.fetchone()
        if row:
            return jsonify({'success': True, 'data': dict(row)})
        return jsonify({'success': False, 'message': 'ไม่พบข้อมูลสินค้า'}), 404
    finally:
        conn.close()

# ─── 3. เพิ่มสินค้าใหม่ ───
def add_product():
    conn = get_connection()
    cursor = conn.cursor()
    try:
        data = request.form
        image_file = request.files.get('image')
        image_url = "/images/placeholder.jpg"
        
        if image_file:
            filename = f"{uuid.uuid4()}_{image_file.filename}"
            image_file.save(os.path.join(UPLOAD_FOLDER, filename))
            image_url = f"/images/{filename}"

        cursor.execute("""
            INSERT INTO products (
                name, description, category, occasion, brand, 
                price_per_day, price_3d, price_7d, deposit, 
                stock, sizes, status, image_url
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            data.get('name'), data.get('description'), data.get('category'),
            data.get('occasion'), data.get('brand'), data.get('price_per_day'),
            data.get('price_3d'), data.get('price_7d'), data.get('deposit'),
            data.get('stock'), data.get('sizes'), data.get('status', 'available'), image_url
        ))
        
        product_id = cursor.lastrowid
        if image_url:
            cursor.execute("INSERT INTO product_images (product_id, image_url) VALUES (?, ?)", (product_id, image_url))
        
        conn.commit()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        conn.close()

# ─── 4. แก้ไขข้อมูลสินค้า (Update) ───
def update_product(id):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        data = request.form
        cursor.execute("""
            UPDATE products SET 
                name=?, description=?, category=?, occasion=?, brand=?, 
                price_per_day=?, price_3d=?, price_7d=?, deposit=?, 
                stock=?, sizes=?, status=?
            WHERE id=?
        """, (
            data.get('name'), data.get('description'), data.get('category'),
            data.get('occasion'), data.get('brand'), data.get('price_per_day'),
            data.get('price_3d'), data.get('price_7d'), data.get('deposit'),
            data.get('stock'), data.get('sizes'), data.get('status'), id
        ))

        image_file = request.files.get('image')
        if image_file:
            filename = f"{uuid.uuid4()}_{image_file.filename}"
            image_file.save(os.path.join(UPLOAD_FOLDER, filename))
            new_url = f"/images/{filename}"
            cursor.execute("UPDATE products SET image_url=? WHERE id=?", (new_url, id))
            cursor.execute("INSERT INTO product_images (product_id, image_url) VALUES (?, ?)", (id, new_url))
        
        conn.commit()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        conn.close()

# ✨ 5. อัปเดตสถานะ "ด่วน" (จาก Dropdown ในตาราง)
def update_product_status(id):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        new_status = request.form.get('status')
        if not new_status:
            return jsonify({'success': False, 'message': 'Missing status'}), 400

        cursor.execute("UPDATE products SET status = ? WHERE id = ?", (new_status, id))
        conn.commit()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        conn.close()

# ─── 6. ลบสินค้า (Soft Delete) ───
def delete_product(id):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE products SET is_deleted = 1 WHERE id = ?", (id,))
        conn.commit()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        conn.close()