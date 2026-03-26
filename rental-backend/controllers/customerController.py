import sqlite3
from flask import request, jsonify
from config.db import get_connection

# ─── 1. ดึงรายชื่อลูกค้าทั้งหมด + สถิติ + Role ───
def get_customers():
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    search = request.args.get('search', '')
    
    try:
        # ดึงข้อมูล u.role ออกมาด้วยเพื่อให้หน้าบ้านเปลี่ยน Badge สีได้ถูก
        query = """
            SELECT u.id, u.username, u.phone, u.address, u.role, u.is_blacklisted, u.created_at,
            (SELECT COUNT(*) FROM bookings WHERE user_id = u.id) as total_rentals,
            (SELECT SUM(total_price) FROM bookings WHERE user_id = u.id) as total_spent
            FROM users u
            WHERE u.role != 'admin' AND (u.username LIKE ? OR u.phone LIKE ?)
            ORDER BY total_rentals DESC
        """
        params = [f'%{search}%', f'%{search}%']
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        customers = []
        for row in rows:
            d = dict(row)
            d['total_spent'] = d['total_spent'] or 0
            customers.append(d)
            
        return jsonify({'success': True, 'data': customers})
    except Exception as e:
        print(f"❌ Error get_customers: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        conn.close()

# ─── 2. ดึงรายละเอียดลูกค้ารายบุคคล (รวมประวัติเช่า) ───
def get_customer_by_id(id):
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, username, phone, address, role, is_blacklisted, created_at FROM users WHERE id = ?", (id,))
        row = cursor.fetchone()
        
        if row:
            # ดึงประวัติการเช่าล่าสุด 5 รายการ
            cursor.execute("""
                SELECT b.id, b.rental_start, b.rental_end, b.status, p.name as product_name, p.image_url
                FROM bookings b
                JOIN products p ON b.product_id = p.id
                WHERE b.user_id = ?
                ORDER BY b.rental_start DESC LIMIT 5
            """, (id,))
            history = [dict(r) for r in cursor.fetchall()]
            
            data = dict(row)
            data['history'] = history
            return jsonify({'success': True, 'data': data})
            
        return jsonify({'success': False, 'message': 'ไม่พบข้อมูลลูกค้า'}), 404
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        conn.close()

# ─── 3. อัปเดตสถานะ Blacklist ───
def update_customer_status(id):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        data = request.get_json()
        is_blacklisted = data.get('is_blacklisted', 0)
        
        cursor.execute("""
            UPDATE users 
            SET is_blacklisted = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        """, (is_blacklisted, id))
        
        conn.commit()
        return jsonify({'success': True, 'message': 'อัปเดตสถานะบัญชีเรียบร้อย'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        conn.close()

# ─── 4. อัปเดตระดับลูกค้า (Role: user, Member, VIP) ───
# ✨ ฟังก์ชันใหม่ที่โฟล์คต้องการใช้เปลี่ยนระดับลูกค้าในตาราง
def update_customer_role(id):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        data = request.get_json()
        new_role = data.get('role') # รับค่า Member หรือ VIP
        
        if not new_role:
            return jsonify({'success': False, 'message': 'กรุณาระบุ Role'}), 400

        cursor.execute("""
            UPDATE users 
            SET role = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        """, (new_role, id))
        
        conn.commit()
        return jsonify({'success': True, 'message': f'เปลี่ยนระดับเป็น {new_role} เรียบร้อย'})
    except Exception as e:
        print(f"❌ Error update_role: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        conn.close()