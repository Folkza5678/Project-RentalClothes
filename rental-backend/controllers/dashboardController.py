from config.db import get_connection
from flask import jsonify

def get_stats():
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT COUNT(*) AS total FROM products WHERE is_deleted=0")
        products = cursor.fetchone()['total']

        cursor.execute("SELECT COUNT(*) AS total FROM users WHERE role='customer'")
        customers = cursor.fetchone()['total']

        cursor.execute("SELECT COUNT(*) AS total FROM bookings WHERE strftime('%Y-%m', created_at)=strftime('%Y-%m', 'now')")
        bookings = cursor.fetchone()['total']

        cursor.execute("SELECT COUNT(*) AS total FROM bookings WHERE status IN ('waiting','packing')")
        pending = cursor.fetchone()['total']

        cursor.execute("SELECT COALESCE(SUM(total_price),0) AS total FROM bookings WHERE status='received' AND strftime('%Y-%m', created_at)=strftime('%Y-%m', 'now')")
        revenue = cursor.fetchone()['total']

        cursor.execute("SELECT status, COUNT(*) AS count FROM bookings WHERE strftime('%Y-%m', created_at)=strftime('%Y-%m', 'now') GROUP BY status")
        status_counts = cursor.fetchall()

        cursor.execute("""
            SELECT b.id, b.status, b.rental_start, b.rental_end, b.total_price,
                   u.full_name, p.name AS product_name
            FROM bookings b
            JOIN users u ON b.user_id = u.id
            JOIN products p ON b.product_id = p.id
            ORDER BY b.created_at DESC LIMIT 5
        """)
        recent_bookings = cursor.fetchall()

        cursor.execute("""
            SELECT p.id, p.name, p.price_per_day, COUNT(b.id) AS rental_count
            FROM products p
            LEFT JOIN bookings b ON p.id = b.product_id
            WHERE p.is_deleted = 0
            GROUP BY p.id ORDER BY rental_count DESC LIMIT 5
        """)
        popular_products = cursor.fetchall()

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
        print(err)
        return jsonify({'success': False, 'message': 'เกิดข้อผิดพลาด'}), 500
    finally:
        cursor.close()
        conn.close()