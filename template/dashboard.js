/**
 * 📊 Admin Dashboard Logic
 */

document.addEventListener('DOMContentLoaded', async function () {
    // 1. ตรวจสอบสิทธิ์เบื้องต้น
    checkAdminAuth();
    
    // 2. แสดงชื่อ Admin ที่ล็อกอินเข้ามาจริง
    displayAdminInfo();

    // 3. โหลดข้อมูลสถิติจาก Database
    await loadDashboard();
});

// 🛡️ ฟังก์ชันตรวจสอบสิทธิ์
function checkAdminAuth() {
    const role = localStorage.getItem('userRole');
    const token = localStorage.getItem('token');
    if (role !== 'admin' || !token) {
        window.location.replace('login.html');
    }
}

// 👤 ฟังก์ชันแสดงข้อมูล Admin
function displayAdminInfo() {
    const adminName = localStorage.getItem('userName') || 'Administrator';
    const adminNameElement = document.getElementById('adminNameDisplay');
    if (adminNameElement) {
        adminNameElement.textContent = adminName.toUpperCase();
    }
}

// 🔄 ฟังก์ชันดึงข้อมูลจาก API มาแสดงผล
async function loadDashboard() {
    try {
        const token = localStorage.getItem('token');
        
        // ยิง API ไปที่ /api/dashboard (ตามที่เราตั้งไว้ใน app.py)
        const response = await fetch('/api/dashboard', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();
        
        if (!result.success) {
            console.error("Dashboard error:", result.message);
            return;
        }

        const d = result.data;

        // ── 1. อัปเดตตัวเลข Stat cards ──
        // อ้างอิง ID ตามที่ใส่ไว้ใน dashboard.html
        if (document.getElementById('statTotalProducts')) 
            document.getElementById('statTotalProducts').textContent = d.total_products.toLocaleString();
            
        if (document.getElementById('statActiveBookings')) 
            document.getElementById('statActiveBookings').textContent = d.monthly_orders.toLocaleString();
            
        if (document.getElementById('statPendingReturns')) 
            document.getElementById('statPendingReturns').textContent = d.pending_orders.toLocaleString();
            
        if (document.getElementById('statTotalCustomers')) 
            document.getElementById('statTotalCustomers').textContent = d.total_customers.toLocaleString();

        // ── 2. แสดงรายการ Recent bookings ──
        const tbody = document.getElementById('recentBookingsTableBody');
        if (tbody && d.recent_bookings?.length) {
            // Map สถานะจาก DB เป็นคำอ่านและสี Badge
            const statusMap = { waiting:'Pending', packing:'Packing', shipped:'Active', received:'Returned', cancelled:'Overdue' };
            const badgeMap  = { waiting:'pending', packing:'pending', shipped:'active', received:'returned', cancelled:'overdue' };
            
            tbody.innerHTML = d.recent_bookings.map(b => `
                <tr>
                    <td>#BK-${String(b.id).padStart(4,'0')}</td>
                    <td>${b.full_name || 'General Customer'}</td>
                    <td>${b.product_name}</td>
                    <td>${formatDate(b.rental_start)}</td>
                    <td>${formatDate(b.rental_end)}</td>
                    <td><span class="Badge Badge--${badgeMap[b.status] || 'pending'}">${statusMap[b.status] || b.status}</span></td>
                </tr>
            `).join('');
        } else if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No recent bookings found.</td></tr>';
        }

    } catch (error) {
        console.error('Fetch Error:', error);
    }
}

// 📅 ฟังก์ชันแปลงวันที่ให้สวยงาม (20 มี.ค. 68)
function formatDate(d) {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('th-TH', { 
        day: 'numeric', 
        month: 'short', 
        year: '2-digit' 
    });
}