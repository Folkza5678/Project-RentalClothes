// auth.js

function updateAppStatus() {
    const authBtn = document.querySelector('.BtnLogin');
    const authText = document.querySelector('.BtnLogin-text');

    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const userName = localStorage.getItem('userName');
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('role'); // ✨ ดึง role มาเช็ค (เช่น 'admin' หรือ 'user')
    
    // ดึงชื่อไฟล์ปัจจุบันแบบแม่นยำ
    const path = window.location.pathname;
    const currentPage = path.substring(path.lastIndexOf('/') + 1);

    // --- 1. ระบบ Guard (ปรับปรุงใหม่) ---
    if (isLoggedIn && token && token !== "undefined" && token !== "") {
        if (currentPage === 'login.html' || currentPage === 'register.html') {
            window.location.replace('main.html');
            return;
        }
    } else {
        // ถ้าไม่ได้ Login ห้ามเข้าหน้าที่มีข้อมูลส่วนตัว/แอดมิน
        const protectedPages = ['data.html', 'dashboard.html', 'return.html', 'report.html', 'productmanagement.html'];
        if (protectedPages.includes(currentPage)) {
            window.location.replace('login.html');
            return;
        }
    }

    // --- 2. จัดการ UI ปุ่ม (แยกหน้าตาม Role) ---
    if (authBtn && authText) {
        if (isLoggedIn && userName) {
            authText.textContent = userName;

            // 🚩 เช็คเงื่อนไข: ถ้าเป็น admin ให้ไป dashboard ถ้าไม่ใช่ให้ไป data
            if (userRole === 'admin') {
                authBtn.href = "dashboard.html"; 
            } else {
                authBtn.href = "data.html";
            }
            
            // สไตล์ปุ่มเมื่อ Login แล้ว
            authBtn.style.backgroundColor = '#ffffff';
            authBtn.style.color = '#333'; // ปรับสีตัวอักษรให้เห็นชัดบนพื้นขาว
            authBtn.style.display = 'inline-flex';
            authBtn.style.alignItems = 'center';
            authBtn.style.justifyContent = 'center';

            // เพิ่มไอคอนหน้าชื่อ (ถ้ายังไม่มี)
            if (!authBtn.querySelector('.UserIcon')) {
                const img = document.createElement('img');
                img.src = 'images/user.png'; 
                img.className = 'UserIcon';
                img.style.width = '30px';
                img.style.height = '30px';
                img.style.marginRight = '8px'; 
                img.style.flexShrink = '0';
                authBtn.insertBefore(img, authText);
            }
        } else {
            // สถานะ Logout หรือยังไม่ได้ Login
            authText.textContent = "LOGIN";
            authBtn.href = "login.html";
            authBtn.style.backgroundColor = ""; 
            authBtn.style.color = "";
            
            const icon = authBtn.querySelector('.UserIcon');
            if (icon) icon.remove();
        }
    }
}

// ฟังก์ชัน Logout
function handleLogout() {
    if (confirm("คุณต้องการออกจากระบบใช่หรือไม่?")) {
        localStorage.clear();
        window.location.replace('main.html');
    }
}

document.addEventListener("DOMContentLoaded", updateAppStatus);
window.onpageshow = function(event) { updateAppStatus(); };