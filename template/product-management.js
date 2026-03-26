/**
 * 👗 Product Management System
 */

let editingId = null;

document.addEventListener('DOMContentLoaded', async function () {
    // 1. โหลดข้อมูลสินค้า
    await loadProducts();
    
    // 2. ตั้งค่าการส่งฟอร์ม
    initFormSubmit();

    // 3. แสดงชื่อ Admin
    const adminName = localStorage.getItem('userName') || 'ADMIN';
    if (document.getElementById('adminNameDisplay')) {
        document.getElementById('adminNameDisplay').textContent = adminName.toUpperCase();
    }
});

// ── 📦 โหลดและแสดงรายการสินค้า ──────────────────────────────
async function loadProducts() {
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch('/api/products', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();

        if (!result.success) return;

        const tbody = document.getElementById('productTableBody');
        if (!tbody) return;

        tbody.innerHTML = result.data.map((p, i) => {
            const img = p.image_url ? p.image_url : '/images/placeholder.jpg';
            
            return `
                <tr>
                    <td>${String(i + 1).padStart(3, '0')}</td>
                    <td>
                        <div class="Prod-cell">
                            <img class="Prod-thumb" src="${img}" onerror="this.src='/images/placeholder.jpg'" />
                            <div>
                                <div class="Prod-name">${p.name}</div>
                                <div class="Prod-brand">${p.brand || '—'}</div>
                            </div>
                        </div>
                    </td>
                    <td>${p.category} / ${p.occasion || '-'}</td>
                    <td>${p.stock || 0}</td>
                    <td>
                        <select class="StatusSelect StatusSelect--${p.status}" 
                                onchange="updateProductStatus(${p.id}, this.value)">
                            <option value="available" ${p.status === 'available' ? 'selected' : ''}>พร้อมเช่า</option>
                            <option value="booked" ${p.status === 'booked' ? 'selected' : ''}>ถูกจอง</option>
                            <option value="washing" ${p.status === 'washing' ? 'selected' : ''}>ส่งซัก</option>
                            <option value="damaged" ${p.status === 'damaged' ? 'selected' : ''}>ชำรุด</option>
                        </select>
                    </td>
                    <td>
                        <div class="PriceGroup">
                            <div class="PriceRow"><span class="PriceTag">วัน</span><span class="PriceVal">${Number(p.price_per_day).toLocaleString()} ฿</span></div>
                            <div class="PriceDeposit">มัดจำ <span>${Number(p.deposit).toLocaleString()} ฿</span></div>
                        </div>
                    </td>
                    <td>
                        <div class="ActionGroup">
                            <button class="BtnAction BtnAction--edit" onclick="openEditProduct(${p.id})">✏️</button>
                            <button class="BtnAction BtnAction--delete" onclick="deleteProduct(${p.id})">🗑️</button>
                        </div>
                    </td>
                </tr>`;
        }).join('');

        // อัปเดตตัวเลขสถิติ
        if (result.stats) {
            document.getElementById('countAvailable').textContent = result.stats.available || 0;
            document.getElementById('countBooked').textContent = result.stats.booked || 0;
            document.getElementById('countWashing').textContent = result.stats.washing || 0;
            document.getElementById('countDamaged').textContent = result.stats.damaged || 0;
        }

    } catch (err) {
        console.error("Load Error:", err);
    }
}

// ✨ ฟังก์ชันอัปเดตสถานะด่วน (เชื่อมกับ API PATCH)
window.updateProductStatus = async function(id, newStatus) {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('status', newStatus);

    try {
        const response = await fetch(`/api/products/${id}/status`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        const result = await response.json();
        if (result.success) {
            // แจ้งเตือนแบบ Toast เล็กๆ
            Swal.fire({
                icon: 'success',
                title: 'อัปเดตสถานะเรียบร้อย',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 1500
            });
            await loadProducts(); // โหลดใหม่เพื่ออัปเดตสีและตัวเลขสถิติ
        } else {
            Swal.fire('ผิดพลาด', result.message, 'error');
        }
    } catch (err) {
        console.error("Update Status Error:", err);
    }
};

// ── 💾 บันทึก / แก้ไขข้อมูลสินค้า ───────────────────────────────
function initFormSubmit() {
    const form = document.getElementById('productForm');
    if (!form) return;

    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        const token = localStorage.getItem('token');
        const formData = new FormData(this); // ใช้ FormData(this) เพื่อความรวดเร็ว

        try {
            Swal.fire({ title: 'กำลังบันทึก...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

            const url = editingId ? `/api/products/${editingId}` : '/api/products';
            const method = editingId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                Swal.fire('สำเร็จ', 'บันทึกข้อมูลเรียบร้อย', 'success');
                if (typeof closeProductModal === 'function') closeProductModal();
                else document.getElementById('productModal').classList.remove('open');
                await loadProducts();
            } else {
                Swal.fire('ผิดพลาด', result.message, 'error');
            }
        } catch (err) {
            Swal.fire('ผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
        }
    });
}

// ── ✏️ ดึงข้อมูลมาแก้ไข ──────────────────────────────────────────
window.openEditProduct = async function(id) {
    editingId = id;
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch(`/api/products/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        
        if (result.success) {
            const p = result.data;
            document.getElementById('inputName').value = p.name;
            document.getElementById('inputDescription').value = p.description || '';
            document.getElementById('inputCategory').value = p.category;
            document.getElementById('inputOccasion').value = p.occasion || 'wedding';
            document.getElementById('inputBrand').value = p.brand || '';
            document.getElementById('inputStock').value = p.stock || 1;
            document.getElementById('inputStatus').value = p.status;
            document.getElementById('priceDay').value = p.price_per_day;
            document.getElementById('price3d').value = p.price_3d;
            document.getElementById('price7d').value = p.price_7d;
            document.getElementById('priceDeposit').value = p.deposit;
            document.getElementById('inputSizes').value = p.sizes || '';

            document.getElementById('modalTitle').textContent = 'แก้ไขสินค้า';
            document.getElementById('productModal').classList.add('open');
        }
    } catch (err) {
        console.error("Edit Error:", err);
    }
};

// ── 🗑️ ลบสินค้า ────────────────────────────────────────
window.deleteProduct = async function(id) {
    const confirm = await Swal.fire({
        title: 'ยืนยันการลบ?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'ลบข้อมูล',
        cancelButtonText: 'ยกเลิก'
    });

    if (confirm.isConfirmed) {
        const token = localStorage.getItem('token');
        try {
            const response = await fetch(`/api/products/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            if (result.success) {
                Swal.fire('ลบแล้ว', '', 'success');
                await loadProducts();
            }
        } catch (err) {
            Swal.fire('ผิดพลาด', 'ลบไม่ได้', 'error');
        }
    }
};