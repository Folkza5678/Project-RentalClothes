import sqlite3
from config.db import get_connection
from flask import jsonify

def get_stats():
    conn = get_connection()
    # 💡 สำคัญมาก: ตั้งค่า row_factory เพื่อให้ cursor คืนค่าเป็น Dictionary (dict-like)
    # หากไม่ใส่บรรทัดนี้ cursor.fetchone()['total'] จะ Error ทันที
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    try:
        # 1. นับจำนวนสินค้าทั้งหมด (ที่ยังไม่ถูกลบ)
        cursor.execute("SELECT COUNT(*) AS total FROM products WHERE is_deleted=0")
        products = cursor.fetchone()['total']

        # 2. นับจำนวนลูกค้าทั้งหมด
        cursor.execute("SELECT COUNT(*) AS total FROM users WHERE role='customer'")
        customers = cursor.fetchone()['total']

        # 3. นับจำนวนการจองในเดือนปัจจุบัน (Monthly Orders)
        cursor.execute("SELECT COUNT(*) AS total FROM bookings WHERE strftime('%Y-%m', created_at)=strftime('%Y-%m', 'now')")
        bookings = cursor.fetchone()['total']

        # 4. นับจำนวนงานที่ค้างอยู่ (Pending Orders)
        cursor.execute("SELECT COUNT(*) AS total FROM bookings WHERE status IN ('waiting','packing')")
        pending = cursor.fetchone()['total']

        # 5. คำนวณรายได้ในเดือนปัจจุบัน
        cursor.execute("SELECT COALESCE(SUM(total_price),0) AS total FROM bookings WHERE status='received' AND strftime('%Y-%m', created_at)=strftime('%Y-%m', 'now')")
        revenue = cursor.fetchone()['total']

        # 6. สรุปสถานะการจอง (Status Breakdown)
        cursor.execute("SELECT status, COUNT(*) AS count FROM bookings WHERE strftime('%Y-%m', created_at)=strftime('%Y-%m', 'now') GROUP BY status")
        status_counts = [dict(row) for row in cursor.fetchall()]

        # 7. ดึงรายการจองล่าสุด 5 รายการ (Recent Bookings)
        cursor.execute("""
            SELECT b.id, b.status, b.rental_start, b.rental_end, b.total_price,
                   u.full_name, p.name AS product_name
            FROM bookings b
            JOIN users u ON b.user_id = u.id
            JOIN products p ON b.product_id = p.id
            ORDER BY b.created_at DESC LIMIT 5
        """)
        recent_bookings = [dict(row) for row in cursor.fetchall()]

        # 8. ดึงสินค้าที่เป็นที่นิยม 5 อันดับ (Popular Products)
        cursor.execute("""
            SELECT p.id, p.name, p.price_per_day, COUNT(b.id) AS rental_count
            FROM products p
            LEFT JOIN bookings b ON p.id = b.product_id
            WHERE p.is_deleted = 0
            GROUP BY p.id 
            ORDER BY rental_count DESC LIMIT 5
        """)
        popular_products = [dict(row) for row in cursor.fetchall()]

        # ── ส่งข้อมูลกลับไปที่ Frontend (dashboard.js) ──
        return jsonify({
            'success': True,
            'data': {
                'total_products': products,
                'total_customers': customers,
                'monthly_orders': bookings,
                'pending_orders': pending,
                'monthly_revenue': revenue,
                'status_breakdown': status_counts,
                'recent_bookings': recent_bookings,
                'popular_products': popular_products,
            }
        })

    except Exception as err:
        print("❌ Dashboard Controller Error:", err)
        return jsonify({
            'success': False, 
            'message': f'เกิดข้อผิดพลาดในการดึงข้อมูล: {str(err)}'
        }), 500
    finally:
        cursor.close()
        conn.close()